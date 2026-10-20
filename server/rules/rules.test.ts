/**
 * Deterministic Rule System Tests
 *
 * Tests for:
 * - Rule evaluation (federal overtime, CA daily overtime, federal minimum wage)
 * - createRule validation (rejects bad input)
 * - Fact registry integrity
 *
 * Usage: npm run test:new-rules
 */

import { evaluateRule, evaluateRules } from "./evaluator.js";
import { createRule, RuleValidationError } from "./createRule.js";
import { isKnownFact, getCanonicalFacts, getEnumValues } from "./facts.js";
import { RULES, getRule } from "./index.js";

function mustGetRule(id: string) {
  const rule = getRule(id);
  if (!rule) throw new Error(`Test fixture rule "${id}" is not loaded from data/rules`);
  return rule;
}
const federalOvertime = mustGetRule("federal-overtime-weekly-40");
const californiaDailyOvertime = mustGetRule("ca-daily-overtime-8");
const federalMinimumWage = mustGetRule("federal-minimum-wage-7.25");
import type { Scenario } from "./types.js";

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

function assertThrows(fn: () => void, expectedType: string, message: string) {
  try {
    fn();
    failed++;
    failures.push(`${message} — did not throw`);
    console.log(`  ❌ ${message} — did not throw`);
  } catch (e: any) {
    if (e.constructor.name === expectedType || e.name === expectedType) {
      passed++;
      console.log(`  ✅ ${message}`);
    } else {
      failed++;
      failures.push(`${message} — threw ${e.constructor.name} instead of ${expectedType}`);
      console.log(`  ❌ ${message} — threw ${e.constructor.name} instead of ${expectedType}`);
    }
  }
}

// ─── Test: Federal Overtime Rule ─────────────────────────────────────

function testFederalOvertimeApplies() {
  console.log("\n── Federal Overtime: applies when non-exempt > 40 hours ──\n");

  const scenario: Scenario = {
    "employee.exempt_status": "non_exempt",
    "shift.hours_worked_this_week": 45,
  };

  const result = evaluateRule(federalOvertime, scenario);
  assertEq(result.outcome, "violation", "Outcome is violation (premium required)");
  assertEq(result.ruleId, "federal-overtime-weekly-40", "Rule ID matches");
  assert(result.explanation.includes("overtime"), "Explanation mentions overtime");
  assert(result.triggeredFacts.includes("employee.exempt_status"), "Triggered facts include exempt_status");
  assert(result.triggeredFacts.includes("shift.hours_worked_this_week"), "Triggered facts include hours_worked_this_week");
  assert(result.citation.source.includes("Fair Labor Standards Act"), "Citation references Fair Labor Standards Act");
}

function testFederalOvertimeDoesNotApplyUnder40() {
  console.log("\n── Federal Overtime: does not apply when <= 40 hours ─────\n");

  const scenario: Scenario = {
    "employee.exempt_status": "non_exempt",
    "shift.hours_worked_this_week": 40,
  };

  const result = evaluateRule(federalOvertime, scenario);
  assertEq(result.outcome, "passed", "Outcome is passed (no overtime at 40 hours)");
  assert(result.explanation.includes("not met") || result.explanation.includes("does not apply"),
    "Explanation indicates rule does not apply");
}

function testFederalOvertimeDoesNotApplyExempt() {
  console.log("\n── Federal Overtime: does not apply when exempt ──────────\n");

  const scenario: Scenario = {
    "employee.exempt_status": "exempt",
    "shift.hours_worked_this_week": 50,
  };

  const result = evaluateRule(federalOvertime, scenario);
  assertEq(result.outcome, "passed", "Outcome is passed (exempt employee)");
  assert(result.explanation.includes("not met") || result.explanation.includes("does not apply"),
    "Explanation indicates rule does not apply");
}

function testEvaluateRulesSummary() {
  console.log("\n── evaluateRules: summary grouping ─────────────────────\n");

  const violationScenario: Scenario = {
    "employee.exempt_status": "non_exempt",
    "shift.hours_worked_this_week": 45,
  };

  const summary = evaluateRules([federalOvertime], violationScenario);
  assertEq(summary.violations.length, 1, "1 violation in summary");
  assertEq(summary.passed.length, 0, "0 passed in summary");
  assertEq(summary.warnings.length, 0, "0 warnings in summary");
}

