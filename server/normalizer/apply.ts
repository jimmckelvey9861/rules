/**
 * Structured Rule Normalization — APPLY
 *
 * Applies normalization to the three mature rule types:
 * - minimum_wage
 * - overtime
 * - predictive_scheduling
 *
 * Usage:
 *   npm run normalize:rules:apply
 *
 * Steps:
 * 1. Creates backup of all affected records
 * 2. Normalizes and updates database records
 * 3. Generates applied report
 * 4. Runs post-apply verification
 */

import { PrismaClient } from "@prisma/client";
import { normalizeRule, type NormalizationResult } from "./normalize.js";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const SUPPORTED_TYPES = new Set(["minimum_wage", "overtime", "predictive_scheduling"]);

interface RuleRecord {
  source: "LawSource" | "Candidate";
  id: string;
  jurisdiction: string;
  category: string;
  raw: Record<string, unknown>;
  fullRecord: Record<string, unknown>; // for backup
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Structured Rule Normalization — APPLY");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ─── Step 1: Collect all records ───────────────────────────────────
  const records: RuleRecord[] = [];

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
          fullRecord: {
            id: ls.id,
            title: ls.title,
            jurisdiction: ls.jurisdiction.name,
            category: ls.lawCategory.name,
            structuredText: ls.structuredText,
            verificationStatus: ls.verificationStatus,
          },
        });
      }
    } catch { /* skip unparseable */ }
  }

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
        fullRecord: {
          id: c.id,
          title: c.title,
          jurisdiction: c.guessedJurisdiction?.name || "unknown",
          category: c.guessedLawCategory?.name || "unknown",
          actionableFacts: c.actionableFacts,
        },
      });
    }
  }

  console.log(`Found ${records.length} total rules.\n`);

  // ─── Step 2: Determine which records will be normalized ────────────
  const toApply: Array<{ record: RuleRecord; result: NormalizationResult }> = [];
  const toSkip: Array<{ record: RuleRecord; reason: string }> = [];

  for (const record of records) {
    const result = normalizeRule(record.raw, record.jurisdiction, record.category);

    if (!result.success) {
      toSkip.push({ record, reason: result.error || "normalization failed" });
      continue;
    }

    if (!SUPPORTED_TYPES.has(result.ruleType)) {
      toSkip.push({ record, reason: `unsupported type: ${result.ruleType}` });
      continue;
    }

    toApply.push({ record, result });
  }

  console.log(`Will normalize: ${toApply.length} records`);
  console.log(`Will skip: ${toSkip.length} records\n`);

  // ─── Step 3: Create backup ─────────────────────────────────────────
  const backupPath = path.join(process.cwd(), "docs", "structured-rule-backup-before-normalization.json");
  const backup = {
    generatedAt: new Date().toISOString(),
    totalRecords: toApply.length,
    records: toApply.map(({ record }) => ({
      source: record.source,
      id: record.id,
      jurisdiction: record.jurisdiction,
      category: record.category,
      originalStructuredRule: record.raw,
      fullRecord: record.fullRecord,
    })),
  };
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`✅ Backup written: ${backupPath} (${toApply.length} records)\n`);

  // ─── Step 4: Apply normalization ───────────────────────────────────
  let updatedLawSources = 0;
  let updatedCandidates = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const { record, result } of toApply) {
    const canonicalJson = JSON.stringify(result.canonical);

    try {
      if (record.source === "LawSource") {
        await prisma.lawSource.update({
          where: { id: record.id },
          data: { structuredText: canonicalJson },
        });
        updatedLawSources++;
      } else {
        // For candidates, update actionableFacts.structuredRule while preserving evidence
        const candidate = await prisma.crawlerCandidate.findUnique({ where: { id: record.id } });
        if (candidate) {
          const facts = (candidate.actionableFacts as Record<string, unknown>) || {};
          facts.structuredRule = result.canonical;
          await prisma.crawlerCandidate.update({
            where: { id: record.id },
            data: { actionableFacts: facts as any },
          });
          updatedCandidates++;
        }
      }
    } catch (e: any) {
      errors.push({ id: record.id, error: e.message });
    }
  }

  console.log(`✅ Applied:`);
  console.log(`   LawSources updated: ${updatedLawSources}`);
  console.log(`   Candidates updated: ${updatedCandidates}`);
  if (errors.length > 0) {
    console.log(`   ❌ Errors: ${errors.length}`);
    for (const e of errors) {
      console.log(`      ${e.id}: ${e.error}`);
    }
  }
  console.log("");

  // ─── Step 5: Post-apply verification ───────────────────────────────
  console.log("─── Post-apply verification ───────────────────────────────\n");

  // Re-read all affected records and verify
  let verifyPass = 0;
  let verifyFail = 0;
  const ruleTypeCounts: Record<string, number> = {};

  for (const { record } of toApply) {
    try {
      let currentJson: string | null = null;

      if (record.source === "LawSource") {
        const ls = await prisma.lawSource.findUnique({ where: { id: record.id } });
        currentJson = ls?.structuredText || null;
      } else {
        const c = await prisma.crawlerCandidate.findUnique({ where: { id: record.id } });
        const facts = (c?.actionableFacts as Record<string, unknown>) || {};
        currentJson = facts.structuredRule ? JSON.stringify(facts.structuredRule) : null;
      }

      if (!currentJson) {
        console.log(`   ❌ FAIL: ${record.id} — structuredRule is empty after update`);
        verifyFail++;
        continue;
      }

      const parsed = JSON.parse(currentJson);
      if (!parsed || typeof parsed !== "object") {
        console.log(`   ❌ FAIL: ${record.id} — does not parse as JSON object`);
        verifyFail++;
        continue;
      }

      const rt = parsed.ruleType || "unknown";
      ruleTypeCounts[rt] = (ruleTypeCounts[rt] || 0) + 1;

      if (!SUPPORTED_TYPES.has(rt)) {
        console.log(`   ❌ FAIL: ${record.id} — unexpected ruleType "${rt}" after normalization`);
        verifyFail++;
        continue;
      }

      verifyPass++;
    } catch (e: any) {
      console.log(`   ❌ FAIL: ${record.id} — ${e.message}`);
      verifyFail++;
    }
  }

  // Verify unsupported types were NOT modified
  let unsupportedModified = 0;
  for (const { record } of toSkip) {
    try {
      if (record.source === "LawSource") {
        const ls = await prisma.lawSource.findUnique({ where: { id: record.id } });
        const current = ls?.structuredText || "";
        const original = JSON.stringify(record.raw);
        // Compare — they should be identical (or at least the same content)
        if (current && current !== original) {
          // Parse both and compare
          const currentParsed = JSON.parse(current);
          const originalParsed = record.raw;
          if (JSON.stringify(currentParsed) !== JSON.stringify(originalParsed)) {
            unsupportedModified++;
          }
        }
      }
    } catch { /* skip */ }
  }

  console.log(`   Verification results:`);
  console.log(`   ✅ Pass: ${verifyPass}`);
  console.log(`   ❌ Fail: ${verifyFail}`);
  console.log(`   Unsupported types modified: ${unsupportedModified}`);
  console.log(`\n   Records by ruleType after normalization:`);
  for (const [rt, count] of Object.entries(ruleTypeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${rt}: ${count}`);
  }
  console.log("");

  // ─── Step 6: Generate applied report ───────────────────────────────
  const report: string[] = [];
  report.push("# Structured Rule Normalization — Applied\n");
  report.push(`**Applied at**: ${new Date().toISOString()}`);
  report.push(`**Backup file**: \`docs/structured-rule-backup-before-normalization.json\``);
  report.push(`**Records updated**: ${updatedLawSources + updatedCandidates}`);
  report.push(`  - LawSources: ${updatedLawSources}`);
  report.push(`  - Candidates: ${updatedCandidates}`);
  report.push(`**Records skipped**: ${toSkip.length}`);
  report.push(`**Errors**: ${errors.length}`);
  report.push(`**Verification**: ${verifyPass} pass, ${verifyFail} fail, ${unsupportedModified} unsupported modified\n`);

  report.push("## Records by Rule Type\n");
  report.push("| Rule Type | Updated | Skipped |");
  report.push("|-----------|---------|---------|");
  const updatesByType: Record<string, number> = {};
  const skipsByType: Record<string, number> = {};
  for (const { result } of toApply) {
    updatesByType[result.ruleType] = (updatesByType[result.ruleType] || 0) + 1;
  }
  for (const { record } of toSkip) {
    const rt = record.raw.ruleType as string || "unknown";
    skipsByType[rt] = (skipsByType[rt] || 0) + 1;
  }
  const allTypes = new Set([...Object.keys(updatesByType), ...Object.keys(skipsByType)]);
  for (const rt of [...allTypes].sort()) {
    report.push(`| \`${rt}\` | ${updatesByType[rt] || 0} | ${skipsByType[rt] || 0} |`);
  }
  report.push("");

  // Warnings
  const withWarnings = toApply.filter(({ result }) =>
    result.warnings.droppedFields.length > 0 ||
    result.warnings.possibleMixedCategoryFields.length > 0 ||
    result.warnings.dataLossWarnings.length > 0
  );

  if (withWarnings.length > 0) {
    report.push("## Warnings\n");
    for (const { record, result } of withWarnings) {
      report.push(`### ${record.jurisdiction} — ${record.category} (${record.source})\n`);
      const w = result.warnings;
      if (w.possibleMixedCategoryFields.length > 0) {
        report.push("**Mixed-category fields (not included in output):**\n");
        for (const f of w.possibleMixedCategoryFields) report.push(`- ${f}`);
        report.push("");
      }
      if (w.droppedFields.length > 0) {
        report.push("**Dropped fields:**\n");
        for (const f of w.droppedFields) {
          const val = record.raw[f];
          report.push(`- \`${f}\`: ${JSON.stringify(val).slice(0, 80)}`);
        }
        report.push("");
      }
      if (w.dataLossWarnings.length > 0) {
        report.push("**Data loss warnings:**\n");
        for (const d of w.dataLossWarnings) report.push(`- ${d}`);
        report.push("");
      }
    }
  }

  // Before/After examples (3 per type)
  report.push("## Before/After Examples\n");
  for (const rt of ["minimum_wage", "overtime", "predictive_scheduling"]) {
    const typeResults = toApply.filter(r => r.result.ruleType === rt);
    if (typeResults.length === 0) continue;

    report.push(`### \`${rt}\` (${typeResults.length} updated)\n`);
    const withChanges = typeResults.filter(r => r.result.changes.length > 0);
    const examples = (withChanges.length > 0 ? withChanges : typeResults).slice(0, 2);

    for (let i = 0; i < examples.length; i++) {
      const { record, result } = examples[i];
      report.push(`#### ${record.jurisdiction} — ${record.category} (${record.source})\n`);
      if (result.changes.length > 0) {
        report.push("Changes:");
        for (const c of result.changes) report.push(`- ${c}`);
        report.push("");
      }
      report.push("**Before:**\n```json");
      report.push(JSON.stringify(record.raw, null, 2));
      report.push("```\n");
      report.push("**After:**\n```json");
      report.push(JSON.stringify(result.canonical, null, 2));
      report.push("```\n---\n");
    }
  }

  // Skipped records summary
  report.push("## Skipped Records\n");
  report.push("| Source | Jurisdiction | Category | Reason |");
  report.push("|--------|-------------|----------|--------|");
  for (const { record, reason } of toSkip) {
    report.push(`| ${record.source} | ${record.jurisdiction} | ${record.category} | ${reason} |`);
  }
  report.push("");

  const reportPath = path.join(process.cwd(), "docs", "structured-rule-normalization-applied.md");
  fs.writeFileSync(reportPath, report.join("\n"));
  console.log(`✅ Report written: ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
