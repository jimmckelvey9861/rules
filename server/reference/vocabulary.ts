/**
 * Result vocabulary — the registry of obligation types, loaded from
 * data/result-vocabulary.json.
 *
 * A rule's result names one obligation (e.g. "break.meal") and supplies that
 * obligation's typed parameters. The vocabulary says which engine behaviours
 * the obligation may use, what Kronto should do when it fires, which parameter
 * decides "most protective" when several rules of the same obligation apply,
 * and (for minimum_required_value behaviours) which scenario fact is compared.
 */

import { readJsonFile } from "./dataFiles.js";

export type ResultBehavior = "minimum_required_value" | "required_break" | "premium_required" | "prohibition" | "warning";
export type KrontoAction = "block" | "premium" | "inform";
export type ParamType = "number" | "boolean" | "string" | "enum";

export interface ObligationParam {
  name: string;
  type: ParamType;
  unit?: string;
  values?: string[];
  required: boolean;
  description: string;
}

export interface Obligation {
  code: string;
  name: string;
  description: string;
  behaviors: ResultBehavior[];
  kronto: KrontoAction;
  targetFact?: string;
  compareParam?: string;
  params: ObligationParam[];
  synonyms: string[];
}

export interface VocabularyFile {
  version: string;
  units: Record<string, string>;
  obligations: Obligation[];
}

export const VOCABULARY: VocabularyFile = readJsonFile<VocabularyFile>("result-vocabulary.json");

const BY_CODE = new Map<string, Obligation>(VOCABULARY.obligations.map(o => [o.code, o]));
const BY_SYNONYM = new Map<string, Obligation>();
for (const o of VOCABULARY.obligations) {
  BY_SYNONYM.set(o.name.toLowerCase(), o);
  for (const s of o.synonyms) BY_SYNONYM.set(s.toLowerCase(), o);
}

export function getObligation(code: string): Obligation | undefined {
  return BY_CODE.get(code);
}

export function isKnownObligation(code: string): boolean {
  return BY_CODE.has(code);
}

export function getAllObligations(): readonly Obligation[] {
  return VOCABULARY.obligations;
}

/** Find an obligation by its code, name or one of its synonyms (case-insensitive). */
export function resolveObligation(term: string): Obligation | undefined {
  return BY_CODE.get(term) ?? BY_SYNONYM.get(term.trim().toLowerCase());
}

/** Human-readable unit label for a parameter, e.g. "minutes" -> "Minutes". */
export function describeUnit(unit: string | undefined): string | undefined {
  return unit ? VOCABULARY.units[unit] ?? unit : undefined;
}

export interface ParamError {
  path: string;
  message: string;
}

/**
 * Check a result's params against its obligation: every param is declared,
 * has the declared type (and enum value), and every required param is present.
 */
export function validateObligationParams(code: string, params: Record<string, unknown> | undefined): ParamError[] {
  const errors: ParamError[] = [];
  const ob = BY_CODE.get(code);
  if (!ob) {
    errors.push({ path: "result.obligation", message: `Unknown obligation "${code}"` });
    return errors;
  }
  const given = params ?? {};
  const declared = new Map(ob.params.map(p => [p.name, p]));
  for (const [name, value] of Object.entries(given)) {
    const spec = declared.get(name);
    if (!spec) {
      errors.push({ path: `result.params.${name}`, message: `"${name}" is not a parameter of ${code}` });
      continue;
    }
    const ok =
      spec.type === "number" ? typeof value === "number" && Number.isFinite(value) :
      spec.type === "boolean" ? typeof value === "boolean" :
      spec.type === "enum" ? typeof value === "string" && (spec.values ?? []).includes(value) :
      typeof value === "string";
    if (!ok) {
      const expected = spec.type === "enum" ? `one of ${(spec.values ?? []).join(", ")}` : spec.type;
      errors.push({ path: `result.params.${name}`, message: `expected ${expected}, got ${JSON.stringify(value)}` });
    }
  }
  for (const spec of ob.params) {
    if (spec.required && !(spec.name in given)) {
      errors.push({ path: `result.params.${spec.name}`, message: `"${spec.name}" is required for ${code}` });
    }
  }
  return errors;
}
