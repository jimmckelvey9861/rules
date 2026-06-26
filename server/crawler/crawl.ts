/**
 * Tiny crawler CLI — discovers candidate URLs for a specific jurisdiction/category.
 *
 * Usage:
 *   npm run crawl -- --state CA --topic minimum_wage
 *   npm run crawl -- --state WA --city Seattle --topic predictive_scheduling
 *   npm run crawl -- --state CO --city Denver --topic minimum_wage
 *
 * Behavior:
 * 1. Looks up known URLs from state_sources.json / city_hitlist.json
 * 2. For each seed URL, attempts shallow same-domain refinement (depth=1)
 * 3. Creates CrawlerCandidate records for both seed and refined URLs
 * 4. Checks URL health
 * 5. Does NOT auto-promote, does NOT create LawSource records
 *
 * Flags:
 *   --no-refine    Skip link refinement (just import seed URLs)
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { checkUrl } from "./url-checker.js";
import { refineLinks } from "./refiner.js";
import { assessContent } from "./content-assessor.js";

const prisma = new PrismaClient();

interface CityEntry {
  state: string;
  spider_root: string;
}

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const noRefine = process.argv.includes("--no-refine");

const TOPIC_TO_CATEGORY: Record<string, string> = {
  minimum_wage: "State Minimum Wage",
  overtime: "Weekly Overtime",
  overtime_pay: "Weekly Overtime",
  meal_break: "Meal Break Eligibility",
  rest_break: "Rest Break Eligibility",
  paid_sick_leave: "Paid Sick Leave",
  predictive_scheduling: "Advance Schedule Notice",
  child_labor: "Maximum Daily Hours",
  wage_hour: "State Minimum Wage",
  family_leave: "FMLA",
};

// Map topic to a more specific local category name for cities
const TOPIC_TO_LOCAL_CATEGORY: Record<string, string> = {
  minimum_wage: "Local Minimum Wage",
};

async function createCandidate(opts: {
  url: string;
  title: string;
  authority: string | null;
  jurId: string | null;
  catId: string | null;
  confidence: number;
  notes: string;
  parentUrl?: string;
  existingUrls: Set<string>;
  topic?: string;
}): Promise<boolean> {
  if (opts.existingUrls.has(opts.url)) {
    console.log(`  · [SKIP] ${opts.url.slice(0, 70)} (duplicate)`);
    return false;
  }
  opts.existingUrls.add(opts.url);

  const record = await prisma.crawlerCandidate.create({
    data: {
      sourceUrl: opts.url,
      title: opts.title,
      sourceAuthority: opts.authority,
      guessedJurisdictionId: opts.jurId,
      guessedLawCategoryId: opts.catId,
      confidence: opts.confidence,
      notes: opts.notes,
      status: "new",
      rawPayload: opts.parentUrl ? { parentUrl: opts.parentUrl } : undefined,
    },
  });

  // Check URL health
  const result = await checkUrl(opts.url);
  const isBroken = result.urlHealthStatus === "broken_url";

  await prisma.crawlerCandidate.update({
    where: { id: record.id },
    data: {
      originalUrl: result.finalUrl ? opts.url : null,
      finalUrl: result.finalUrl,
      httpStatus: result.httpStatus,
      urlHealthStatus: result.urlHealthStatus,
      checkedAt: result.checkedAt,
      lastError: result.lastError,
      failureReason: result.failureReason,
      checkedMethod: result.checkedMethod,
      contentType: result.contentType,
      contentLength: result.contentLength,
      retryCount: 1,
      ...(isBroken ? { status: "rejected", notes: opts.notes + " | Auto-rejected: broken URL." } : {}),
    },
  });

  // Also track finalUrl for dedup
  if (result.finalUrl) opts.existingUrls.add(result.finalUrl);

  // Content assessment for healthy URLs with a topic
  let assessmentIcon = "";
  if (!isBroken && opts.topic && (result.urlHealthStatus === "ok" || result.urlHealthStatus === "redirected")) {
    const assessUrl = result.finalUrl || opts.url;
    const assessment = await assessContent(assessUrl, opts.topic, opts.title);

    // Adjust confidence based on assessment
    let adjConf = opts.confidence;
    if (assessment.status === "actionable") adjConf = Math.min(0.95, adjConf + 0.15);
    else if (assessment.status === "not_actionable") adjConf = Math.max(0.1, adjConf - 0.2);

    await prisma.crawlerCandidate.update({
      where: { id: record.id },
      data: {
        contentAssessmentStatus: assessment.status,
        contentAssessmentSummary: assessment.summary,
        actionableFacts: (assessment.actionableFacts as any) || undefined,
        assessedAt: assessment.assessedAt,
        confidence: parseFloat(adjConf.toFixed(2)),
      },
    });

    assessmentIcon = assessment.status === "actionable" ? " ★" : assessment.status === "not_actionable" ? " ·" : " ?";
  }

  const icon = result.urlHealthStatus === "ok" ? "✓" : result.urlHealthStatus === "redirected" ? "→" : "✗";
  const suffix = isBroken ? " [REJECTED]" : "";
  const confStr = `(conf=${opts.confidence.toFixed(2)})`;
  console.log(`  ${icon} [${result.httpStatus || "ERR"}] ${opts.url.slice(0, 60)} ${confStr}${suffix}${assessmentIcon}`);
  return true;
}

async function main() {
  const state = arg("state");
  const city = arg("city");
  const topic = arg("topic");

  if (!state) {
    console.error("Usage: npm run crawl -- --state CA [--city Seattle] [--topic minimum_wage]");
    process.exit(1);
  }

  console.log(`Crawling: state=${state}, city=${city || "(none)"}, topic=${topic || "(all)"}, refine=${!noRefine}\n`);

  // Load seed data
  const dataDir = join(process.cwd(), "data", "old-crawler-seeds");
  const stateSources = JSON.parse(readFileSync(join(dataDir, "state_sources.json"), "utf-8"));
  const cityHitlist = JSON.parse(readFileSync(join(dataDir, "city_hitlist.json"), "utf-8"));

  // Find jurisdiction
  const jurisdictions = await prisma.jurisdiction.findMany();
  let jurId: string | null = null;

  if (city) {
    const match = jurisdictions.find((j) => j.state === state && j.name.toLowerCase() === city.toLowerCase());
    jurId = match?.id || null;
  } else {
    const match = jurisdictions.find((j) => j.state === state && j.type === "state");
    jurId = match?.id || null;
  }

  // Find category — prefer local category for cities
  const categories = await prisma.lawCategory.findMany();
  const catByName: Record<string, string> = {};
  for (const c of categories) catByName[c.name] = c.id;

  let catId: string | null = null;
  if (topic && city) {
    catId = catByName[TOPIC_TO_LOCAL_CATEGORY[topic] || ""] || catByName[TOPIC_TO_CATEGORY[topic] || ""] || null;
  } else if (topic) {
    catId = catByName[TOPIC_TO_CATEGORY[topic] || ""] || null;
  }

  // Collect seed URLs
  const seedUrls: { url: string; title: string; authority: string | null }[] = [];

  if (city) {
    const entry = Object.entries(cityHitlist).find(
      ([name, v]) => (v as CityEntry).state === state && name.toLowerCase() === city.toLowerCase()
    );
    if (entry) {
      seedUrls.push({ url: (entry[1] as CityEntry).spider_root, title: `${entry[0]} — labor law portal`, authority: null });
    }
  } else {
    const stateEntry = stateSources.jurisdictions.find((s: any) => s.state === state);
    if (stateEntry) {
      if (topic && stateEntry.key_pages[topic]) {
        seedUrls.push({ url: stateEntry.key_pages[topic], title: `${stateEntry.locality} — ${topic.replace(/_/g, " ")}`, authority: stateEntry.agency });
      } else if (!topic) {
        for (const [t, url] of Object.entries(stateEntry.key_pages)) {
          if (url) seedUrls.push({ url: url as string, title: `${stateEntry.locality} — ${t.replace(/_/g, " ")}`, authority: stateEntry.agency });
        }
        if (stateEntry.spider_root) {
          seedUrls.push({ url: stateEntry.spider_root, title: `${stateEntry.locality} — main portal`, authority: stateEntry.agency });
        }
      }
    }
  }

  if (seedUrls.length === 0) {
    console.log("No URLs found in seed data for this query.");
    process.exit(0);
  }

  // Build dedup set from existing candidates
  const existing = await prisma.crawlerCandidate.findMany({ select: { sourceUrl: true, finalUrl: true } });
  const existingUrls = new Set<string>();
  for (const e of existing) {
    existingUrls.add(e.sourceUrl);
    if (e.finalUrl) existingUrls.add(e.finalUrl);
  }

  let totalCreated = 0;

  for (const seed of seedUrls) {
    console.log(`\n── Seed: ${seed.url}`);

    // Create candidate for the seed URL itself (lower confidence if we'll refine)
    const seedConfidence = (!noRefine && topic) ? 0.4 : 0.6;
    const created = await createCandidate({
      url: seed.url,
      title: seed.title,
      authority: seed.authority,
      jurId,
      catId,
      confidence: seedConfidence,
      notes: `Seed URL via CLI: state=${state}${city ? ` city=${city}` : ""}${topic ? ` topic=${topic}` : ""}`,
      existingUrls,
      topic,
    });
    if (created) totalCreated++;

    // Shallow refinement: fetch page, score links, create candidates for top matches
    if (!noRefine && topic) {
      console.log(`   Refining links from seed page...`);
      const refined = await refineLinks(seed.url, topic);

      if (refined.length === 0) {
        console.log(`   No relevant sublinks found.`);
      } else {
        console.log(`   Found ${refined.length} relevant sublinks:`);
        for (const link of refined) {
          // Higher confidence for better-scoring links
          const conf = Math.min(0.9, 0.5 + (link.score / 30));
          const created = await createCandidate({
            url: link.url,
            title: link.text || seed.title,
            authority: seed.authority,
            jurId,
            catId,
            confidence: parseFloat(conf.toFixed(2)),
            notes: `Refined from ${seed.url} | Score: ${link.score} | Matched: ${link.matchedTerms.join(", ")}`,
            parentUrl: seed.url,
            existingUrls,
            topic,
          });
          if (created) totalCreated++;
        }
      }
    }
  }

  console.log(`\nDone. Created ${totalCreated} total candidates.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
