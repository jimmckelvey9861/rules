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
  ConditionDetail,
  RuleResult,
} from "./types.js";
import { getObligation } from "../reference/vocabulary.js";
import { compare } from "./partialEvaluate.js";

/** The numeric parameter that decides "most protective" for this result's obligation, if any. */
function compareValue(result: RuleResult): number | undefined {
  const ob = getObligation(result.obligation);
  const key = ob?.compareParam;
  const v = key ? result.params[key] : undefined;
  return typeof v === "number" ? v : undefined;
}

/** Results of the same obligation are only comparable when they are expressed in the same unit. */
function compareUnit(result: RuleResult): string {
  const u = result.params["unit"];
  return typeof u === "string" ? u : "";
}

/**
 * Evaluate a single rule against a scenario.
 */
export function evaluateRule(rule: Rule, scenario: Scenario): EvaluationResult {
  const triggeredFacts: string[] = [];
  const conditionDetails: ConditionDetail[] = [];

  // Check if the rule's effective date range covers the scenario
  const shiftDate = scenario["shift.date"] as string | undefined;
  if (shiftDate) {
    if (rule.effectiveFrom > shiftDate) {
      return buildResult(rule, "passed", "Rule not yet effective", triggeredFacts, conditionDetails);
    }
    if (rule.effectiveTo && rule.effectiveTo < shiftDate) {
      return buildResult(rule, "passed", "Rule no longer effective", triggeredFacts, conditionDetails);
    }
  }

  // Evaluate the condition tree
  const applies = evaluateCondition(rule.appliesWhen, scenario, triggeredFacts, conditionDetails);

  if (!applies) {
    return buildResult(rule, "passed", "Conditions not met — rule does not apply", triggeredFacts, conditionDetails);
  }

  // Conditions met — determine outcome based on result type
  const outcome = determineOutcome(rule, scenario);
  return buildResult(rule, outcome.outcome, outcome.explanation, triggeredFacts, conditionDetails);
}

/**
 * Evaluate multiple rules against a scenario.
 * After individual evaluation, resolves interactions so that only the
 * most restrictive rule per obligation remains as a violation.
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

  return resolveInteractions(summary, rules);
}

// ─── Rule Interaction Resolution ───────────────────────────────────

/**
 * Resolves "most restrictive wins" within each obligation.
 *
 * When multiple rules fire on the same obligation (e.g., federal min wage
 * AND state min wage, both "wage.minimum"), only the most restrictive
 * remains a violation. Grouping is by obligation rather than topic so that
 * rules tagged with different sub-topics (a general and an industry minimum
 * wage) still compete.
 * Less restrictive rules are moved to passed with a supersededBy marker.
 *
 * Logic by result type, comparing the obligation's compareParam
 * (see data/result-vocabulary.json):
 * - minimum_required_value: highest value wins (per obligation)
 * - required_break: longest minimum_minutes wins (per obligation)
 * - premium_required: highest amount wins (per obligation, same unit only)
 * - prohibition: ALL apply (cannot supersede a prohibition)
 * - warning: ALL apply
 */
