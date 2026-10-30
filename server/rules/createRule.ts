/**
 * createRule() — Rule Factory with Validation
 *
 * Validates rule definitions at startup. Rejects:
 * - Unknown facts
 * - Invalid operators
 * - Invalid value types
 * - Missing id, effective date, or citation
 * - Results whose obligation is not in the vocabulary, or whose params do not match it
 * - Vague values like "varies", "unknown", "depends", null in logic fields
 */

import { CITATION_KINDS, RESULT_TYPES, type Rule } from "./types.js";
import { validateCondition, type ValidationError } from "./conditions.js";
import { getObligation, validateObligationParams } from "../reference/vocabulary.js";

/** Vague values that must not appear in string fields */
const VAGUE_STRINGS = new Set(["varies", "unknown", "depends", "tbd", "n/a", ""]);

/** ISO date pattern: YYYY-MM-DD */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class RuleValidationError extends Error {
  public errors: ValidationError[];

  constructor(ruleId: string, errors: ValidationError[]) {
    const summary = errors.map(e => `  ${e.path}: ${e.message}`).join("\n");
    super(`Rule "${ruleId}" failed validation:\n${summary}`);
    this.name = "RuleValidationError";
    this.errors = errors;
  }
}

/**
 * Validation result returned by tryCreateRule().
 */
export interface CreateRuleResult {
  rule: Rule | null;
  errors: ValidationError[];
}

/**
 * Create and validate a rule. Returns { rule, errors } without throwing.
 * If validation fails, rule is null and errors describes what's wrong.
 * The server can skip bad rules and keep running.
 */
export function tryCreateRule(definition: Rule): CreateRuleResult {
  const errors = validateRuleDefinition(definition);
  if (errors.length > 0) {
    return { rule: null, errors };
  }
  return { rule: Object.freeze({ ...definition }), errors: [] };
}

/**
 * Create and validate a rule. Throws RuleValidationError if invalid.
 * Use this in tests or when you want strict failure.
 */
export function createRule(definition: Rule): Rule {
  const errors = validateRuleDefinition(definition);

  // ─── Throw if any errors ─────────────────────────────────────────
  if (errors.length > 0) {
    throw new RuleValidationError(definition.id || "(no id)", errors);
  }

  return Object.freeze({ ...definition });
}

/**
 * Core validation logic — shared by createRule() and tryCreateRule().
 */
