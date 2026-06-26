/**
 * Structured Rule Test Harness
 *
 * Verifies:
 * 1. All normalized rules conform to canonical TypeScript shape
 * 2. Minimum wage evaluator works for simple and conditional rates
 * 3. Overtime evaluator works for basic scenarios
 *
 * Usage: npm run test:rules
 *
 * Does NOT modify the database.
 */

import { PrismaClient } from "@prisma/client";
import type {
  MinimumWageRule,
  OvertimeRule,
  PredictiveSchedulingRule,
} from "../normalizer/canonical-schemas.js";
import { evaluateMinimumWage } from "./minimum-wage.js";
import { evaluateOvertime } from "./overtime.js";

const prisma = new PrismaClient();

// ─── Test infrastructure ─────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.log(`  ❌ ${message}`);
  }
}

function assertEq(actual: unknown, expected: unknown, message: string) {
  const match = actual === expected;
  if (match) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    failures.push(`${message} (got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)})`);
    console.log(`  ❌ ${message} (got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)})`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  const match = Math.abs(actual - expected) <= tolerance;
  if (match) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    failures.push(`${message} (got: ${actual}, expected: ${expected})`);
    console.log(`  ❌ ${message} (got: ${actual}, expected: ${expected})`);
  }
}

// ─── Schema conformance tests ────────────────────────────────────────

function validateMinimumWageShape(rule: Record<string, unknown>, label: string): boolean {
  const required = ["ruleType", "jurisdiction", "effectiveYear", "rates", "defaultRate", "multiRate", "confidence"];
  for (const field of required) {
    if (!(field in rule)) {
      assert(false, `${label}: missing required field "${field}"`);
      return false;
    }
  }
  assert(rule.ruleType === "minimum_wage", `${label}: ruleType is "minimum_wage"`);
  assert(typeof rule.jurisdiction === "string", `${label}: jurisdiction is string`);
  assert(typeof rule.effectiveYear === "string", `${label}: effectiveYear is string`);
  assert(Array.isArray(rule.rates), `${label}: rates is array`);
  assert(typeof rule.defaultRate === "string", `${label}: defaultRate is string`);
  assert(typeof rule.multiRate === "boolean", `${label}: multiRate is boolean`);
  assert(["high", "medium", "low"].includes(rule.confidence as string), `${label}: confidence is valid`);

  // Validate each rate
  const rates = rule.rates as Array<Record<string, unknown>>;
  for (let i = 0; i < rates.length; i++) {
    const r = rates[i];
    assert(typeof r.amount === "string", `${label}: rates[${i}].amount is string`);
    assert(r.condition === null || typeof r.condition === "string", `${label}: rates[${i}].condition is string|null`);
  }
  return true;
}

function validateOvertimeShape(rule: Record<string, unknown>, label: string): boolean {
  const required = ["ruleType", "jurisdiction", "basis", "threshold", "premiumRate", "appliesTo", "calculation"];
  for (const field of required) {
    if (!(field in rule)) {
      assert(false, `${label}: missing required field "${field}"`);
      return false;
    }
  }
  assert(rule.ruleType === "overtime", `${label}: ruleType is "overtime"`);
  assert(typeof rule.jurisdiction === "string", `${label}: jurisdiction is string`);
  assert(["weekly_hours", "daily_hours", "both"].includes(rule.basis as string), `${label}: basis is valid`);
  assert(typeof rule.premiumRate === "number", `${label}: premiumRate is number`);

  const threshold = rule.threshold as Record<string, unknown>;
  assert(typeof threshold.hours === "number", `${label}: threshold.hours is number`);
  assert(["workweek", "workday"].includes(threshold.period as string), `${label}: threshold.period is valid`);

  const calc = rule.calculation as Record<string, unknown>;
  assert(typeof calc.overtimeHours === "string", `${label}: calculation.overtimeHours is string`);
  assert(typeof calc.overtimePay === "string", `${label}: calculation.overtimePay is string`);
  return true;
}