// ─── Test: California Daily Overtime Rule ────────────────────────────

function testCaDailyOvertimeApplies() {
  console.log("\n── CA Daily Overtime: applies when CA non-exempt > 8 hours ──\n");

  const scenario: Scenario = {
    "location.state": "CA",
    "employee.exempt_status": "non_exempt",
    "shift.hours_worked_today": 9,
  };

  const result = evaluateRule(californiaDailyOvertime, scenario);
  assertEq(result.outcome, "violation", "Outcome is violation (overtime required)");
  assertEq(result.ruleId, "ca-daily-overtime-8", "Rule ID matches");
  assert(result.explanation.includes("overtime"), "Explanation mentions overtime");
  assert(result.triggeredFacts.includes("location.state"), "Triggered facts include location.state");
  assert(result.triggeredFacts.includes("shift.hours_worked_today"), "Triggered facts include shift.hours_worked_today");
}

function testCaDailyOvertimeDoesNotApplyAt8() {
  console.log("\n── CA Daily Overtime: does not apply at exactly 8 hours ──\n");

  const scenario: Scenario = {
    "location.state": "CA",
    "employee.exempt_status": "non_exempt",
    "shift.hours_worked_today": 8,
  };

  const result = evaluateRule(californiaDailyOvertime, scenario);
  assertEq(result.outcome, "passed", "Outcome is passed (no overtime at 8 hours)");
}

function testCaDailyOvertimeDoesNotApplyExempt() {
  console.log("\n── CA Daily Overtime: does not apply when exempt ─────────\n");

  const scenario: Scenario = {
    "location.state": "CA",
    "employee.exempt_status": "exempt",
    "shift.hours_worked_today": 9,
  };

  const result = evaluateRule(californiaDailyOvertime, scenario);
  assertEq(result.outcome, "passed", "Outcome is passed (exempt employee)");
}

function testCaDailyOvertimeDoesNotApplyOutsideCA() {
  console.log("\n── CA Daily Overtime: does not apply in NY ──────────────\n");

  const scenario: Scenario = {
    "location.state": "NY",
    "employee.exempt_status": "non_exempt",
    "shift.hours_worked_today": 9,
  };

  const result = evaluateRule(californiaDailyOvertime, scenario);
  assertEq(result.outcome, "passed", "Outcome is passed (not California)");
}

// ─── Test: Federal Minimum Wage Rule ─────────────────────────────────

function testFederalMinWageViolation() {
  console.log("\n── Federal Min Wage: violation at $7.24 ─────────────────\n");

  const scenario: Scenario = {
    "location.country": "US",
    "employee.exempt_status": "non_exempt",
    "employee.regular_hourly_rate": 7.24,
    "shift.date": "2025-01-15",
  };

  const result = evaluateRule(federalMinimumWage, scenario);
  assertEq(result.outcome, "violation", "Outcome is violation ($7.24 < $7.25)");
  assert(result.explanation.includes("7.24"), "Explanation mentions actual rate");
  assert(result.explanation.includes("7.25"), "Explanation mentions minimum");
}

function testFederalMinWagePassesAtMinimum() {
  console.log("\n── Federal Min Wage: passes at $7.25 ───────────────────\n");

  const scenario: Scenario = {
    "location.country": "US",
    "employee.exempt_status": "non_exempt",
    "employee.regular_hourly_rate": 7.25,
    "shift.date": "2025-01-15",
  };

  const result = evaluateRule(federalMinimumWage, scenario);
  assertEq(result.outcome, "passed", "Outcome is passed ($7.25 meets minimum)");
}

function testFederalMinWageExemptEmployee() {
  console.log("\n── Federal Min Wage: does not apply to exempt ───────────\n");

  const scenario: Scenario = {
    "location.country": "US",
    "employee.exempt_status": "exempt",
    "employee.regular_hourly_rate": 5.00,
    "shift.date": "2025-01-15",
  };

  const result = evaluateRule(federalMinimumWage, scenario);
  assertEq(result.outcome, "passed", "Outcome is passed (exempt employee)");
}

