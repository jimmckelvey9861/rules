/**
 * Deterministic Rule System — Public API
 *
 * Entry point for the new TypeScript rule representation.
 * Import from here to evaluate rules or access the registry.
 */

export { createRule, RuleValidationError } from "./createRule.js";
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

// ─── Rule Registry ─────────────────────────────────────────────────

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
import type { Rule } from "./types.js";

/**
 * All registered TypeScript rules.
 * Add new rules here as they are migrated.
 */
export const RULES: readonly Rule[] = [
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
];
