/**
 * Condition Validation
 *
 * Validates that condition trees reference known facts,
 * use valid operators for the fact type, and have valid values.
 */

import type { Condition, ComparisonCondition, ComparisonOp, FactType } from "./types.js";
import { isKnownFact, getFactType, getEnumValues } from "./facts.js";

/** Operators valid for each fact type */
const VALID_OPS: Record<FactType, Set<ComparisonOp>> = {
  string:  new Set(["=", "!=", "in", "not_in"]),
  enum:    new Set(["=", "!=", "in", "not_in"]),
  number:  new Set(["=", "!=", ">", ">=", "<", "<=", "in", "not_in"]),
  money:   new Set(["=", "!=", ">", ">=", "<", "<=", "in", "not_in"]),
  boolean: new Set(["=", "!="]),
  date:    new Set(["=", "!=", ">", ">=", "<", "<="]),
};

/** Values that indicate vagueness — rejected at creation time */
const VAGUE_VALUES = new Set(["varies", "unknown", "depends", "tbd", "n/a"]);

export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validate a condition tree. Returns an array of errors (empty = valid).
 */
export function validateCondition(condition: Condition, path = "appliesWhen"): ValidationError[] {
  const errors: ValidationError[] = [];

  if ("all" in condition) {
    if (!Array.isArray(condition.all) || condition.all.length === 0) {
      errors.push({ path, message: `"all" must be a non-empty array` });
    } else {
      for (let i = 0; i < condition.all.length; i++) {
        errors.push(...validateCondition(condition.all[i], `${path}.all[${i}]`));
      }
    }
    return errors;
  }

  if ("any" in condition) {
    if (!Array.isArray(condition.any) || condition.any.length === 0) {
      errors.push({ path, message: `"any" must be a non-empty array` });
    } else {
      for (let i = 0; i < condition.any.length; i++) {
        errors.push(...validateCondition(condition.any[i], `${path}.any[${i}]`));
      }
    }
    return errors;
  }

  if ("not" in condition) {
    errors.push(...validateCondition(condition.not, `${path}.not`));
    return errors;
  }

  // ComparisonCondition
  const comp = condition as ComparisonCondition;
  validateComparison(comp, path, errors);
  return errors;
}

function validateComparison(comp: ComparisonCondition, path: string, errors: ValidationError[]): void {
  // Check fact is known
  if (!isKnownFact(comp.fact)) {
    errors.push({ path, message: `Unknown fact: "${comp.fact}"` });
    return;
  }

  const factType = getFactType(comp.fact)!;

  // Check operator is valid for this fact type
  if (!VALID_OPS[factType].has(comp.op)) {
    errors.push({ path, message: `Operator "${comp.op}" is not valid for fact "${comp.fact}" (type: ${factType})` });
    return;
  }

  // Check value is not null/undefined
  if (comp.value === null || comp.value === undefined) {
    errors.push({ path, message: `Value cannot be null or undefined for fact "${comp.fact}"` });
    return;
  }

  // Check for vague string values
  if (typeof comp.value === "string" && VAGUE_VALUES.has(comp.value.toLowerCase())) {
    errors.push({ path, message: `Vague value "${comp.value}" is not allowed for fact "${comp.fact}"` });
    return;
  }

  // Type-specific value validation
  if (comp.op === "in" || comp.op === "not_in") {
    if (!Array.isArray(comp.value)) {
      errors.push({ path, message: `Operator "${comp.op}" requires an array value` });
      return;
    }
    // Validate each element in the array
    for (const item of comp.value) {
      if (typeof item === "string" && VAGUE_VALUES.has(item.toLowerCase())) {
        errors.push({ path, message: `Vague value "${item}" in array is not allowed` });
      }
    }
    return;
  }

  // Scalar value type checks
  switch (factType) {
    case "number":
    case "money":
      if (typeof comp.value !== "number") {
        errors.push({ path, message: `Fact "${comp.fact}" (type: ${factType}) requires a numeric value, got ${typeof comp.value}` });
      }
      break;
    case "boolean":
      if (typeof comp.value !== "boolean") {
        errors.push({ path, message: `Fact "${comp.fact}" (type: boolean) requires a boolean value, got ${typeof comp.value}` });
      }
      break;
    case "string":
    case "date":
      if (typeof comp.value !== "string") {
        errors.push({ path, message: `Fact "${comp.fact}" (type: ${factType}) requires a string value, got ${typeof comp.value}` });
      }
      break;
    case "enum": {
      if (typeof comp.value !== "string") {
        errors.push({ path, message: `Fact "${comp.fact}" (type: enum) requires a string value, got ${typeof comp.value}` });
        break;
      }
      const allowed = getEnumValues(comp.fact);
      if (allowed && !allowed.includes(comp.value)) {
        errors.push({ path, message: `Value "${comp.value}" is not a valid enum value for "${comp.fact}". Allowed: ${allowed.join(", ")}` });
      }
      break;
    }
  }
}
