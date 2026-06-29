/**
 * Deterministic Rule System — Public API
 *
 * Entry point for the new TypeScript rule representation.
 * Import from here to evaluate rules or access the registry.
 *
 * Fault-tolerant: bad rules are logged and skipped. The server always starts.
 */

export { createRule, tryCreateRule, RuleValidationError } from "./createRule.js";
export { evaluateRule, evaluateRules } from "./evaluator.js";
export { getAllFacts, getFact, isKnownFact, getFactType } from "./facts.js";
export { validateCondition } from "./conditions.js";

export type {
  Rule,
  Condition,
  ComparisonCondition,
  AllCondition,
  AnyCondition,
  NotCondition,
  RuleResult,
  Scenario,
  EvaluationResult,
  EvaluationSummary,
  EvaluationOutcome,
  FactDefinition,
  FactType,
  Citation,
  RuleStatus,
} from "./types.js";

// ─── Rule Registry (fault-tolerant loading) ────────────────────────

import { federalOvertime } from "./examples/federalOvertime.js";
import { californiaDailyOvertime } from "./examples/californiaDailyOvertime.js";
import { californiaDoubleTime } from "./examples/californiaDoubleTime.js";
import { washingtonWeeklyOvertime } from "./examples/washingtonWeeklyOvertime.js";
import { federalMinimumWage } from "./examples/federalMinimumWage.js";
import {
  alaskaMinimumWage,
  californiaMinimumWage,
  californiaFastFoodMinimumWage,
  hawaiiMinimumWage,
  newMexicoMinimumWage,
  washingtonMinimumWage,
} from "./examples/stateMinimumWages.js";
import { ALL_LOCAL_MINIMUM_WAGES } from "./examples/localMinimumWages.js";
// Old predictiveScheduling.ts superseded by fairWorkweek.ts (more detailed penalty tiers)
import { ALL_MEAL_BREAK_RULES } from "./examples/californiaMealBreak.js";
import { ALL_MEAL_REST_BREAK_RULES } from "./examples/mealRestBreaks.js";
import { ALL_REPORTING_TIME_PAY_RULES } from "./examples/reportingTimePay.js";
import { ALL_SPREAD_AND_SPLIT_SHIFT_RULES } from "./examples/spreadAndSplitShift.js";
import { ALL_DAY_OF_REST_RULES } from "./examples/dayOfRest.js";
import { ALL_PRIORITY_STATE_MINIMUM_WAGES } from "./examples/priorityStateMinimumWages.js";
import { ALL_PRIORITY_TIPPED_WAGES } from "./examples/priorityStateTippedWages.js";
import { ALL_PRIORITY_STATE_OVERTIME } from "./examples/priorityStateOvertime.js";
import { ALL_FAIR_WORKWEEK_RULES } from "./examples/fairWorkweek.js";
import { federalFmla } from "./examples/federalFmla.js";
import { federalWarnAct } from "./examples/federalWarnAct.js";
import type { Rule } from "./types.js";

/**
 * All rule candidates. These have already passed createRule() validation
 * in their respective files. This array collects them for the registry.
 */
const ALL_RULE_CANDIDATES: Rule[] = [
  // Overtime
  federalOvertime,
  californiaDailyOvertime,
  californiaDoubleTime,
  washingtonWeeklyOvertime,

  // Minimum wage — federal
  federalMinimumWage,

  // Minimum wage — state
  alaskaMinimumWage,
  californiaMinimumWage,
  californiaFastFoodMinimumWage,
  hawaiiMinimumWage,
  newMexicoMinimumWage,
  washingtonMinimumWage,

  // Minimum wage — local
  ...ALL_LOCAL_MINIMUM_WAGES,

  // Minimum wage — priority states (NY, DC, VA, MD, NJ, CT, NV)
  ...ALL_PRIORITY_STATE_MINIMUM_WAGES,

  // Minimum wage — tipped & industry-specific (priority states)
  ...ALL_PRIORITY_TIPPED_WAGES,

  // Overtime — priority states
  ...ALL_PRIORITY_STATE_OVERTIME,

  // Fair Workweek / Predictive Scheduling — full penalty tiers
  ...ALL_FAIR_WORKWEEK_RULES,

  // Meal & rest breaks
  ...ALL_MEAL_BREAK_RULES,
  ...ALL_MEAL_REST_BREAK_RULES,
  ...ALL_REPORTING_TIME_PAY_RULES,
  ...ALL_SPREAD_AND_SPLIT_SHIFT_RULES,
  ...ALL_DAY_OF_REST_RULES,

  // Leave
  federalFmla,

  // Mass layoffs
  federalWarnAct,
];

/**
 * Load rules with fault tolerance.
 * Each rule is checked for basic integrity. Bad rules are logged and skipped.
 */
function loadRules(candidates: Rule[]): { rules: Rule[]; skipped: string[] } {
  const rules: Rule[] = [];
  const skipped: string[] = [];

  for (const rule of candidates) {
    try {
      // Basic integrity check — rule should already be validated by createRule()
      // but we guard against corrupted imports or future mistakes
      if (!rule || !rule.id || !rule.appliesWhen || !rule.result || !rule.citations?.length) {
        const id = rule?.id || "(unknown)";
        skipped.push(id);
        console.warn(`⚠ Skipped rule "${id}": missing required fields`);
        continue;
      }
      rules.push(rule);
    } catch (e: any) {
      const id = rule?.id || "(unknown)";
      skipped.push(id);
      console.warn(`⚠ Skipped rule "${id}": ${e.message}`);
    }
  }

  return { rules, skipped };
}

const { rules: LOADED_RULES, skipped: SKIPPED_RULES } = loadRules(ALL_RULE_CANDIDATES);

if (SKIPPED_RULES.length > 0) {
  console.warn(`\n⚠ ${SKIPPED_RULES.length} rule(s) skipped due to errors:`);
  for (const id of SKIPPED_RULES) {
    console.warn(`  - ${id}`);
  }
  console.warn("");
}

/**
 * All successfully loaded rules.
 */
export const RULES: readonly Rule[] = LOADED_RULES;

/**
 * IDs of rules that failed to load.
 */
export const SKIPPED: readonly string[] = SKIPPED_RULES;
