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
import { federalMinimumWage } from "./examples/federalMinimumWage.js";
import type { Rule } from "./types.js";

/**
 * All registered TypeScript rules.
 * Add new rules here as they are migrated.
 */
export const RULES: readonly Rule[] = [
  federalOvertime,
  californiaDailyOvertime,
  federalMinimumWage,
];
