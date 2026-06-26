/**
 * Import old crawler seed data into CrawlerCandidate records.
 *
 * Reads:
 *   data/old-crawler-seeds/state_sources.json
 *   data/old-crawler-seeds/city_hitlist.json
 *
 * Creates CrawlerCandidate records with:
 *   - sourceUrl from key_pages or spider_root
 *   - guessedJurisdictionId mapped from state code
 *   - guessedLawCategoryId mapped from topic name where possible
 *   - confidence based on source type
 *   - status = new
 *
 * Safety: max 25 candidates by default (--limit N to override)
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { checkUrl } from "./url-checker.js";

const prisma = new PrismaClient();

// Parse --limit argument
const limitArg = process.argv.find((a) => a.startsWith("--limit"));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1] || process.argv[process.argv.indexOf(limitArg) + 1] || "25") : 25;
const skipCheck = process.argv.includes("--skip-check");

// Topic name → LawCategory name mapping (best-effort)
const TOPIC_TO_CATEGORY: Record<string, string> = {
  minimum_wage: "State Minimum Wage",
  overtime: "Weekly Overtime",
  overtime_pay: "Weekly Overtime",
  meal_break: "Meal Break Eligibility",
  meal_and_rest_breaks: "Meal Break Eligibility",
  rest_break: "Rest Break Eligibility",
  paid_sick_leave: "Paid Sick Leave",
  predictive_scheduling: "Advance Schedule Notice",
  child_labor: "Maximum Daily Hours",
  workers_compensation: "WARN Act",
  wage_hour: "State Minimum Wage",
  family_leave: "FMLA",
};

interface StateSource {
  locality: string;
  state: string;
  known_for: string[];
  spider_root: string;
  agency: string;
  employer_portal?: string;
  key_pages: Record<string, string>;
  scraping_strategy: string;
  notes: string;
}

interface CityEntry {
  state: string;
  spider_root: string;
}

async function main() {
  console.log(`Importing old crawler seeds (limit: ${LIMIT})...`);

  // Load jurisdiction lookup
  const jurisdictions = await prisma.jurisdiction.findMany();
  const jurByState: Record<string, string> = {};
  const jurByNameState: Record<string, string> = {};
  for (const j of jurisdictions) {
    if (j.type === "state" && j.state) jurByState[j.state] = j.id;
    if (j.state && j.name) jurByNameState[`${j.state}:${j.name}`] = j.id;
  }

  // Load category lookup
  const categories = await prisma.lawCategory.findMany();
  const catByName: Record<string, string> = {};
  for (const c of categories) catByName[c.name] = c.id;

  // Load seed files
  const dataDir = join(process.cwd(), "data", "old-crawler-seeds");
  const stateSources: { jurisdictions: StateSource[] } = JSON.parse(readFileSync(join(dataDir, "state_sources.json"), "utf-8"));
  const cityHitlist: Record<string, CityEntry> = JSON.parse(readFileSync(join(dataDir, "city_hitlist.json"), "utf-8"));

  // Build candidate list
  const candidates: {
    sourceUrl: string;
    title: string;
    sourceAuthority: string | null;
    guessedJurisdictionId: string | null;
    guessedLawCategoryId: string | null;
    confidence: number;
    notes: string;
  }[] = [];

  // From state_sources: extract key_pages URLs
  for (const st of stateSources.jurisdictions) {
    const jurId = jurByState[st.state] || null;

    for (const [topic, url] of Object.entries(st.key_pages)) {
      if (!url) continue;
      const catName = TOPIC_TO_CATEGORY[topic];
      const catId = catName ? catByName[catName] || null : null;

      candidates.push({
        sourceUrl: url,
        title: `${st.locality} — ${topic.replace(/_/g, " ")}`,
        sourceAuthority: st.agency,
        guessedJurisdictionId: jurId,
        guessedLawCategoryId: catId,
        confidence: 0.7,
        notes: `Imported from state_sources.json. Topic: ${topic}. Strategy: ${st.scraping_strategy}.${catId ? "" : " Category could not be mapped."}`,
      });
    }
  }

  // From city_hitlist: spider_root URLs
  for (const [cityName, entry] of Object.entries(cityHitlist)) {
    const jurId = jurByNameState[`${entry.state}:${cityName}`] || null;

    candidates.push({
      sourceUrl: entry.spider_root,
      title: `${cityName} — labor law portal`,
      sourceAuthority: null,
      guessedJurisdictionId: jurId,
      guessedLawCategoryId: null,
      confidence: 0.5,
      notes: `Imported from city_hitlist.json.${jurId ? "" : ` Jurisdiction '${cityName}' (${entry.state}) not found in database.`}`,
    });
  }

  // Deduplicate by sourceUrl and finalUrl
  const seen = new Set<string>();
  const existing = await prisma.crawlerCandidate.findMany({ select: { sourceUrl: true, finalUrl: true } });
  for (const e of existing) {
    seen.add(e.sourceUrl);
    if (e.finalUrl) seen.add(e.finalUrl);
  }

  const fresh = candidates.filter((c) => {
    if (seen.has(c.sourceUrl)) return false;
    seen.add(c.sourceUrl);
    return true;
  });

  const batch = fresh.slice(0, LIMIT);
  console.log(`  Found ${candidates.length} total URLs, ${fresh.length} new, importing ${batch.length}`);

  let created = 0;
  for (const c of batch) {
    const record = await prisma.crawlerCandidate.create({
      data: {
        sourceUrl: c.sourceUrl,
        title: c.title,
        sourceAuthority: c.sourceAuthority,
        guessedJurisdictionId: c.guessedJurisdictionId,
        guessedLawCategoryId: c.guessedLawCategoryId,
        confidence: c.confidence,
        notes: c.notes,
        status: "new",
      },
    });

    // URL health check
    if (!skipCheck) {
      const result = await checkUrl(c.sourceUrl);

      // If 404/410, mark as rejected immediately
      const isBroken = result.urlHealthStatus === "broken_url";
      await prisma.crawlerCandidate.update({
        where: { id: record.id },
        data: {
          originalUrl: result.finalUrl ? c.sourceUrl : null,
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
          ...(isBroken ? { status: "rejected", notes: (c.notes || "") + " | Auto-rejected: broken URL on import." } : {}),
        },
      });
      const icon = result.urlHealthStatus === "ok" ? "✓" : result.urlHealthStatus === "redirected" ? "→" : "✗";
      const suffix = isBroken ? " [REJECTED]" : "";
      console.log(`  ${icon} [${result.httpStatus || "ERR"}] ${c.sourceUrl.slice(0, 65)}${suffix}`);
    } else {
      console.log(`  + ${c.sourceUrl.slice(0, 70)}`);
    }

    created++;
  }

  console.log(`Done. Created ${created} candidates.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
