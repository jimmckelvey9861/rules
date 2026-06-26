/**
 * Batch Minimum Wage Crawler
 *
 * Crawls all state and local minimum wage rules for jurisdictions in the ontology.
 * Creates CrawlerCandidate records only — does NOT auto-promote.
 *
 * Usage:
 *   npm run crawl:all-mw
 *   npm run crawl:all-mw -- --limit 10
 *   npm run crawl:all-mw -- --states-only
 *   npm run crawl:all-mw -- --locals-only
 *
 * Behavior:
 * 1. Loads seed URLs from state_sources.json and city_hitlist.json
 * 2. For each jurisdiction with a seed URL, creates a candidate
 * 3. Checks URL health
 * 4. Runs content assessment with topic=minimum_wage
 * 5. Deduplicates against existing candidates
 * 6. Generates report at docs/minimum-wage-crawl-results.md
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { checkUrl } from "./url-checker.js";
import { assessContent } from "./content-assessor.js";

const prisma = new PrismaClient();

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argVal(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

interface CrawlResult {
  jurisdiction: string;
  state: string;
  type: "state" | "municipality";
  url: string | null;
  status: "created" | "skipped_duplicate" | "skipped_no_url" | "error";
  assessmentStatus?: string;
  hasStructuredRule?: boolean;
  error?: string;
}

async function main() {
  const statesOnly = hasFlag("states-only");
  const localsOnly = hasFlag("locals-only");
  const limit = argVal("limit") ? parseInt(argVal("limit")!) : undefined;

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Batch Minimum Wage Crawler");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Load seed data
  const dataDir = join(process.cwd(), "data", "old-crawler-seeds");
  const stateSources = JSON.parse(readFileSync(join(dataDir, "state_sources.json"), "utf-8"));
  const cityHitlist = JSON.parse(readFileSync(join(dataDir, "city_hitlist.json"), "utf-8"));

  // Load jurisdictions and categories from DB
  const jurisdictions = await prisma.jurisdiction.findMany();
  const categories = await prisma.lawCategory.findMany();

  const stateMWCatId = categories.find(c => c.name === "State Minimum Wage")?.id;
  const localMWCatId = categories.find(c => c.name === "Local Minimum Wage")?.id;

  if (!stateMWCatId || !localMWCatId) {
    console.error("Cannot find minimum wage categories in DB");
    process.exit(1);
  }

  // Build dedup set from existing candidates
  const existing = await prisma.crawlerCandidate.findMany({
    select: { sourceUrl: true, finalUrl: true },
  });
  const existingUrls = new Set<string>();
  for (const e of existing) {
    existingUrls.add(e.sourceUrl);
    if (e.finalUrl) existingUrls.add(e.finalUrl);
  }

  console.log(`Existing candidates: ${existing.length} (${existingUrls.size} unique URLs)`);

  // Build state code → jurisdiction mapping
  const stateJurisdictions = new Map<string, { id: string; name: string }>();
  for (const j of jurisdictions) {
    if (j.type === "state" && j.state) {
      stateJurisdictions.set(j.state, { id: j.id, name: j.name });
    }
  }

  // Build city → jurisdiction mapping
  const cityJurisdictions = new Map<string, { id: string; name: string; state: string }>();
  for (const j of jurisdictions) {
    if (j.type === "municipality" && j.state) {
      cityJurisdictions.set(`${j.name.toLowerCase()}|${j.state}`, { id: j.id, name: j.name, state: j.state });
    }
  }

  const results: CrawlResult[] = [];
  let processed = 0;

  // ─── Crawl States ──────────────────────────────────────────────────
  if (!localsOnly) {
    console.log("\n── Crawling State Minimum Wages ────────────────────────\n");

    for (const stateEntry of stateSources.jurisdictions) {
      if (limit && processed >= limit) break;

      const stateCode = stateEntry.state;
      const jur = stateJurisdictions.get(stateCode);
      if (!jur) continue; // Not in ontology

      const mwUrl = stateEntry.key_pages?.minimum_wage;
      if (!mwUrl) {
        results.push({
          jurisdiction: jur.name,
          state: stateCode,
          type: "state",
          url: null,
          status: "skipped_no_url",
        });
        console.log(`  · ${jur.name}: no seed URL`);
        continue;
      }

      // Dedup check
      if (existingUrls.has(mwUrl)) {
        results.push({
          jurisdiction: jur.name,
          state: stateCode,
          type: "state",
          url: mwUrl,
          status: "skipped_duplicate",
        });
        console.log(`  · ${jur.name}: duplicate`);
        processed++;
        continue;
      }

      // Create candidate
      try {
        const created = await createAndAssessCandidate({
          url: mwUrl,
          title: `${jur.name} Minimum Wage`,
          authority: stateEntry.agency || null,
          jurId: jur.id,
          catId: stateMWCatId,
          topic: "minimum_wage",
          jurisdictionName: jur.name,
        });

        existingUrls.add(mwUrl);
        if (created.finalUrl) existingUrls.add(created.finalUrl);

        results.push({
          jurisdiction: jur.name,
          state: stateCode,
          type: "state",
          url: mwUrl,
          status: "created",
          assessmentStatus: created.assessmentStatus,
          hasStructuredRule: created.hasStructuredRule,
        });

        const icon = created.hasStructuredRule ? "★" : created.assessmentStatus === "actionable" ? "✓" : "·";
        console.log(`  ${icon} ${jur.name}: ${created.assessmentStatus}${created.hasStructuredRule ? " [structured]" : ""}`);
      } catch (e: any) {
        results.push({
          jurisdiction: jur.name,
          state: stateCode,
          type: "state",
          url: mwUrl,
          status: "error",
          error: e.message,
        });
        console.log(`  ✗ ${jur.name}: ERROR — ${e.message.slice(0, 60)}`);
      }

      processed++;
    }
  }

  // ─── Crawl Local Jurisdictions ─────────────────────────────────────
  if (!statesOnly) {
    console.log("\n── Crawling Local Minimum Wages ────────────────────────\n");

    for (const [cityName, entry] of Object.entries(cityHitlist) as Array<[string, { state: string; spider_root: string }]>) {
      if (limit && processed >= limit) break;

      const key = `${cityName.toLowerCase()}|${entry.state}`;
      const jur = cityJurisdictions.get(key);
      if (!jur) continue; // Not in ontology

      const url = entry.spider_root;
      if (!url) {
        results.push({
          jurisdiction: jur.name,
          state: entry.state,
          type: "municipality",
          url: null,
          status: "skipped_no_url",
        });
        continue;
      }

      // Dedup check
      if (existingUrls.has(url)) {
        results.push({
          jurisdiction: jur.name,
          state: entry.state,
          type: "municipality",
          url,
          status: "skipped_duplicate",
        });
        console.log(`  · ${jur.name}: duplicate`);
        processed++;
        continue;
      }

      try {
        const created = await createAndAssessCandidate({
          url,
          title: `${jur.name} Minimum Wage`,
          authority: null,
          jurId: jur.id,
          catId: localMWCatId,
          topic: "minimum_wage",
          jurisdictionName: jur.name,
        });

        existingUrls.add(url);
        if (created.finalUrl) existingUrls.add(created.finalUrl);

        results.push({
          jurisdiction: jur.name,
          state: entry.state,
          type: "municipality",
          url,
          status: "created",
          assessmentStatus: created.assessmentStatus,
          hasStructuredRule: created.hasStructuredRule,
        });

        const icon = created.hasStructuredRule ? "★" : created.assessmentStatus === "actionable" ? "✓" : "·";
        console.log(`  ${icon} ${jur.name}: ${created.assessmentStatus}${created.hasStructuredRule ? " [structured]" : ""}`);
      } catch (e: any) {
        results.push({
          jurisdiction: jur.name,
          state: entry.state,
          type: "municipality",
          url,
          status: "error",
          error: e.message,
        });
        console.log(`  ✗ ${jur.name}: ERROR — ${e.message.slice(0, 60)}`);
      }

      processed++;
    }
  }

  // ─── Generate Report ───────────────────────────────────────────────
  console.log("\n── Generating Report ───────────────────────────────────\n");

  const created = results.filter(r => r.status === "created");
  const reviewable = created.filter(r => r.hasStructuredRule);
  const nonReviewable = created.filter(r => !r.hasStructuredRule);
  const duplicates = results.filter(r => r.status === "skipped_duplicate");
  const noUrl = results.filter(r => r.status === "skipped_no_url");
  const errors = results.filter(r => r.status === "error");

  const report: string[] = [];
  report.push("# Minimum Wage Crawl Results\n");
  report.push(`**Date**: ${new Date().toISOString().slice(0, 10)}`);
  report.push(`**Scope**: State and local minimum wage`);
  report.push(`**Jurisdictions attempted**: ${results.length}`);
  report.push(`**Candidates created**: ${created.length}`);
  report.push(`**Reviewable (with structured JSON)**: ${reviewable.length}`);
  report.push(`**Non-reviewable (no structured JSON)**: ${nonReviewable.length}`);
  report.push(`**Skipped (duplicate)**: ${duplicates.length}`);
  report.push(`**Skipped (no seed URL)**: ${noUrl.length}`);
  report.push(`**Errors**: ${errors.length}\n`);

  report.push("## Reviewable Candidates\n");
  report.push("| Jurisdiction | Type | Assessment | URL |");
  report.push("|---|---|---|---|");
  for (const r of reviewable) {
    report.push(`| ${r.jurisdiction} | ${r.type} | ${r.assessmentStatus} | ${r.url?.slice(0, 60)} |`);
  }
  report.push("");

  if (nonReviewable.length > 0) {
    report.push("## Non-Reviewable Candidates\n");
    report.push("| Jurisdiction | Type | Assessment | URL |");
    report.push("|---|---|---|---|");
    for (const r of nonReviewable) {
      report.push(`| ${r.jurisdiction} | ${r.type} | ${r.assessmentStatus || "—"} | ${r.url?.slice(0, 60)} |`);
    }
    report.push("");
  }

  if (noUrl.length > 0) {
    report.push("## No Source URL Found\n");
    report.push("These jurisdictions have no seed URL for minimum wage:\n");
    for (const r of noUrl) {
      report.push(`- ${r.jurisdiction} (${r.state})`);
    }
    report.push("");
  }

  if (errors.length > 0) {
    report.push("## Errors\n");
    report.push("| Jurisdiction | URL | Error |");
    report.push("|---|---|---|");
    for (const r of errors) {
      report.push(`| ${r.jurisdiction} | ${r.url?.slice(0, 50)} | ${r.error?.slice(0, 60)} |`);
    }
    report.push("");
  }

  // Placeholder for normalization and test results (filled in after running those)
  report.push("## Post-Crawl Verification\n");
  report.push("Run these commands after crawling:\n");
  report.push("```bash");
  report.push("npm run normalize:rules -- --dry-run");
  report.push("npm run test:rules");
  report.push("```\n");

  const reportPath = join(process.cwd(), "docs", "minimum-wage-crawl-results.md");
  mkdirSync(join(process.cwd(), "docs"), { recursive: true });
  writeFileSync(reportPath, report.join("\n"));

  console.log(`Report: ${reportPath}`);
  console.log(`\nSummary:`);
  console.log(`  Created: ${created.length} (${reviewable.length} reviewable, ${nonReviewable.length} non-reviewable)`);
  console.log(`  Skipped: ${duplicates.length} duplicates, ${noUrl.length} no URL`);
  console.log(`  Errors: ${errors.length}`);
}

// ─── Helper ──────────────────────────────────────────────────────────

async function createAndAssessCandidate(opts: {
  url: string;
  title: string;
  authority: string | null;
  jurId: string;
  catId: string;
  topic: string;
  jurisdictionName: string;
}): Promise<{ finalUrl: string | null; assessmentStatus: string; hasStructuredRule: boolean }> {
  // Create record
  const record = await prisma.crawlerCandidate.create({
    data: {
      sourceUrl: opts.url,
      title: opts.title,
      sourceAuthority: opts.authority,
      guessedJurisdictionId: opts.jurId,
      guessedLawCategoryId: opts.catId,
      confidence: 0.5,
      notes: `Batch crawl: minimum_wage`,
      status: "new",
    },
  });

  // Check URL health
  const urlResult = await checkUrl(opts.url);
  const isBroken = urlResult.urlHealthStatus === "broken_url";

  await prisma.crawlerCandidate.update({
    where: { id: record.id },
    data: {
      originalUrl: urlResult.finalUrl ? opts.url : null,
      finalUrl: urlResult.finalUrl,
      httpStatus: urlResult.httpStatus,
      urlHealthStatus: urlResult.urlHealthStatus,
      checkedAt: urlResult.checkedAt,
      lastError: urlResult.lastError,
      failureReason: urlResult.failureReason,
      checkedMethod: urlResult.checkedMethod,
      contentType: urlResult.contentType,
      contentLength: urlResult.contentLength,
      retryCount: 1,
      ...(isBroken ? { status: "rejected", notes: "Auto-rejected: broken URL." } : {}),
    },
  });

  // Content assessment for healthy URLs
  let assessmentStatus = "unchecked";
  let hasStructuredRule = false;

  if (!isBroken && (urlResult.urlHealthStatus === "ok" || urlResult.urlHealthStatus === "redirected")) {
    const assessUrl = urlResult.finalUrl || opts.url;
    const assessment = await assessContent(assessUrl, opts.topic, opts.title, opts.jurisdictionName);

    // Adjust confidence
    let adjConf = 0.5;
    if (assessment.status === "actionable") adjConf = 0.7;
    else if (assessment.status === "not_actionable") adjConf = 0.2;

    const facts = assessment.actionableFacts as Record<string, unknown> | undefined;
    hasStructuredRule = !!(facts?.structuredRule && typeof facts.structuredRule === "object" &&
      Object.keys(facts.structuredRule as object).length > 0);

    await prisma.crawlerCandidate.update({
      where: { id: record.id },
      data: {
        contentAssessmentStatus: assessment.status,
        contentAssessmentSummary: assessment.summary,
        actionableFacts: (facts as any) || undefined,
        assessedAt: assessment.assessedAt,
        confidence: adjConf,
      },
    });

    assessmentStatus = assessment.status;
  } else {
    assessmentStatus = isBroken ? "broken" : "unchecked";
  }

  return { finalUrl: urlResult.finalUrl, assessmentStatus, hasStructuredRule };
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
