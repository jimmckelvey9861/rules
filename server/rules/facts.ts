/**
 * Fact Registry — Applicability Variables Taxonomy
 *
 * The canonical vocabulary of facts a rule's appliesWhen may test lives in
 * data/facts.json (see data/schema/facts-file.schema.json). This module loads
 * and indexes it: lookup by path, type checks for the condition validator,
 * enum values, and resolution of a person's term (path or synonym) to a fact.
 *
 * Design principles (kept from the original TypeScript registry):
 * - Facts are observable inputs, not derived values; derived recipes live in
 *   server/scheduler/derivedFacts.ts.
 * - Enums over free text for bounded domains.
 * - One namespace per entity (business merged into employer).
 * - Scoped employee counts are separate facts (global vs state vs city vs location).
 */

import type { FactDefinition, FactType } from "./types.js";
import { readJsonFile } from "../reference/dataFiles.js";

export interface FactCategory {
  id: string;
  name: string;
}

export interface FactsFile {
  version: string;
  categories: FactCategory[];
  facts: FactDefinition[];
}

export const FACTS_FILE: FactsFile = readJsonFile<FactsFile>("facts.json");

const FACTS: readonly FactDefinition[] = FACTS_FILE.facts;

/** Map from fact path to definition for O(1) lookup */
const FACT_MAP = new Map<string, FactDefinition>();
/** Lower-cased synonym (and path) -> definition */
const BY_TERM = new Map<string, FactDefinition>();

for (const f of FACTS) {
  if (FACT_MAP.has(f.path)) throw new Error(`Duplicate fact path in data/facts.json: ${f.path}`);
  if (f.type === "enum" && !(f.enumValues && f.enumValues.length > 0)) throw new Error(`Enum fact ${f.path} has no enumValues`);
  FACT_MAP.set(f.path, f);
  BY_TERM.set(f.path.toLowerCase(), f);
}
for (const f of FACTS) {
  for (const s of f.synonyms ?? []) {
    const key = s.toLowerCase();
    const existing = BY_TERM.get(key);
    if (existing && existing.path !== f.path) throw new Error(`Fact synonym "${s}" is claimed by both ${existing.path} and ${f.path}`);
    BY_TERM.set(key, f);
  }
}

/**
 * Get a fact definition by path. Returns undefined if unknown.
 */
export function getFact(path: string): FactDefinition | undefined {
  return FACT_MAP.get(path);
}

/**
 * Check if a fact path is registered.
 */
export function isKnownFact(path: string): boolean {
  return FACT_MAP.has(path);
}

/**
 * Get the type of a registered fact.
 */
export function getFactType(path: string): FactType | undefined {
  return FACT_MAP.get(path)?.type;
}

/**
 * Get all registered fact definitions, in registry order.
 */
export function getAllFacts(): readonly FactDefinition[] {
  return FACTS;
}

/**
 * Get all canonical (non-deprecated) fact definitions.
 */
export function getCanonicalFacts(): readonly FactDefinition[] {
  return FACTS.filter(f => !f.deprecated);
}

/**
 * Get enum values for a fact (if it's an enum type).
 */
export function getEnumValues(path: string): string[] | undefined {
  const fact = FACT_MAP.get(path);
  if (fact?.type === "enum") return fact.enumValues;
  return undefined;
}

/**
 * Resolve a person's term to a fact: an exact path, or any registered synonym,
 * case-insensitively. Returns undefined when nothing matches.
 */
export function resolveFact(term: string): FactDefinition | undefined {
  return BY_TERM.get(term.trim().toLowerCase());
}

/** The fact categories in display order. */
export function getFactCategories(): readonly FactCategory[] {
  return FACTS_FILE.categories;
}