function validateRuleDefinition(definition: Rule): ValidationError[] {
  const errors: ValidationError[] = [];

  // ─── Required fields ─────────────────────────────────────────────
  if (!definition.id || typeof definition.id !== "string" || definition.id.trim() === "") {
    errors.push({ path: "id", message: "id is required and must be a non-empty string" });
  }

  if (!definition.title || typeof definition.title !== "string" || definition.title.trim() === "") {
    errors.push({ path: "title", message: "title is required and must be a non-empty string" });
  }

  if (!definition.jurisdiction || typeof definition.jurisdiction !== "string") {
    errors.push({ path: "jurisdiction", message: "jurisdiction is required" });
  }

  if (!definition.topic || typeof definition.topic !== "string") {
    errors.push({ path: "topic", message: "topic is required" });
  }

  // ─── Effective date ──────────────────────────────────────────────
  if (!definition.effectiveFrom) {
    errors.push({ path: "effectiveFrom", message: "effectiveFrom is required" });
  } else if (!ISO_DATE_RE.test(definition.effectiveFrom)) {
    errors.push({ path: "effectiveFrom", message: `effectiveFrom must be ISO date (YYYY-MM-DD), got "${definition.effectiveFrom}"` });
  }

  if (definition.effectiveTo !== undefined) {
    if (!ISO_DATE_RE.test(definition.effectiveTo)) {
      errors.push({ path: "effectiveTo", message: `effectiveTo must be ISO date (YYYY-MM-DD), got "${definition.effectiveTo}"` });
    } else if (ISO_DATE_RE.test(definition.effectiveFrom ?? "") && definition.effectiveTo < definition.effectiveFrom) {
      errors.push({ path: "effectiveTo", message: `effectiveTo (${definition.effectiveTo}) is before effectiveFrom (${definition.effectiveFrom})` });
    }
  }

  if (definition.supersedes !== undefined) {
    if (typeof definition.supersedes !== "string" || definition.supersedes.trim() === "") {
      errors.push({ path: "supersedes", message: "supersedes must be the id of the rule this one replaces" });
    } else if (definition.supersedes === definition.id) {
      errors.push({ path: "supersedes", message: "a rule cannot supersede itself" });
    }
  }

  // ─── Citations ───────────────────────────────────────────────────
  if (!definition.citations || !Array.isArray(definition.citations) || definition.citations.length === 0) {
    errors.push({ path: "citations", message: "At least one citation is required" });
  } else {
    for (let i = 0; i < definition.citations.length; i++) {
      const c = definition.citations[i];
      if (!c.source || typeof c.source !== "string" || c.source.trim() === "") {
        errors.push({ path: `citations[${i}].source`, message: "citation source is required" });
      }
      if (typeof c.source === "string" && VAGUE_STRINGS.has(c.source.toLowerCase())) {
        errors.push({ path: `citations[${i}].source`, message: `Vague citation source: "${c.source}"` });
      }
      if (c.kind !== undefined && !CITATION_KINDS.includes(c.kind)) {
        errors.push({ path: `citations[${i}].kind`, message: `kind must be one of: ${CITATION_KINDS.join(", ")}` });
      }
      if (c.url !== undefined && !/^https?:\/\/\S+$/.test(c.url)) {
        errors.push({ path: `citations[${i}].url`, message: `url must be an absolute http(s) URL, got "${c.url}"` });
      }
    }
  }

  // ─── Status ──────────────────────────────────────────────────────
  const validStatuses = ["active", "draft", "repealed", "pending"];
  if (!definition.status || !validStatuses.includes(definition.status)) {
    errors.push({ path: "status", message: `status must be one of: ${validStatuses.join(", ")}` });
  }

  // ─── Vague string checks on key fields ───────────────────────────
  if (typeof definition.jurisdiction === "string" && VAGUE_STRINGS.has(definition.jurisdiction.toLowerCase())) {
    errors.push({ path: "jurisdiction", message: `Vague jurisdiction: "${definition.jurisdiction}"` });
  }
  if (typeof definition.topic === "string" && VAGUE_STRINGS.has(definition.topic.toLowerCase())) {
    errors.push({ path: "topic", message: `Vague topic: "${definition.topic}"` });
  }

  // ─── Condition validation ────────────────────────────────────────
  if (!definition.appliesWhen) {
    errors.push({ path: "appliesWhen", message: "appliesWhen condition is required" });
  } else {
    errors.push(...validateCondition(definition.appliesWhen));
  }

  // ─── Result validation ───────────────────────────────────────────
  if (!definition.result) {
    errors.push({ path: "result", message: "result is required" });
  } else {
    validateResult(definition.result, errors);
  }

  return errors;
}

function validateResult(result: Rule["result"], errors: ValidationError[]): void {
  if (!result.type || !RESULT_TYPES.includes(result.type)) {
    errors.push({ path: "result.type", message: `type must be one of: ${RESULT_TYPES.join(", ")}` });
  }
  if (!result.obligation || typeof result.obligation !== "string") {
    errors.push({ path: "result.obligation", message: "obligation is required (a code from data/result-vocabulary.json)" });
    return;
  }
  const obligation = getObligation(result.obligation);
  if (!obligation) {
    errors.push({ path: "result.obligation", message: `Unknown obligation "${result.obligation}"` });
    return;
  }
  if (result.type && !obligation.behaviors.includes(result.type)) {
    errors.push({ path: "result.type", message: `${result.obligation} may not use behaviour "${result.type}" (allowed: ${obligation.behaviors.join(", ")})` });
  }
  if (!result.params || typeof result.params !== "object" || Array.isArray(result.params)) {
    errors.push({ path: "result.params", message: "params must be an object (use {} when the obligation has no parameters)" });
  } else {
    errors.push(...validateObligationParams(result.obligation, result.params));
  }
  if (!result.summary || typeof result.summary !== "string" || result.summary.trim() === "") {
    errors.push({ path: "result.summary", message: "summary is required" });
  } else if (VAGUE_STRINGS.has(result.summary.trim().toLowerCase())) {
    errors.push({ path: "result.summary", message: `Vague summary: "${result.summary}"` });
  }
  // Behaviour-specific requirements the evaluator relies on.
  if (result.type === "minimum_required_value") {
    if (!obligation.targetFact) {
      errors.push({ path: "result.type", message: `${result.obligation} has no targetFact, so it cannot use minimum_required_value` });
    }
    if (!obligation.compareParam || typeof result.params?.[obligation.compareParam] !== "number") {
      errors.push({ path: `result.params.${obligation.compareParam ?? "?"}`, message: "minimum_required_value needs a numeric compare parameter" });
    }
  }
  if (result.type === "required_break" && typeof result.params?.minimum_minutes !== "number") {
    errors.push({ path: "result.params.minimum_minutes", message: "required_break needs minimum_minutes" });
  }
}
