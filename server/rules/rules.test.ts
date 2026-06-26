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