function resolveInteractions(summary: EvaluationSummary, rules: readonly Rule[]): EvaluationSummary {
  const ruleMap = new Map(rules.map(r => [r.id, r]));

  // Group violations by obligation
  const byTopic = new Map<string, EvaluationResult[]>();
  for (const v of summary.violations) {
    const rule = ruleMap.get(v.ruleId);
    if (!rule) continue;
    const key = rule.result.obligation;
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key)!.push(v);
  }

  const keptViolations: EvaluationResult[] = [];
  const superseded: EvaluationResult[] = [];

  for (const [_obligation, violations] of byTopic) {
    if (violations.length <= 1) {
      keptViolations.push(...violations);
      continue;
    }

    // Get the rules for these violations
    const withRules = violations.map(v => ({ result: v, rule: ruleMap.get(v.ruleId)! }));
    const resultType = withRules[0].rule.result.type;

    // If mixed result types within an obligation, keep all (no safe comparison)
    const allSameType = withRules.every(wr => wr.rule.result.type === resultType);
    if (!allSameType) {
      keptViolations.push(...violations);
      continue;
    }

    switch (resultType) {
      case "minimum_required_value": {
        // Highest value wins, within each obligation
        const byObligation = new Map<string, typeof withRules>();
        for (const wr of withRules) {
          const key = wr.rule.result.obligation;
          if (!byObligation.has(key)) byObligation.set(key, []);
          byObligation.get(key)!.push(wr);
        }
        for (const [_ob, group] of byObligation) {
          if (group.length <= 1 || !group.every(wr => compareValue(wr.rule.result) !== undefined)) {
            keptViolations.push(...group.map(g => g.result));
            continue;
          }
          const sorted = group.sort((a, b) => compareValue(b.rule.result)! - compareValue(a.rule.result)!);
          const winner = sorted[0];
          keptViolations.push(winner.result);
          for (let i = 1; i < sorted.length; i++) {
            sorted[i].result.outcome = "passed";
            sorted[i].result.supersededBy = winner.result.ruleId;
            sorted[i].result.explanation = `Superseded by ${winner.result.ruleId} (more restrictive: ${winner.rule.result.summary})`;
            superseded.push(sorted[i].result);
          }
        }
        break;
      }

      case "required_break": {
        // Group by obligation (break.meal, break.rest), then longest minimum_minutes wins
        const byObligation = new Map<string, typeof withRules>();
        for (const wr of withRules) {
          const key = wr.rule.result.obligation;
          if (!byObligation.has(key)) byObligation.set(key, []);
          byObligation.get(key)!.push(wr);
        }
        for (const [_ob, group] of byObligation) {
          if (group.length <= 1 || !group.every(wr => compareValue(wr.rule.result) !== undefined)) {
            keptViolations.push(...group.map(g => g.result));
            continue;
          }
          const sorted = group.sort((a, b) => compareValue(b.rule.result)! - compareValue(a.rule.result)!);
          const winner = sorted[0];
          keptViolations.push(winner.result);
          for (let i = 1; i < sorted.length; i++) {
            sorted[i].result.outcome = "passed";
            sorted[i].result.supersededBy = winner.result.ruleId;
            sorted[i].result.explanation = `Superseded by ${winner.result.ruleId} (longer break: ${compareValue(winner.rule.result)} min)`;
            superseded.push(sorted[i].result);
          }
        }
        break;
      }

      case "premium_required": {
        // Group by obligation and unit, then highest compare value wins
        const byObligation = new Map<string, typeof withRules>();
        for (const wr of withRules) {
          const key = `${wr.rule.result.obligation}|${compareUnit(wr.rule.result)}`;
          if (!byObligation.has(key)) byObligation.set(key, []);
          byObligation.get(key)!.push(wr);
        }
        for (const [_key, group] of byObligation) {
          // If any lack a numeric compare value, keep all (prose-only premiums cannot be compared)
          if (group.length <= 1 || !group.every(wr => compareValue(wr.rule.result) !== undefined)) {
            keptViolations.push(...group.map(g => g.result));
            continue;
          }
          const sorted = group.sort((a, b) => compareValue(b.rule.result)! - compareValue(a.rule.result)!);
          const winner = sorted[0];
          keptViolations.push(winner.result);
          for (let i = 1; i < sorted.length; i++) {
            sorted[i].result.outcome = "passed";
            sorted[i].result.supersededBy = winner.result.ruleId;
            sorted[i].result.explanation = `Superseded by ${winner.result.ruleId} (higher premium: ${compareValue(winner.rule.result)})`;
            superseded.push(sorted[i].result);
          }
        }
        break;
      }

      case "prohibition":
        // All prohibitions apply — cannot supersede
        keptViolations.push(...violations);
        break;

      case "warning":
        // All warnings apply
        keptViolations.push(...violations);
        break;

      default:
        keptViolations.push(...violations);
    }
  }

  return {
    violations: keptViolations,
    warnings: summary.warnings,
    passed: [...summary.passed, ...superseded],
  };
}

