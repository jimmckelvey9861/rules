/**
 * Deterministic Rule Evaluator
 *
 * Pure functions that evaluate rules against a scenario (fact map).
 * No side effects, no database access, no network calls.
 */

import type {
  Rule,
  Condition,
  ComparisonCondition,
  Scenario,
  EvaluationResult,
  EvaluationSummary,
  EvaluationOutcome,
} from "./types.js";

/**
 * Evaluate a single rule against a scenario.
 */
export function evaluateRule(rule: Rule, scenario: Scenario): EvaluationResult {
  const triggeredFacts: string[] = [];

  // Check if the rule's effective date range covers the scenario
  const shiftDate = scenario["shift.date"] as string | undefined;
  if (shiftDate) {
    if (rule.effectiveFrom > shiftDate) {
      return buildResult(rule, "passed", "Rule not yet effective", triggeredFacts);
    }
    if (rule.effectiveTo && rule.effectiveTo < shiftDate) {
      return buildResult(rule, "passed", "Rule no longer effective", triggeredFacts);
    }
  }

  // Evaluate the condition tree
  const applies = evaluateCondition(rule.appliesWhen, scenario, triggeredFacts);

  if (!applies) {
    return buildResult(rule, "passed", "Conditions not met — rule does not apply", triggeredFacts);
  }

  // Conditions met — determine outcome based on result type
  const outcome = determineOutcome(rule, scenario);
  return buildResult(rule, outcome.outcome, outcome.explanation, triggeredFacts);
}

/**
 * Evaluate multiple rules against a scenario.
 */
export function evaluateRules(rules: readonly Rule[], scenario: Scenario): EvaluationSummary {
  const summary: EvaluationSummary = { passed: [], warnings: [], violations: [] };

  for (const rule of rules) {
    if (rule.status !== "active") continue;

    const result = evaluateRule(rule, scenario);
    switch (result.outcome) {
      case "passed":
        summary.passed.push(result);
        break;
      case "warning":
        summary.warnings.push(result);
        break;
      case "violation":
        summary.violations.push(result);
        break;
    }
  }

  return summary;
}

// ─── Condition Evaluation ──────────────────────────────────────────

function evaluateCondition(condition: Condition, scenario: Scenario, triggeredFacts: string[]): boolean {
  if ("all" in condition) {
    return condition.all.every(c => evaluateCondition(c, scenario, triggeredFacts));
  }

  if ("any" in condition) {
    return condition.any.some(c => evaluateCondition(c, scenario, triggeredFacts));
  }

  if ("not" in condition) {
    return !evaluateCondition(condition.not, scenario, triggeredFacts);
  }

  // ComparisonCondition
  return evaluateComparison(condition as ComparisonCondition, scenario, triggeredFacts);
}

function evaluateComparison(comp: ComparisonCondition, scenario: Scenario, triggeredFacts: string[]): boolean {
  const actual = scenario[comp.fact];

  // If the fact is not present in the scenario, the comparison fails
  if (actual === undefined) {
    return false;
  }

  triggeredFacts.push(comp.fact);

  switch (comp.op) {
    case "=":
      return actual === comp.value;
    case "!=":
      return actual !== comp.value;
    case ">":
      return (actual as number) > (comp.value as number);
    case ">=":
      return (actual as number) >= (comp.value as number);
    case "<":
      return (actual as number) < (comp.value as number);
    case "<=":
      return (actual as number) <= (comp.value as number);
    case "in":
      return Array.isArray(comp.value) && (comp.value as Array<string | number>).includes(actual as string | number);
    case "not_in":
      return Array.isArray(comp.value) && !(comp.value as Array<string | number>).includes(actual as string | number);
    default:
      return false;
  }
}

// ─── Outcome Determination ─────────────────────────────────────────

function determineOutcome(rule: Rule, scenario: Scenario): { outcome: EvaluationOutcome; explanation: string } {
  const result = rule.result;

  switch (result.type) {
    case "minimum_required_value": {
      const actual = scenario[result.targetFact] as number | undefined;
      if (actual === undefined) {
        return { outcome: "warning", explanation: `Cannot verify: "${result.targetFact}" not provided in scenario` };
      }
      if (actual < result.minimum) {
        return {
          outcome: "violation",
          explanation: `${result.targetFact} is ${actual} ${result.unit}, below minimum of ${result.minimum} ${result.unit}`,
        };
      }
      return {
        outcome: "passed",
        explanation: `${result.targetFact} is ${actual} ${result.unit}, meets minimum of ${result.minimum} ${result.unit}`,
      };
    }

    case "premium_required": {
      // When conditions are met, a premium is required — flag as violation
      // (the scenario doesn't tell us if the premium was paid)
      const amountStr = result.amount !== undefined ? `${result.amount}x` : result.formula || "";
      return {
        outcome: "violation",
        explanation: `${result.premiumType} premium required: ${amountStr}`,
      };
    }

    case "required_break": {
      return {
        outcome: "violation",
        explanation: `${result.breakType} break of at least ${result.minimumMinutes} minutes is required`,
      };
    }

    case "prohibition": {
      return {
        outcome: "violation",
        explanation: `Prohibited: ${result.prohibitedAction}`,
      };
    }

    case "warning": {
      return { outcome: "warning", explanation: result.message };
    }

    default:
      return { outcome: "warning", explanation: "Unknown result type" };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

function buildResult(
  rule: Rule,
  outcome: EvaluationOutcome,
  explanation: string,
  triggeredFacts: string[],
): EvaluationResult {
  return {
    ruleId: rule.id,
    title: rule.title,
    outcome,
    explanation,
    triggeredFacts: [...new Set(triggeredFacts)],
    citation: rule.citations[0],
  };
}
