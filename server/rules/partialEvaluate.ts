/**
 * Partial Condition Evaluation
 *
 * Evaluates a condition tree against a scenario that is only partly known
 * (for example a business profile: location and employer facts, but no
 * employee or shift). Each node resolves to true, false or "open". An open
 * node is returned as a residual condition containing only the parts that
 * still need facts, so an applicability pass can strip the business-level
 * conditions off a rule and hand the rest to the scheduler.
 *
 * Pure functions, no side effects.
 */

import type { Condition, ComparisonCondition, ComparisonOp, Scenario } from "./types.js";

export type TriState = true | false | "open";

export interface PartialResult {
  state: TriState;
  /** The part of the condition that still depends on unknown facts (only when state is "open") */
  residual: Condition | null;
  /** Facts that were present in the scenario and decided part of the tree */
  satisfiedBy: string[];
  /** Facts the residual still needs */
  openFacts: string[];
}

/** A condition that is always true: an empty conjunction. */
export const ALWAYS: Condition = { all: [] };

/**
 * Compare a known value against a condition's expected value. Shared with the
 * full evaluator so the two never disagree.
 */
export function compare(op: ComparisonOp, actual: unknown, expected: unknown): boolean {
  switch (op) {
    case "=": return actual === expected;
    case "!=": return actual !== expected;
    case ">": return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case ">=": return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "<": return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "<=": return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in": return Array.isArray(expected) && (expected as unknown[]).includes(actual);
    case "not_in": return Array.isArray(expected) && !(expected as unknown[]).includes(actual);
    default: return false;
  }
}

export function evaluatePartial(condition: Condition, known: Partial<Scenario>): PartialResult {
  const satisfiedBy = new Set<string>();
  const openFacts = new Set<string>();
  const { state, residual } = walk(condition, known, satisfiedBy, openFacts);
  return { state, residual, satisfiedBy: [...satisfiedBy].sort(), openFacts: [...openFacts].sort() };
}

function walk(
  condition: Condition,
  known: Partial<Scenario>,
  satisfiedBy: Set<string>,
  openFacts: Set<string>,
): { state: TriState; residual: Condition | null } {
  if ("all" in condition) {
    const opens: Condition[] = [];
    for (const child of condition.all) {
      const r = walk(child, known, satisfiedBy, openFacts);
      if (r.state === false) return { state: false, residual: null };
      if (r.state === "open" && r.residual) opens.push(r.residual);
    }
    if (opens.length === 0) return { state: true, residual: null };
    return { state: "open", residual: opens.length === 1 ? opens[0] : { all: opens } };
  }

  if ("any" in condition) {
    const opens: Condition[] = [];
    for (const child of condition.any) {
      const r = walk(child, known, satisfiedBy, openFacts);
      if (r.state === true) return { state: true, residual: null };
      if (r.state === "open" && r.residual) opens.push(r.residual);
    }
    if (opens.length === 0) return { state: false, residual: null };
    return { state: "open", residual: opens.length === 1 ? opens[0] : { any: opens } };
  }

  if ("not" in condition) {
    const r = walk(condition.not, known, satisfiedBy, openFacts);
    if (r.state === true) return { state: false, residual: null };
    if (r.state === false) return { state: true, residual: null };
    return { state: "open", residual: { not: r.residual! } };
  }

  const comp = condition as ComparisonCondition;
  if (!(comp.fact in known) || known[comp.fact] === undefined) {
    openFacts.add(comp.fact);
    return { state: "open", residual: comp };
  }
  satisfiedBy.add(comp.fact);
  return { state: compare(comp.op, known[comp.fact], comp.value), residual: null };
}

/** Collect every fact path referenced in a condition tree. */
export function factsIn(condition: Condition, out: Set<string> = new Set()): Set<string> {
  if ("all" in condition) condition.all.forEach(c => factsIn(c, out));
  else if ("any" in condition) condition.any.forEach(c => factsIn(c, out));
  else if ("not" in condition) factsIn(condition.not, out);
  else out.add((condition as ComparisonCondition).fact);
  return out;
}
