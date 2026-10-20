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
} from "./types.js";

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
 * most restrictive rule per topic remains as a violation.
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
 * Resolves "most restrictive wins" within each topic.
 *
 * When multiple rules fire on the same topic (e.g., federal min wage
 * AND state min wage), only the most restrictive remains a violation.
 * Less restrictive rules are moved to passed with a supersededBy marker.
 *
 * Logic by result type:
 * - minimum_required_value: highest minimum wins
 * - required_break: longest minimumMinutes wins (per breakType)
 * - premium_required: highest amount wins (per premiumType)
 * - prohibition: ALL apply (cannot supersede a prohibition)
 * - warning: ALL apply
 */
function resolveInteractions(summary: EvaluationSummary, rules: readonly Rule[]): EvaluationSummary {
  const ruleMap = new Map(rules.map(r => [r.id, r]));

  // Group violations by topic
  const byTopic = new Map<string, EvaluationResult[]>();
  for (const v of summary.violations) {
    const rule = ruleMap.get(v.ruleId);
    if (!rule) continue;
    const topic = rule.topic;
    if (!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic)!.push(v);
  }

  const keptViolations: EvaluationResult[] = [];
  const superseded: EvaluationResult[] = [];

  for (const [topic, violations] of byTopic) {
    if (violations.length <= 1) {
      keptViolations.push(...violations);
      continue;
    }

    // Get the rules for these violations
    const withRules = violations.map(v => ({ result: v, rule: ruleMap.get(v.ruleId)! }));
    const resultType = withRules[0].rule.result.type;

    // If mixed result types within a topic, keep all (no safe comparison)
    const allSameType = withRules.every(wr => wr.rule.result.type === resultType);
    if (!allSameType) {
      keptViolations.push(...violations);
      continue;
    }

    switch (resultType) {
      case "minimum_required_value": {
        // Highest minimum wins
        const sorted = withRules.sort((a, b) => {
          const aMin = (a.rule.result as any).minimum;
          const bMin = (b.rule.result as any).minimum;
          return bMin - aMin; // descending
        });
        const winner = sorted[0];
        keptViolations.push(winner.result);
        for (let i = 1; i < sorted.length; i++) {
          sorted[i].result.outcome = "passed";
          sorted[i].result.supersededBy = winner.result.ruleId;
          sorted[i].result.explanation = `Superseded by ${winner.result.ruleId} (more restrictive: ${(winner.rule.result as any).minimum} ${(winner.rule.result as any).unit})`;
          superseded.push(sorted[i].result);
        }
        break;
      }

      case "required_break": {
        // Group by breakType, then longest minimumMinutes wins within each group
        const byBreakType = new Map<string, typeof withRules>();
        for (const wr of withRules) {
          const bt = (wr.rule.result as any).breakType;
          if (!byBreakType.has(bt)) byBreakType.set(bt, []);
          byBreakType.get(bt)!.push(wr);
        }
        for (const [_bt, group] of byBreakType) {
          if (group.length <= 1) {
            keptViolations.push(group[0].result);
            continue;
          }
          const sorted = group.sort((a, b) => {
            return (b.rule.result as any).minimumMinutes - (a.rule.result as any).minimumMinutes;
          });
          const winner = sorted[0];
          keptViolations.push(winner.result);
          for (let i = 1; i < sorted.length; i++) {
            sorted[i].result.outcome = "passed";
            sorted[i].result.supersededBy = winner.result.ruleId;
            sorted[i].result.explanation = `Superseded by ${winner.result.ruleId} (longer break: ${(winner.rule.result as any).minimumMinutes} min)`;
            superseded.push(sorted[i].result);
          }
        }
        break;
      }

      case "premium_required": {
        // Group by premiumType, then highest amount wins
        const byPremType = new Map<string, typeof withRules>();
        for (const wr of withRules) {
          const pt = (wr.rule.result as any).premiumType;
          if (!byPremType.has(pt)) byPremType.set(pt, []);
          byPremType.get(pt)!.push(wr);
        }
        for (const [_pt, group] of byPremType) {
          if (group.length <= 1) {
            keptViolations.push(group[0].result);
            continue;
          }
          // If any lack a numeric amount, keep all (formula-based can't be compared)
          const allHaveAmount = group.every(wr => (wr.rule.result as any).amount !== undefined);
          if (!allHaveAmount) {
            keptViolations.push(...group.map(g => g.result));
            continue;
          }
          const sorted = group.sort((a, b) => {
            return (b.rule.result as any).amount - (a.rule.result as any).amount;
          });
          const winner = sorted[0];
          keptViolations.push(winner.result);
          for (let i = 1; i < sorted.length; i++) {
            sorted[i].result.outcome = "passed";
            sorted[i].result.supersededBy = winner.result.ruleId;
            sorted[i].result.explanation = `Superseded by ${winner.result.ruleId} (higher premium: ${(winner.rule.result as any).amount})`;
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

  let met: boolean;
  switch (comp.op) {
    case "=":
      met = actual === comp.value; break;
    case "!=":
      met = actual !== comp.value; break;
    case ">":
      met = (actual as number) > (comp.value as number); break;
    case ">=":
      met = (actual as number) >= (comp.value as number); break;
    case "<":
      met = (actual as number) < (comp.value as number); break;
    case "<=":
      met = (actual as number) <= (comp.value as number); break;
    case "in":
      met = Array.isArray(comp.value) && (comp.value as Array<string | number>).includes(actual as string | number); break;
    case "not_in":
      met = Array.isArray(comp.value) && !(comp.value as Array<string | number>).includes(actual as string | number); break;
    default:
      met = false;
  }

  conditionDetails.push({ fact: comp.fact, op: comp.op, expected: comp.value, actual, met });
  return met;
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