function testFederalMinWagePreEffectiveDate() {
  console.log("\n── Federal Min Wage: does not apply before 2009-07-24 ───\n");

  const scenario: Scenario = {
    "location.country": "US",
    "employee.exempt_status": "non_exempt",
    "employee.regular_hourly_rate": 5.00,
    "shift.date": "2009-07-23",
  };

  const result = evaluateRule(federalMinimumWage, scenario);
  assertEq(result.outcome, "passed", "Outcome is passed (before effective date)");
}

// ─── Test: createRule validation ─────────────────────────────────────

function testRejectsUnknownFact() {
  console.log("\n── createRule: rejects unknown fact ─────────────────────\n");

  assertThrows(() => {
    createRule({
      id: "test-bad-fact",
      title: "Test Rule",
      jurisdiction: "Federal",
      topic: "overtime",
      effectiveFrom: "2024-01-01",
      status: "active",
      appliesWhen: { fact: "employee.zodiac_sign", op: "=", value: "aries" },
      result: { type: "warning", message: "test" },
      citations: [{ source: "Test Source" }],
    });
  }, "RuleValidationError", "Rejects unknown fact 'employee.zodiac_sign'");
}

function testRejectsVagueValues() {
  console.log("\n── createRule: rejects vague values ─────────────────────\n");

  assertThrows(() => {
    createRule({
      id: "test-vague",
      title: "Test Rule",
      jurisdiction: "Federal",
      topic: "overtime",
      effectiveFrom: "2024-01-01",
      status: "active",
      appliesWhen: { fact: "employee.exempt_status", op: "=", value: "varies" },
      result: { type: "warning", message: "test" },
      citations: [{ source: "Test Source" }],
    });
  }, "RuleValidationError", "Rejects vague value 'varies'");
}

