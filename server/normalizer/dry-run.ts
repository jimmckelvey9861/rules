/**
 * Structured Rule Normalization — Dry Run
 *
 * Reads all existing structured rules from LawSources and reviewable Candidates,
 * attempts normalization, and produces a report.
 *
 * Usage:
 *   npm run normalize:rules -- --dry-run
 *
 * Does NOT modify the database.
 */

import { PrismaClient } from "@prisma/client";
import { normalizeRule, type NormalizationResult } from "./normalize.js";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface RuleRecord {
  source: "LawSource" | "Candidate";
  id: string;
  jurisdiction: string;
  category: string;
  raw: Record<string, unknown>;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  if (!isDryRun) {
    console.log("⚠️  This script currently only supports --dry-run mode.");
    console.log("   Run with: npm run normalize:rules -- --dry-run");
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Structured Rule Normalization — DRY RUN");
  console.log("  No database changes will be made.");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ─── Collect all rules ─────────────────────────────────────────────
  const records: RuleRecord[] = [];

  // LawSources
  const lawSources = await prisma.lawSource.findMany({
    include: { jurisdiction: true, lawCategory: true },
  });

  for (const ls of lawSources) {
    if (!ls.structuredText) continue;
    try {
      const parsed = JSON.parse(ls.structuredText);
      if (typeof parsed === "object" && parsed !== null) {
        records.push({
          source: "LawSource",
          id: ls.id,
          jurisdiction: ls.jurisdiction.name,
          category: ls.lawCategory.name,
          raw: parsed,
        });
      }
    } catch {
      // Skip unparseable
    }
  }

  // Reviewable Candidates
  const candidates = await prisma.crawlerCandidate.findMany({
    where: {
      urlHealthStatus: { in: ["ok", "redirected"] },
      contentAssessmentStatus: "actionable",
    },
    include: { guessedJurisdiction: true, guessedLawCategory: true },
  });

  for (const c of candidates) {
    const facts = (c.actionableFacts as Record<string, unknown>) || {};
    const sr = facts.structuredRule;
    if (sr && typeof sr === "object" && Object.keys(sr as object).length > 0) {
      records.push({
        source: "Candidate",
        id: c.id,
        jurisdiction: c.guessedJurisdiction?.name || "unknown",
        category: c.guessedLawCategory?.name || "unknown",
        raw: sr as Record<string, unknown>,
      });
    }
  }

  console.log(`Found ${records.length} rules to normalize.\n`);

  // ─── Normalize each rule ───────────────────────────────────────────
  const results: Array<{ record: RuleRecord; result: NormalizationResult }> = [];

  for (const record of records) {
    const result = normalizeRule(record.raw, record.jurisdiction, record.category);
    results.push({ record, result });
  }

  // ─── Summarize ─────────────────────────────────────────────────────
  const byType: Record<string, { success: number; withWarnings: number; failed: number; skipped: number }> = {};
  const successes: typeof results = [];
  const withWarnings: typeof results = [];
  const failures: typeof results = [];
  const skipped: typeof results = [];

  for (const { record, result } of results) {
    const rt = result.ruleType;
    if (!byType[rt]) byType[rt] = { success: 0, withWarnings: 0, failed: 0, skipped: 0 };

    if (result.success) {
      const hasWarnings = result.warnings.droppedFields.length > 0 ||
        result.warnings.possibleMixedCategoryFields.length > 0 ||
        result.warnings.dataLossWarnings.length > 0;
      if (hasWarnings) {
        byType[rt].withWarnings++;
        withWarnings.push({ record, result });
      } else {
        byType[rt].success++;
      }
      successes.push({ record, result });
    } else if (result.error?.includes("not yet supported")) {
      byType[rt].skipped++;
      skipped.push({ record, result });
    } else {
      byType[rt].failed++;
      failures.push({ record, result });
    }
  }

  // Console output
  console.log("┌─────────────────────────────┬─────────┬──────────┬────────┬─────────┐");
  console.log("│ Rule Type                   │ Success │ Warnings │ Failed │ Skipped │");
  console.log("├─────────────────────────────┼─────────┼──────────┼────────┼─────────┤");
  for (const [rt, counts] of Object.entries(byType).sort((a, b) => (b[1].success + b[1].withWarnings + b[1].failed) - (a[1].success + a[1].withWarnings + a[1].failed))) {
    const name = rt.padEnd(27);
    console.log(`│ ${name} │ ${String(counts.success).padStart(7)} │ ${String(counts.withWarnings).padStart(8)} │ ${String(counts.failed).padStart(6)} │ ${String(counts.skipped).padStart(7)} │`);
  }
  console.log("└─────────────────────────────┴─────────┴──────────┴────────┴─────────┘");
  console.log(`\nTotal: ${successes.length} normalized (${withWarnings.length} with warnings), ${failures.length} failed, ${skipped.length} skipped (unsupported type)\n`);
  if (withWarnings.length > 0) {
    console.log("⚠️  Warnings:");
    for (const { record, result } of withWarnings) {
      const w = result.warnings;
      const parts: string[] = [];
      if (w.possibleMixedCategoryFields.length > 0) parts.push(`mixed-category: ${w.possibleMixedCategoryFields.join(", ")}`);
      if (w.droppedFields.length > 0) parts.push(`dropped: ${w.droppedFields.join(", ")}`);
      if (w.dataLossWarnings.length > 0) parts.push(`data loss: ${w.dataLossWarnings.join(", ")}`);
      console.log(`   ${record.jurisdiction} / ${record.category}: ${parts.join("; ")}`);
    }
    console.log("");
  }

  // ─── Generate report ───────────────────────────────────────────────
  const report: string[] = [];
  report.push("# Structured Rule Normalization Preview\n");
  report.push(`**Generated**: ${new Date().toISOString().slice(0, 10)}`);
  report.push(`**Mode**: Dry run (no database changes)`);
  report.push(`**Total rules processed**: ${records.length}`);
  report.push(`**Successfully normalized**: ${successes.length} (${withWarnings.length} with warnings)`);
  report.push(`**Failed**: ${failures.length}`);
  report.push(`**Skipped (unsupported type)**: ${skipped.length}\n`);

  report.push("## Summary by Rule Type\n");
  report.push("| Rule Type | Success | With Warnings | Failed | Skipped | Total |");
  report.push("|-----------|---------|---------------|--------|---------|-------|");
  for (const [rt, counts] of Object.entries(byType).sort((a, b) => (b[1].success + b[1].withWarnings + b[1].failed) - (a[1].success + a[1].withWarnings + a[1].failed))) {
    const total = counts.success + counts.withWarnings + counts.failed + counts.skipped;
    report.push(`| \`${rt}\` | ${counts.success} | ${counts.withWarnings} | ${counts.failed} | ${counts.skipped} | ${total} |`);
  }
  report.push("");

  // Before/After examples for each supported type
  report.push("---\n");
  report.push("## Before/After Examples\n");

  const supportedTypes = ["minimum_wage", "overtime", "predictive_scheduling"];
  for (const rt of supportedTypes) {
    const typeResults = successes.filter(r => r.result.ruleType === rt);
    if (typeResults.length === 0) continue;

    report.push(`### \`${rt}\` (${typeResults.length} normalized)\n`);

    // Show up to 3 examples, preferring ones with changes
    const withChanges = typeResults.filter(r => r.result.changes.length > 0);
    const examples = withChanges.length > 0 ? withChanges.slice(0, 3) : typeResults.slice(0, 3);

    for (let i = 0; i < examples.length; i++) {
      const { record, result } = examples[i];
      report.push(`#### Example ${i + 1}: ${record.jurisdiction} — ${record.category} (${record.source})\n`);

      if (result.changes.length > 0) {
        report.push("**Changes applied:**\n");
        for (const change of result.changes) {
          report.push(`- ${change}`);
        }
        report.push("");
      } else {
        report.push("**No changes needed** — already in canonical form.\n");
      }

      report.push("**Before:**\n");
      report.push("```json");
      report.push(JSON.stringify(record.raw, null, 2));
      report.push("```\n");

      report.push("**After:**\n");
      report.push("```json");
      report.push(JSON.stringify(result.canonical, null, 2));
      report.push("```\n");
    }

    report.push("---\n");
  }

  // Warnings section
  if (withWarnings.length > 0) {
    report.push("## Normalized with Warnings\n");
    report.push("These rules were normalized successfully but have potential issues:\n");

    for (const { record, result } of withWarnings) {
      const w = result.warnings;
      report.push(`### ${record.jurisdiction} — ${record.category} (${record.source})\n`);

      if (w.possibleMixedCategoryFields.length > 0) {
        report.push("**⚠️ Mixed-category fields detected:**\n");
        report.push("These fields appear to belong to a different rule type and were NOT included in the normalized output:\n");
        for (const f of w.possibleMixedCategoryFields) {
          report.push(`- ${f}`);
        }
        report.push("");
      }

      if (w.droppedFields.length > 0) {
        report.push("**Dropped fields:**\n");
        report.push("These fields were not mapped to the canonical schema:\n");
        for (const f of w.droppedFields) {
          const val = record.raw[f];
          const valStr = typeof val === "object" ? JSON.stringify(val) : String(val);
          report.push(`- \`${f}\`: ${valStr.slice(0, 80)}`);
        }
        report.push("");
      }

      if (w.dataLossWarnings.length > 0) {
        report.push("**⚠️ Possible data loss:**\n");
        for (const d of w.dataLossWarnings) {
          report.push(`- ${d}`);
        }
        report.push("");
      }

      report.push("**Before:**\n");
      report.push("```json");
      report.push(JSON.stringify(record.raw, null, 2));
      report.push("```\n");

      report.push("**After:**\n");
      report.push("```json");
      report.push(JSON.stringify(result.canonical, null, 2));
      report.push("```\n");

      report.push("---\n");
    }
  }

  // Failures section
  if (failures.length > 0) {
    report.push("## Failures\n");
    report.push("These records could not be normalized:\n");
    report.push("| Source | ID | Jurisdiction | Category | Error |");
    report.push("|--------|-----|-------------|----------|-------|");
    for (const { record, result } of failures) {
      report.push(`| ${record.source} | \`${record.id.slice(0, 12)}…\` | ${record.jurisdiction} | ${record.category} | ${result.error} |`);
    }
    report.push("");
  }

  // Skipped section
  if (skipped.length > 0) {
    report.push("## Skipped (Unsupported Types)\n");
    report.push("These rule types are not yet supported for normalization:\n");
    const skippedByType: Record<string, string[]> = {};
    for (const { record, result } of skipped) {
      const rt = result.ruleType;
      if (!skippedByType[rt]) skippedByType[rt] = [];
      skippedByType[rt].push(`${record.jurisdiction} / ${record.category}`);
    }
    for (const [rt, jurisdictions] of Object.entries(skippedByType)) {
      report.push(`- **\`${rt}\`** (${jurisdictions.length} records): ${jurisdictions.slice(0, 5).join(", ")}${jurisdictions.length > 5 ? "…" : ""}`);
    }
    report.push("");
  }

  // Write report
  const reportPath = path.join(process.cwd(), "docs", "structured-rule-normalization-preview.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report.join("\n"));

  console.log(`Report written to: ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
