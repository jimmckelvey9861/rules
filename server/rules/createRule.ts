/**
 * createRule() — Rule Factory with Validation
 *
 * Validates rule definitions at startup. Rejects:
 * - Unknown facts
 * - Invalid operators
 * - Invalid value types
 * - Missing id, effective date, or citation
 * - Vague values like "varies", "unknown", "depends", null in logic fields
 */

import type { Rule } from "./types.js";
import { validateCondition, type ValidationError } from "./conditions.js";

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
  switch (result.type) {
    case "minimum_required_value":
      if (typeof result.minimum !== "number") {
        errors.push({ path: "result.minimum", message: "minimum must be a number" });
      }
      if (!result.unit || typeof result.unit !== "string") {
        errors.push({ path: "result.unit", message: "unit is required" });
      }
      if (!result.targetFact || typeof result.targetFact !== "string") {
        errors.push({ path: "result.targetFact", message: "targetFact is required" });
      }
      break;
    case "required_break":
      if (!result.breakType || typeof result.breakType !== "string") {
        errors.push({ path: "result.breakType", message: "breakType is required" });
      }
      if (typeof result.minimumMinutes !== "number" || result.minimumMinutes <= 0) {
        errors.push({ path: "result.minimumMinutes", message: "minimumMinutes must be a positive number" });
      }
      break;
    case "premium_required":
      if (!result.premiumType || typeof result.premiumType !== "string") {
        errors.push({ path: "result.premiumType", message: "premiumType is required" });
      }
      if (result.amount === undefined && result.formula === undefined) {
        errors.push({ path: "result", message: "premium_required must have either amount or formula" });
      }
      break;
    case "prohibition":
      if (!result.prohibitedAction || typeof result.prohibitedAction !== "string") {
        errors.push({ path: "result.prohibitedAction", message: "prohibitedAction is required" });
      }
      break;
    case "warning":
      if (!result.message || typeof result.message !== "string") {
        errors.push({ path: "result.message", message: "message is required" });
      }
      break;
    default:
      errors.push({ path: "result.type", message: `Unknown result type: "${(result as any).type}"` });
  }
}