function testRejectsMissingId() {
  console.log("\n── createRule: rejects missing id ───────────────────────\n");

  assertThrows(() => {
    createRule({
      id: "",
      title: "Test Rule",
      jurisdiction: "Federal",
      topic: "overtime",
      effectiveFrom: "2024-01-01",
      status: "active",
      appliesWhen: { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      result: { type: "warning", message: "test" },
      citations: [{ source: "Test Source" }],
    });
  }, "RuleValidationError", "Rejects empty id");
}

function testRejectsMissingCitation() {
  console.log("\n── createRule: rejects missing citation ─────────────────\n");

  assertThrows(() => {
    createRule({
      id: "test-no-citation",
      title: "Test Rule",
      jurisdiction: "Federal",
      topic: "overtime",
      effectiveFrom: "2024-01-01",
      status: "active",
      appliesWhen: { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      result: { type: "warning", message: "test" },
      citations: [],
    });
  }, "RuleValidationError", "Rejects empty citations array");
}

function testRejectsInvalidOperatorForType() {
  console.log("\n── createRule: rejects invalid operator for boolean ─────\n");

  assertThrows(() => {
    createRule({
      id: "test-bad-op",
      title: "Test Rule",
      jurisdiction: "Federal",
      topic: "scheduling",
      effectiveFrom: "2024-01-01",
      status: "active",
      appliesWhen: { fact: "shift.is_split_shift", op: ">", value: true },
      result: { type: "warning", message: "test" },
      citations: [{ source: "Test Source" }],
    });
  }, "RuleValidationError", "Rejects '>' operator on boolean fact");
}

function testRejectsInvalidEnumValue() {
  console.log("\n── createRule: rejects invalid enum value ───────────────\n");

  assertThrows(() => {
    createRule({
      id: "test-bad-enum",
      title: "Test Rule",
      jurisdiction: "Federal",
      topic: "overtime",
      effectiveFrom: "2024-01-01",
      status: "active",
      appliesWhen: { fact: "employee.exempt_status", op: "=", value: "maybe" },
      result: { type: "warning", message: "test" },
      citations: [{ source: "Test Source" }],
    });
  }, "RuleValidationError", "Rejects invalid enum value 'maybe'");
}

function testRejectsBadEffectiveDate() {
  console.log("\n── createRule: rejects bad effective date ───────────────\n");

  assertThrows(() => {
    createRule({
      id: "test-bad-date",
      title: "Test Rule",
      jurisdiction: "Federal",
      topic: "overtime",
      effectiveFrom: "2024",
      status: "active",
      appliesWhen: { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      result: { type: "warning", message: "test" },
      citations: [{ source: "Test Source" }],
    });
  }, "RuleValidationError", "Rejects non-ISO effective date '2024'");
}

// ─── Test: Rule Interactions (most restrictive wins) ─────────────────

function testMostRestrictiveMinWageWins() {
  console.log("\n── Rule Interactions: most restrictive min wage wins ─────\n");

  // A worker in NY paid $7.24 — both federal ($7.25) and NY ($16.50) fire,
  // but only NY should remain as a violation (it's more restrictive).
  const scenario: Scenario = {
    "location.country": "US",
    "location.state": "NY",
    "location.city": "New York",
    "employee.exempt_status": "non_exempt",
    "employee.regular_hourly_rate": 7.24,
    "shift.date": "2025-06-01",
    "shift.hours_worked_this_week": 30,
  };

  const result = evaluateRules(RULES, scenario);

  // Find min wage violations
  const minWageViolations = result.violations.filter(v => {
    const rule = RULES.find(r => r.id === v.ruleId);
    return rule?.topic === "minimum_wage";
  });

  // Should have exactly 1 min wage violation (the most restrictive)
  assert(minWageViolations.length === 1,
    `Expected 1 min wage violation, got ${minWageViolations.length}`);

  // The winner should NOT be the federal rule (it's less restrictive)
  assert(minWageViolations[0].ruleId !== "federal-minimum-wage-7.25",
    `Federal min wage should be superseded, but it won`);

  // The federal rule should be in passed with supersededBy set
  const federalInPassed = result.passed.find(p => p.ruleId === "federal-minimum-wage-7.25");
  assert(federalInPassed !== undefined,
    `Federal min wage should be in passed (superseded)`);
  assert(federalInPassed?.supersededBy !== undefined,
    `Federal min wage should have supersededBy set`);
}

function testProhibitionsAllApply() {
  console.log("\n── Rule Interactions: all prohibitions apply ─────────────\n");

  // A 14-year-old in NY scheduled for 5 hours on a school day ending at 8pm.
  // Multiple prohibition rules should fire and ALL should remain violations.
  const scenario: Scenario = {
    "location.state": "NY",
    "employee.is_minor": true,
    "employee.age": 14,
    "employee.exempt_status": "non_exempt",
    "shift.is_school_day": true,
    "shift.school_in_session": true,
    "shift.shift_length_hours": 5,
    "shift.end_hour": 20,
    "shift.date": "2025-06-01",
  };

  const result = evaluateRules(RULES, scenario);

  // Should have at least 2 prohibition violations:
  // 1. >3 hrs on school day (federal 14-15)
  // 2. curfew past 7pm (federal 14-15, school year)
  const prohibitions = result.violations.filter(v => v.explanation.startsWith("Prohibited:"));
  assert(prohibitions.length >= 2,
    `Expected at least 2 prohibition violations, got ${prohibitions.length}`);

  // None should be superseded
  const supersededProhibitions = prohibitions.filter(p => p.supersededBy);
  assert(supersededProhibitions.length === 0,
    `No prohibitions should be superseded, but ${supersededProhibitions.length} were`);
}

// ─── Test: Fact Registry ─────────────────────────────────────────────

function testCanonicalFactsRegistered() {
  console.log("\n── Fact Registry: canonical facts are registered ────────\n");

  const expectedCanonical = [
    "location.state", "location.city", "location.county", "location.country",
    "employer.total_employees", "employer.total_employees_global", "employer.industry_tag",
    "employee.exempt_status", "employee.regular_hourly_rate", "employee.is_minor",
    "employee.employment_status", "employee.worker_type", "employee.job_category",
    "shift.hours_worked_this_week", "shift.hours_worked_today", "shift.is_split_shift",
    "shift.meal_break_provided", "shift.rest_break_provided",
    "schedule.advance_notice_days", "schedule.was_changed", "schedule.change_type",
    "leave.type", "leave.reason",
    "termination.type", "termination.is_mass_layoff",
    "payroll.pay_frequency",
  ];

  for (const path of expectedCanonical) {
    assert(isKnownFact(path), `Canonical fact "${path}" is registered`);
  }
}

function testEnumFactsRejectInvalidValues() {
  console.log("\n── Fact Registry: enum facts reject invalid values ───────\n");

  const industryValues = getEnumValues("employer.industry_tag");
  assert(industryValues !== undefined, "employer.industry_tag has enum values");
  assert(industryValues!.includes("fast_food"), "industry_tag includes 'fast_food'");
  assert(industryValues!.includes("healthcare"), "industry_tag includes 'healthcare'");
  assert(!industryValues!.includes("zodiac"), "industry_tag does NOT include 'zodiac'");

  const changeValues = getEnumValues("schedule.change_type");
  assert(changeValues !== undefined, "schedule.change_type has enum values");
  assert(changeValues!.includes("hours_added"), "change_type includes 'hours_added'");
  assert(changeValues!.includes("shift_cancelled"), "change_type includes 'shift_cancelled'");

  const leaveValues = getEnumValues("leave.type");
  assert(leaveValues !== undefined, "leave.type has enum values");
  assert(leaveValues!.includes("sick"), "leave.type includes 'sick'");
  assert(leaveValues!.includes("family"), "leave.type includes 'family'");

  const termValues = getEnumValues("termination.type");
  assert(termValues !== undefined, "termination.type has enum values");
  assert(termValues!.includes("layoff"), "termination.type includes 'layoff'");

  assertThrows(() => {
    createRule({
      id: "test-bad-industry",
      title: "Test Rule",
      jurisdiction: "Federal",
      topic: "scheduling",
      effectiveFrom: "2024-01-01",
      status: "active",
      appliesWhen: { fact: "employer.industry_tag", op: "=", value: "zodiac" },
      result: { type: "warning", message: "test" },
      citations: [{ source: "Test Source" }],
    });
  }, "RuleValidationError", "createRule rejects invalid industry_tag enum value");
}

function testRegistryCounts() {
  console.log("\n── Fact Registry: expected counts ───────────────────────\n");

  const canonical = getCanonicalFacts();
  assert(canonical.length >= 65, `At least 65 canonical facts (got ${canonical.length})`);
}

// ─── Run all tests ───────────────────────────────────────────────────

function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Deterministic Rule System — Tests");
  console.log("═══════════════════════════════════════════════════════════");

  // Federal overtime
  testFederalOvertimeApplies();
  testFederalOvertimeDoesNotApplyUnder40();
  testFederalOvertimeDoesNotApplyExempt();
  testEvaluateRulesSummary();

  // California daily overtime
  testCaDailyOvertimeApplies();
  testCaDailyOvertimeDoesNotApplyAt8();
  testCaDailyOvertimeDoesNotApplyExempt();
  testCaDailyOvertimeDoesNotApplyOutsideCA();

  // Federal minimum wage
  testFederalMinWageViolation();
  testFederalMinWagePassesAtMinimum();
  testFederalMinWageExemptEmployee();
  testFederalMinWagePreEffectiveDate();

  // createRule validation
  testRejectsUnknownFact();
  testRejectsVagueValues();
  testRejectsMissingId();
  testRejectsMissingCitation();
  testRejectsInvalidOperatorForType();
  testRejectsInvalidEnumValue();
  testRejectsBadEffectiveDate();

  // Rule interactions
  testMostRestrictiveMinWageWins();
  testProhibitionsAllApply();

  // Fact registry
  testCanonicalFactsRegistered();
  testEnumFactsRejectInvalidValues();
  testRegistryCounts();

  // Summary
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

  process.exit(failed > 0 ? 1 : 0);
}

main();
