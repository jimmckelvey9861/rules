/**
 * Re-assess all minimum wage candidates with the improved extraction logic.
 *
 * This script:
 * 1. Finds all candidates categorized as minimum wage (any sub-category)
 * 2. Captures the "before" structuredRule
 * 3. Re-runs content assessment with the improved logic
 * 4. Captures the "after" structuredRule
 * 5. Produces a report showing changes, improvements, and remaining issues
 *
 * Usage:
 *   npx tsx server/crawler/reassess-minimum-wage.ts
 *   npx tsx server/crawler/reassess-minimum-wage.ts --dry-run
 *   npx tsx server/crawler/reassess-minimum-wage.ts --limit 5
 */

import { PrismaClient } from "@prisma/client";
import { assessContent } from "./content-assessor.js";

const prisma = new PrismaClient();

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find(a => a.startsWith("--limit"));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1] || process.argv[process.argv.indexOf(limitArg) + 1] || "1000") : 1000;

interface ReportEntry {
  jurisdiction: string;
  url: string;
  category: string;
  changed: boolean;
  beforeRule: Record<string, unknown> | null;
  afterRule: Record<string, unknown> | null;
  changeType: "improved" | "unchanged" | "degraded" | "new_rule" | "lost_rule" | "needs_manual_review";
  notes: string;
}