// ─── Condition Evaluation ──────────────────────────────────────────

function evaluateCondition(condition: Condition, scenario: Scenario, triggeredFacts: string[], conditionDetails: ConditionDetail[]): boolean {
  if ("all" in condition) {
    return condition.all.every(c => evaluateCondition(c, scenario, triggeredFacts, conditionDetails));
  }

  if ("any" in condition) {
    return condition.any.some(c => evaluateCondition(c, scenario, triggeredFacts, conditionDetails));
  }

  if ("not" in condition) {
    return !evaluateCondition(condition.not, scenario, triggeredFacts, conditionDetails);
  }

  // ComparisonCondition
  return evaluateComparison(condition as ComparisonCondition, scenario, triggeredFacts, conditionDetails);
}

function evaluateComparison(comp: ComparisonCondition, scenario: Scenario, triggeredFacts: string[], conditionDetails: ConditionDetail[]): boolean {
  const actual = scenario[comp.fact];

  // If the fact is not present in the scenario, the comparison fails
  if (actual === undefined) {
    conditionDetails.push({ fact: comp.fact, op: comp.op, expected: comp.value, actual: undefined, met: false });
    return false;
  }

  triggeredFacts.push(comp.fact);

  const met = compare(comp.op, actual, comp.value);

  conditionDetails.push({ fact: comp.fact, op: comp.op, expected: comp.value, actual, met });
  return met;
}

// ─── Outcome Determination ─────────────────────────────────────────

function determineOutcome(rule: Rule, scenario: Scenario): { outcome: EvaluationOutcome; explanation: string } {
  const result = rule.result;
  const obligation = getObligation(result.obligation);
  const label = obligation?.name ?? result.obligation;

  switch (result.type) {
    case "minimum_required_value": {
      const targetFact = obligation?.targetFact;
      const minimum = compareValue(result);
      if (!targetFact || minimum === undefined) {
        return { outcome: "warning", explanation: `Cannot verify ${label}: obligation has no target fact or compare value` };
      }
      const actual = scenario[targetFact] as number | undefined;
      if (actual === undefined) {
        return { outcome: "warning", explanation: `Cannot verify: "${targetFact}" not provided in scenario` };
      }
      const unit = obligation?.params.find(p => p.name === obligation.compareParam)?.unit ?? "";
      if (actual < minimum) {
        return {
          outcome: "violation",
          explanation: `${targetFact} is ${actual} ${unit}, below minimum of ${minimum} ${unit} (${result.summary})`,
        };
      }
      return {
        outcome: "passed",
        explanation: `${targetFact} is ${actual} ${unit}, meets minimum of ${minimum} ${unit}`,
      };
    }

    case "premium_required": {
      // When conditions are met, a premium is owed — flag as violation
      // (the scenario doesn't tell us if the premium was paid)
      return {
        outcome: "violation",
        explanation: `Premium required (${label.toLowerCase()}): ${result.summary}`,
      };
    }

    case "required_break": {
      return {
        outcome: "violation",
        explanation: `${label} of at least ${result.params.minimum_minutes} minutes is required (${result.summary})`,
      };
    }

    case "prohibition": {
      return {
        outcome: "violation",
        explanation: `Prohibited: ${result.summary}`,
      };
    }

    case "warning": {
      return { outcome: "warning", explanation: result.summary };
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
  conditionDetails: ConditionDetail[] = [],
): EvaluationResult {
  return {
    ruleId: rule.id,
    title: rule.title,
    outcome,
    explanation,
    triggeredFacts: [...new Set(triggeredFacts)],
    conditionDetails,
    citation: rule.citations[0],
  };
}
