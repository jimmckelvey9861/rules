/**
 * Compatibility Comparison — Federal Overtime
 *
 * Runs both the old JSON evaluator and the new TypeScript evaluator
 * against the same fixture scenarios. Shows inputs, outputs, agreement,
 * and field mapping differences.
 *
 * Usage: npm run compare:overtime
 */

import { evaluateRule } from "./evaluator.js";
import { federalOvertime } from "./examples/federalOvertime.js";
import { evaluateOvertime } from "../evaluator/overtime.js";
import type { OvertimeRule } from "../normalizer/canonical-schemas.js";
import type { OvertimeInput, OvertimeResult } from "../evaluator/overtime.js";
import type { Scenario, EvaluationResult } from "./types.js";

// ─── Field Mapping ─────────────────────────────────────────────────
// Documents how old JSON fields map to new fact-registry fields.

const FIELD_MAP = [
  { old: "employee.exemption_status", new: "employee.exempt_status", note: "Renamed: exemption_status → exempt_status" },
  { old: "hours_worked_in_workweek", new: "shift.hours_worked_this_week", note: "Moved to shift namespace, renamed" },
  { old: "regular_rate", new: "employee.regular_hourly_rate", note: "Moved to employee namespace, canonical name" },
] as const;

// ─── Fixture Scenarios ─────────────────────────────────────────────

interface Fixture {
  label: string;
  expectedOutcome: string;
  newScenario: Scenario;
  oldInput: OvertimeInput;
}

const FIXTURES: Fixture[] = [
  {
    label: "Non-exempt, 45 weekly hours → overtime required",
    expectedOutcome: "overtime applies",
    newScenario: {
      "employee.exempt_status": "non_exempt",
      "shift.hours_worked_this_week": 45,
      "employee.hourly_rate": 20,
    },
    oldInput: {
      hours_worked_in_workweek: 45,
      regular_rate: 20,
      employee: { exemption_status: "non_exempt" },
    },
  },
  {
    label: "Non-exempt, 40 weekly hours → no overtime",
    expectedOutcome: "no overtime",
    newScenario: {
      "employee.exempt_status": "non_exempt",
      "shift.hours_worked_this_week": 40,
      "employee.hourly_rate": 25,
    },
    oldInput: {
      hours_worked_in_workweek: 40,
      regular_rate: 25,
      employee: { exemption_status: "non_exempt" },
    },
  },
  {
    label: "Exempt, 45 weekly hours → no overtime",
    expectedOutcome: "no overtime",
    newScenario: {
      "employee.exempt_status": "exempt",
      "shift.hours_worked_this_week": 45,
      "employee.hourly_rate": 30,
    },
    oldInput: {
      hours_worked_in_workweek: 45,
      regular_rate: 30,
      employee: { exemption_status: "exempt" },
    },
  },
];

// ─── Old rule definition (hardcoded — matches DB representation) ────

const OLD_FEDERAL_OT: OvertimeRule = {
  ruleType: "overtime",
  jurisdiction: "Federal",
  basis: "weekly_hours",
  threshold: { hours: 40, period: "workweek" },
  premiumRate: 1.5,
  appliesTo: { "employee.exemption_status": "non_exempt" },
  calculation: {
    overtimeHours: "max(0, hours_worked_in_workweek - 40)",
    overtimePay: "overtimeHours * regular_rate * 1.5",
  },
};

// ─── Run comparison ────────────────────────────────────────────────

function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Federal Overtime — Old JSON vs New TypeScript Comparison");
  console.log("═══════════════════════════════════════════════════════════════");

  // Show field mapping differences
  console.log("\n── Field Mapping Differences ──\n");
  for (const m of FIELD_MAP) {
    console.log(`  ${m.old}  →  ${m.new}`);
    console.log(`    ${m.note}\n`);
  }

  let allMatch = true;

  for (const fixture of FIXTURES) {
    console.log(`── Fixture: ${fixture.label} ──\n`);

    // Show scenario input
    console.log("  Scenario (new format):");
    for (const [k, v] of Object.entries(fixture.newScenario)) {
      console.log(`    ${k} = ${JSON.stringify(v)}`);
    }
    console.log("");

    // Run old evaluator
    const oldResult: OvertimeResult = evaluateOvertime(OLD_FEDERAL_OT, fixture.oldInput);

    // Run new evaluator
    const newResult: EvaluationResult = evaluateRule(federalOvertime, fixture.newScenario);

    // Determine agreement
    const oldApplies = oldResult.applies;
    const newApplies = newResult.outcome === "violation";
    const agree = oldApplies === newApplies;
    if (!agree) allMatch = false;

    // Show old output
    console.log("  Old JSON evaluator:");
    console.log(`    applies: ${oldResult.applies}`);
    console.log(`    overtimeHours: ${oldResult.overtimeHours}`);
    console.log(`    overtimePay: $${oldResult.overtimePay.toFixed(2)}`);
    console.log(`    regularPay: $${oldResult.regularPay.toFixed(2)}`);
    console.log(`    totalPay: $${oldResult.totalPay.toFixed(2)}`);
    if (oldResult.reason) console.log(`    reason: ${oldResult.reason}`);
    console.log("");

    // Show new output
    console.log("  New TypeScript evaluator:");
    console.log(`    outcome: ${newResult.outcome}`);
    console.log(`    explanation: ${newResult.explanation}`);
    console.log(`    triggeredFacts: [${newResult.triggeredFacts.join(", ")}]`);
    console.log(`    ruleId: ${newResult.ruleId}`);
    console.log(`    citation: ${newResult.citation.source}`);
    console.log("");

    // Agreement
    const icon = agree ? "✅" : "❌";
    console.log(`  ${icon} Agreement: ${agree ? "YES" : "NO"} (old.applies=${oldApplies}, new.outcome=${newResult.outcome})`);
    console.log("");
  }

  // Summary
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Result: ${allMatch ? "✅ All 3 fixtures agree" : "❌ Disagreements found"}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  process.exit(allMatch ? 0 : 1);
}

main();