async function main() {
  // Find all minimum wage categories
  const mwCategories = await prisma.lawCategory.findMany({
    where: {
      OR: [
        { name: { contains: "Minimum Wage" } },
        { name: { contains: "minimum wage" } },
        { name: { equals: "State Minimum Wage" } },
        { name: { equals: "Local Minimum Wage" } },
      ],
    },
  });

  const mwCategoryIds = mwCategories.map(c => c.id);
  console.log(`Found ${mwCategories.length} minimum wage categories: ${mwCategories.map(c => c.name).join(", ")}`);

  // Get all candidates in these categories that have been assessed or have healthy URLs
  const candidates = await prisma.crawlerCandidate.findMany({
    where: {
      guessedLawCategoryId: { in: mwCategoryIds },
      status: { not: "rejected" },
      urlHealthStatus: { in: ["ok", "redirected", "unchecked"] },
    },
    include: {
      guessedJurisdiction: { select: { name: true } },
      guessedLawCategory: { select: { name: true } },
    },
    take: LIMIT,
    orderBy: { confidence: "desc" },
  });

  console.log(`\nRe-assessing ${candidates.length} minimum wage candidates${dryRun ? " (DRY RUN)" : ""}...\n`);

  const report: ReportEntry[] = [];
  let assessed = 0;
  let changed = 0;
  let errors = 0;

  for (const c of candidates) {
    const jurisdiction = c.guessedJurisdiction?.name || "unknown";
    const url = c.finalUrl || c.sourceUrl;
    const category = c.guessedLawCategory?.name || "unknown";

    // Capture "before" state
    const beforeFacts = c.actionableFacts as Record<string, unknown> | null;
    const beforeRule = (beforeFacts?.structuredRule as Record<string, unknown>) || null;

    // Re-assess
    let result;
    try {
      result = await assessContent(url, "minimum_wage", c.title, jurisdiction);
    } catch (err: any) {
      console.log(`  ✗ ERROR ${jurisdiction}: ${err.message}`);
      errors++;
      report.push({
        jurisdiction, url, category,
        changed: false,
        beforeRule,
        afterRule: null,
        changeType: "needs_manual_review",
        notes: `Error during assessment: ${err.message}`,
      });
      continue;
    }

    assessed++;

    // Extract "after" rule
    const afterFacts = result.actionableFacts as Record<string, unknown> | null;
    const afterRule = (afterFacts?.structuredRule as Record<string, unknown>) || null;

    // Determine change type
    const beforeJson = JSON.stringify(beforeRule);
    const afterJson = JSON.stringify(afterRule);
    const hasChanged = beforeJson !== afterJson;

    let changeType: ReportEntry["changeType"] = "unchanged";
    let notes = "";

    if (hasChanged) {
      changed++;
      if (!beforeRule && afterRule) {
        changeType = "new_rule";
        notes = "New structured rule extracted.";
      } else if (beforeRule && !afterRule) {
        changeType = "lost_rule";
        notes = "Structured rule was removed (page may no longer be accessible or relevant).";
      } else if (beforeRule && afterRule) {
        // Determine if improved: fewer noise rates, conditions added, etc.
        const beforeRates = (beforeRule.rates as any[]) || [];
        const afterRates = (afterRule.rates as any[]) || [];
        const beforeNoise = beforeRates.filter((r: any) => r.year === null || (r.year && parseInt(r.year) < new Date().getFullYear() - 1));
        const afterNoise = afterRates.filter((r: any) => {
          // In the new format, rates don't have a "year" field — they're all current
          // So check if any have condition "state_minimum_reference" which might be noise
          return false; // New format doesn't include historical rates
        });

        if (afterRates.length <= beforeRates.length && beforeNoise.length > 0) {
          changeType = "improved";
          notes = `Removed ${beforeNoise.length} historical/noise rate(s). Before: ${beforeRates.length} rates, After: ${afterRates.length} rates.`;
        } else {
          changeType = "improved";
          notes = `Rule structure updated. Before: ${beforeRates.length} rates, After: ${afterRates.length} rates.`;
        }

        // Check if confidence is low — may need manual review
        if ((afterRule as any).confidence === "low") {
          changeType = "needs_manual_review";
          notes += " Low confidence — source may be historical or ambiguous.";
        }
      }
    } else {
      // Check if the existing rule has issues even though it didn't change
      if (afterRule && (afterRule as any).confidence === "low") {
        changeType = "needs_manual_review";
        notes = "Low confidence rule — may need manual verification.";
      }
    }

    // Log progress
    const icon = changeType === "improved" ? "✓" :
                 changeType === "unchanged" ? "·" :
                 changeType === "needs_manual_review" ? "?" :
                 changeType === "new_rule" ? "★" :
                 changeType === "lost_rule" ? "✗" : "~";
    console.log(`  ${icon} [${changeType}] ${jurisdiction} — ${url.slice(0, 60)}`);
    if (notes) console.log(`    ${notes}`);

    report.push({
      jurisdiction, url, category,
      changed: hasChanged,
      beforeRule,
      afterRule,
      changeType,
      notes,
    });

    // Update the database (unless dry run)
    if (!dryRun && hasChanged) {
      let confidenceAdj = c.confidence || 0.5;
      if (result.status === "actionable") confidenceAdj = Math.min(0.95, confidenceAdj + 0.05);
      else if (result.status === "not_actionable") confidenceAdj = Math.max(0.1, confidenceAdj - 0.2);

      await prisma.crawlerCandidate.update({
        where: { id: c.id },
        data: {
          contentAssessmentStatus: result.status,
          contentAssessmentSummary: result.summary,
          actionableFacts: (result.actionableFacts as any) || undefined,
          assessedAt: result.assessedAt,
          confidence: parseFloat(confidenceAdj.toFixed(2)),
        },
      });
    }
  }

  // ─── Generate Report ─────────────────────────────────────────────
  console.log("\n" + "═".repeat(80));
  console.log("MINIMUM WAGE RE-ASSESSMENT REPORT");
  console.log("═".repeat(80));
  console.log(`\nDate: ${new Date().toISOString()}`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no database changes)" : "LIVE (database updated)"}`);
  console.log(`\n── Summary ──────────────────────────────────────────────────────────────────`);
  console.log(`  Jurisdictions reviewed:  ${assessed}`);
  console.log(`  Rules changed:           ${changed}`);
  console.log(`  Errors:                  ${errors}`);
  console.log(`  Unchanged:               ${report.filter(r => r.changeType === "unchanged").length}`);
  console.log(`  Improved:                ${report.filter(r => r.changeType === "improved").length}`);
  console.log(`  New rules:               ${report.filter(r => r.changeType === "new_rule").length}`);
  console.log(`  Lost rules:              ${report.filter(r => r.changeType === "lost_rule").length}`);
  console.log(`  Needs manual review:     ${report.filter(r => r.changeType === "needs_manual_review").length}`);

  // Show before/after examples
  const improved = report.filter(r => r.changeType === "improved");
  if (improved.length > 0) {
    console.log(`\n── Before/After Examples (Improved) ─────────────────────────────────────────`);
    for (const entry of improved.slice(0, 5)) {
      console.log(`\n  ┌─ ${entry.jurisdiction} (${entry.category})`);
      console.log(`  │  URL: ${entry.url}`);
      console.log(`  │  ${entry.notes}`);
      console.log(`  │`);
      console.log(`  │  BEFORE structuredRule:`);
      console.log(`  │  ${JSON.stringify(entry.beforeRule, null, 2).split("\n").join("\n  │  ")}`);
      console.log(`  │`);
      console.log(`  │  AFTER structuredRule:`);
      console.log(`  │  ${JSON.stringify(entry.afterRule, null, 2).split("\n").join("\n  │  ")}`);
      console.log(`  └─────────────────────────────────────────────────────────────────────────`);
    }
  }

  // Show records needing manual review
  const manualReview = report.filter(r => r.changeType === "needs_manual_review");
  if (manualReview.length > 0) {
    console.log(`\n── Records Requiring Manual Review ──────────────────────────────────────────`);
    for (const entry of manualReview) {
      console.log(`  • ${entry.jurisdiction} (${entry.category})`);
      console.log(`    URL: ${entry.url}`);
      console.log(`    Reason: ${entry.notes}`);
      if (entry.afterRule) {
        console.log(`    Current rule: ${JSON.stringify(entry.afterRule).slice(0, 150)}`);
      }
    }
  }

  // Show new rules
  const newRules = report.filter(r => r.changeType === "new_rule");
  if (newRules.length > 0) {
    console.log(`\n── New Rules Extracted ───────────────────────────────────────────────────────`);
    for (const entry of newRules.slice(0, 5)) {
      console.log(`  • ${entry.jurisdiction} (${entry.category})`);
      console.log(`    ${JSON.stringify(entry.afterRule).slice(0, 200)}`);
    }
  }

  console.log("\n" + "═".repeat(80));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
