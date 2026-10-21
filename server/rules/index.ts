/**
 * Deterministic Rule System — Public API
 *
 * Entry point for the new TypeScript rule representation.
 * Import from here to evaluate rules or access the registry.
 *
 * Rules live in data/rules/*.json. Fault-tolerant: bad rules are logged and skipped.
 * The server always starts.
 */

export { createRule, tryCreateRule, RuleValidationError } from "./createRule.js";
export { evaluateRule, evaluateRules } from "./evaluator.js";
export { getAllFacts, getFact, isKnownFact, getFactType } from "./facts.js";
export { validateCondition } from "./conditions.js";
export { CITATION_KINDS } from "./types.js";

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
  CitationKind,
  RuleStatus,
} from "./types.js";

// ─── Rule Registry (loaded from data/rules/*.json) ─────────────────

import { loadRulesFromData } from "./loadRules.js";
import type { Rule } from "./types.js";
export type { SkippedRule, LoadResult } from "./loadRules.js";
export { loadRulesFromData } from "./loadRules.js";

const { rules: LOADED_RULES, skipped: SKIPPED_RULES } = loadRulesFromData();

if (SKIPPED_RULES.length > 0) {
  console.warn(`\n⚠ ${SKIPPED_RULES.length} rule(s) skipped due to errors:`);
  for (const s of SKIPPED_RULES) {
    console.warn(`  - ${s.id} (${s.file})`);
    for (const e of s.errors) console.warn(`      ${e.path}: ${e.message}`);
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
export const SKIPPED: readonly string[] = SKIPPED_RULES.map(s => s.id);

/**
 * Full detail for rules that failed to load.
 */
export const SKIPPED_DETAILS = SKIPPED_RULES;

/** Look up a loaded rule by id. */
export function getRule(id: string): Rule | undefined {
  return LOADED_RULES.find(r => r.id === id);
}