function validatePredictiveSchedulingShape(rule: Record<string, unknown>, label: string): boolean {
  const required = ["ruleType", "jurisdiction", "coveredIndustries", "restrictions", "appliesTo"];
  for (const field of required) {
    if (!(field in rule)) {
      assert(false, `${label}: missing required field "${field}"`);
      return false;
    }
  }
  assert(rule.ruleType === "predictive_scheduling", `${label}: ruleType is "predictive_scheduling"`);
  assert(typeof rule.jurisdiction === "string", `${label}: jurisdiction is string`);
  assert(Array.isArray(rule.coveredIndustries), `${label}: coveredIndustries is array`);
  assert(typeof rule.restrictions === "object" && rule.restrictions !== null, `${label}: restrictions is object`);
  assert(typeof rule.appliesTo === "object" && rule.appliesTo !== null, `${label}: appliesTo is object`);
  return true;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Structured Rule Test Harness");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ─── Part 1: Schema conformance ─────────────────────────────────
  console.log("── Part 1: Schema Conformance ──────────────────────────\n");

  const lawSources = await prisma.lawSource.findMany({
    include: { jurisdiction: true, lawCategory: true },
  });

  const candidates = await prisma.crawlerCandidate.findMany({
    where: {
      urlHealthStatus: { in: ["ok", "redirected"] },
      contentAssessmentStatus: "actionable",
    },
    include: { guessedJurisdiction: true, guessedLawCategory: true },
  });

  // Collect all rules
  const allRules: Array<{ rule: Record<string, unknown>; label: string }> = [];

  for (const ls of lawSources) {
    if (!ls.structuredText) continue;
    try {
      const parsed = JSON.parse(ls.structuredText);
      if (parsed && typeof parsed === "object") {
        allRules.push({
          rule: parsed,
          label: `LawSource: ${ls.jurisdiction.name} / ${ls.lawCategory.name}`,
        });
      }
    } catch { /* skip */ }
  }

  for (const c of candidates) {
    const facts = (c.actionableFacts as Record<string, unknown>) || {};
    const sr = facts.structuredRule;
    if (sr && typeof sr === "object") {
      allRules.push({
        rule: sr as Record<string, unknown>,
        label: `Candidate: ${c.guessedJurisdiction?.name || "?"} / ${c.guessedLawCategory?.name || "?"}`,
      });
    }
  }

  let mwCount = 0, otCount = 0, psCount = 0;

  for (const { rule, label } of allRules) {
    switch (rule.ruleType) {
      case "minimum_wage":
        validateMinimumWageShape(rule, label);
        mwCount++;
        break;
      case "overtime":
        validateOvertimeShape(rule, label);
        otCount++;
        break;
      case "predictive_scheduling":
        validatePredictiveSchedulingShape(rule, label);
        psCount++;
        break;
      // Skip unsupported types — they weren't normalized
    }
  }

  console.log(`\n  Validated: ${mwCount} minimum_wage, ${otCount} overtime, ${psCount} predictive_scheduling\n`);

  // ─── Part 2: Minimum Wage Evaluator ─────────────────────────────
  console.log("── Part 2: Minimum Wage Evaluator ─────────────────────\n");

  // Find Federal minimum wage
  const federalMW = findRule(allRules, "minimum_wage", "Federal") as MinimumWageRule | null;
  if (federalMW) {
    console.log("  Federal Minimum Wage:");
    const result = evaluateMinimumWage(federalMW, {});
    assertEq(result.applicableRate, "$7.25", "Federal minimum wage returns $7.25");
    assertEq(result.matchedCondition, null, "Federal minimum wage has no condition");
  } else {
    assert(false, "Federal minimum wage rule not found");
  }

  // Find California minimum wage
  const californiaMW = findRule(allRules, "minimum_wage", "California") as MinimumWageRule | null;
  if (californiaMW) {
    console.log("\n  California Minimum Wage:");

    // Default rate (no conditions)
    const defaultResult = evaluateMinimumWage(californiaMW, {});
    assert(defaultResult.applicableRate !== null, `California default rate: ${defaultResult.applicableRate}`);
    assertEq(defaultResult.matchedCondition, null, "California default has no condition");

    // Fast food worker
    if (californiaMW.multiRate) {
      const ffResult = evaluateMinimumWage(californiaMW, {
        employee: { category: "fast_food_worker" },
      });
      if (ffResult.matchedCondition === "fast_food_worker") {
        assert(true, `California fast food rate: ${ffResult.applicableRate} (condition: ${ffResult.matchedCondition})`);
      } else {
        // Try with industry tag
        const ffResult2 = evaluateMinimumWage(californiaMW, {
          business: { industry_tags: ["fast_food"] },
        });
        assert(
          ffResult2.matchedCondition === "fast_food_worker" || ffResult2.applicableRate !== defaultResult.applicableRate,
          `California fast food rate matched via industry tag: ${ffResult2.applicableRate}`,
        );
      }
    } else {
      console.log("  ℹ️  California rule is single-rate (no fast food condition in this record)");
    }
  } else {
    assert(false, "California minimum wage rule not found");
  }

  // ─── Part 3: Overtime Evaluator ─────────────────────────────────
  console.log("\n── Part 3: Overtime Evaluator ──────────────────────────\n");

  // Find Federal overtime
  const federalOT = findRule(allRules, "overtime", "Federal") as OvertimeRule | null;
  if (federalOT) {
    console.log("  Federal Overtime:");

    // 45 hours, $20/hr, non-exempt
    const result1 = evaluateOvertime(federalOT, {
      hours_worked_in_workweek: 45,
      regular_rate: 20,
      employee: { exemption_status: "non_exempt" },
    });
    assert(result1.applies === true, "45 hours non-exempt: overtime applies");
    assertEq(result1.overtimeHours, 5, "45 hours non-exempt: 5 overtime hours");
    assertClose(result1.overtimePay, 150, 0.01, "45 hours non-exempt: $150 overtime pay");
    assertClose(result1.regularPay, 800, 0.01, "45 hours non-exempt: $800 regular pay");
    assertClose(result1.totalPay, 950, 0.01, "45 hours non-exempt: $950 total pay");

    // Exempt employee — should not apply
    console.log("\n  Federal Overtime (exempt):");
    const result2 = evaluateOvertime(federalOT, {
      hours_worked_in_workweek: 50,
      regular_rate: 30,
      employee: { exemption_status: "exempt" },
    });
    assertEq(result2.applies, false, "50 hours exempt: overtime does not apply");
    assertEq(result2.overtimeHours, 0, "50 hours exempt: 0 overtime hours");
    assertEq(result2.overtimePay, 0, "50 hours exempt: $0 overtime pay");

    // 40 hours exactly — no overtime
    console.log("\n  Federal Overtime (exactly 40 hours):");
    const result3 = evaluateOvertime(federalOT, {
      hours_worked_in_workweek: 40,
      regular_rate: 25,
      employee: { exemption_status: "non_exempt" },
    });
    assertEq(result3.applies, false, "40 hours non-exempt: no overtime");
    assertEq(result3.overtimeHours, 0, "40 hours non-exempt: 0 overtime hours");
    assertClose(result3.totalPay, 1000, 0.01, "40 hours non-exempt: $1000 total");
  } else {
    assert(false, "Federal overtime rule not found");
  }

  // California daily overtime (if available)
  const califOT = findRule(allRules, "overtime", "California") as OvertimeRule | null;
  if (califOT && califOT.basis === "daily_hours") {
    console.log("\n  California Daily Overtime:");
    const result = evaluateOvertime(califOT, {
      hours_worked_in_workday: 10,
      regular_rate: 20,
      employee: { exemption_status: "non_exempt" },
    });
    assert(result.applies === true, "10 hours/day non-exempt: overtime applies");
    assert(result.overtimeHours > 0, `10 hours/day: ${result.overtimeHours} overtime hours`);
  }

  // ─── Summary ───────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════════\n");

  if (failures.length > 0) {
    console.log("  Failures:");
    for (const f of failures) {
      console.log(`    ❌ ${f}`);
    }
    console.log("");
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function findRule(
  allRules: Array<{ rule: Record<string, unknown>; label: string }>,
  ruleType: string,
  jurisdiction: string,
): Record<string, unknown> | null {
  // Prefer LawSource over Candidate
  const match = allRules.find(r =>
    r.rule.ruleType === ruleType &&
    (r.rule.jurisdiction as string || "").toLowerCase().includes(jurisdiction.toLowerCase()) &&
    r.label.startsWith("LawSource")
  ) || allRules.find(r =>
    r.rule.ruleType === ruleType &&
    (r.rule.jurisdiction as string || "").toLowerCase().includes(jurisdiction.toLowerCase())
  );
  return match?.rule || null;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
