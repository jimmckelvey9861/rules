/**
 * Deterministic Rule System Tests
 *
 * Tests for:
 * - Rule evaluation (federal overtime)
 * - createRule validation (rejects bad input)
 *
 * Usage: npm run test:new-rules
 */

import { federalOvertime } from "./examples/federalOvertime.js";
import { evaluateRule, evaluateRules } from "./evaluator.js";
import { createRule, RuleValidationError } from "./createRule.js";
import {
  isKnownFact, isDeprecatedFact, getReplacementFact,
  getCanonicalFacts, getDeprecatedFacts, getEnumValues, getFact,
} from "./facts.js";
import type { Rule, Scenario } from "./types.js";

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
    "employee.hourly_rate": 20,
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
    "employee.hourly_rate": 20,
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
    "employee.hourly_rate": 30,
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
      appliesWhen: { fact: "schedule.split_shift", op: ">", value: true },
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
    assert(!isDeprecatedFact(path), `Canonical fact "${path}" is NOT deprecated`);
  }
}

function testDeprecatedFactsPointToReplacements() {
  console.log("\n── Fact Registry: deprecated facts point to replacements ─\n");

  const expectedDeprecations: [string, string][] = [
    ["employer.employee_count", "employer.total_employees"],
    ["employer.industry", "employer.industry_tag"],
    ["employee.hourly_rate", "employee.regular_hourly_rate"],
    ["schedule.split_shift", "shift.is_split_shift"],
    ["schedule.posted_days_in_advance", "schedule.advance_notice_days"],
  ];

  for (const [oldPath, newPath] of expectedDeprecations) {
    assert(isKnownFact(oldPath), `Deprecated fact "${oldPath}" is still registered`);
    assert(isDeprecatedFact(oldPath), `Fact "${oldPath}" is marked deprecated`);
    assertEq(getReplacementFact(oldPath), newPath, `"${oldPath}" points to "${newPath}"`);
    assert(isKnownFact(newPath), `Replacement "${newPath}" exists`);
    assert(!isDeprecatedFact(newPath), `Replacement "${newPath}" is NOT deprecated`);
  }
}

function testEnumFactsRejectInvalidValues() {
  console.log("\n── Fact Registry: enum facts reject invalid values ───────\n");

  // employer.industry_tag should have known values
  const industryValues = getEnumValues("employer.industry_tag");
  assert(industryValues !== undefined, "employer.industry_tag has enum values");
  assert(industryValues!.includes("fast_food"), "industry_tag includes 'fast_food'");
  assert(industryValues!.includes("healthcare"), "industry_tag includes 'healthcare'");
  assert(!industryValues!.includes("zodiac"), "industry_tag does NOT include 'zodiac'");

  // schedule.change_type
  const changeValues = getEnumValues("schedule.change_type");
  assert(changeValues !== undefined, "schedule.change_type has enum values");
  assert(changeValues!.includes("hours_added"), "change_type includes 'hours_added'");
  assert(changeValues!.includes("shift_cancelled"), "change_type includes 'shift_cancelled'");

  // leave.type
  const leaveValues = getEnumValues("leave.type");
  assert(leaveValues !== undefined, "leave.type has enum values");
  assert(leaveValues!.includes("sick"), "leave.type includes 'sick'");
  assert(leaveValues!.includes("family"), "leave.type includes 'family'");

  // termination.type
  const termValues = getEnumValues("termination.type");
  assert(termValues !== undefined, "termination.type has enum values");
  assert(termValues!.includes("layoff"), "termination.type includes 'layoff'");

  // createRule rejects invalid enum for new industry_tag fact
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

function testFederalOvertimeStillPassesUnchanged() {
  console.log("\n── Fact Registry: federal overtime rule still works ──────\n");

  // The rule uses employee.exempt_status and shift.hours_worked_this_week
  // Both must remain canonical (not deprecated)
  assert(!isDeprecatedFact("employee.exempt_status"), "employee.exempt_status is not deprecated");
  assert(!isDeprecatedFact("shift.hours_worked_this_week"), "shift.hours_worked_this_week is not deprecated");

  // Rule still evaluates correctly
  const scenario: Scenario = {
    "employee.exempt_status": "non_exempt",
    "shift.hours_worked_this_week": 45,
  };
  const result = evaluateRule(federalOvertime, scenario);
  assertEq(result.outcome, "violation", "Federal overtime still triggers violation");
}

function testRegistryCounts() {
  console.log("\n── Fact Registry: expected counts ───────────────────────\n");

  const canonical = getCanonicalFacts();
  const deprecated = getDeprecatedFacts();

  assert(canonical.length >= 65, `At least 65 canonical facts (got ${canonical.length})`);
  assertEq(deprecated.length, 5, "Exactly 5 deprecated facts");

  // Every deprecated fact's replacement must exist
  for (const dep of deprecated) {
    assert(dep.replacedBy !== undefined, `Deprecated "${dep.path}" has replacedBy`);
    assert(isKnownFact(dep.replacedBy!), `Replacement "${dep.replacedBy}" for "${dep.path}" exists`);
  }
}

// ─── Run all tests ───────────────────────────────────────────────────

function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Deterministic Rule System — Tests");
  console.log("═══════════════════════════════════════════════════════════");

  // Evaluation tests
  testFederalOvertimeApplies();
  testFederalOvertimeDoesNotApplyUnder40();
  testFederalOvertimeDoesNotApplyExempt();
  testEvaluateRulesSummary();

  // Validation tests
  testRejectsUnknownFact();
  testRejectsVagueValues();
  testRejectsMissingId();
  testRejectsMissingCitation();
  testRejectsInvalidOperatorForType();
  testRejectsInvalidEnumValue();
  testRejectsBadEffectiveDate();

  // Fact registry tests
  testCanonicalFactsRegistered();
  testDeprecatedFactsPointToReplacements();
  testEnumFactsRejectInvalidValues();
  testFederalOvertimeStillPassesUnchanged();
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
