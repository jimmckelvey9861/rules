/**
 * Jurisdictions — federal / state / territory / county / city / region records
 * loaded from data/jurisdictions.json.
 *
 * Rules carry a `ruleKey` string ("Federal", "CA", "New York City"). This
 * module resolves those to records with a stable id, a parent chain and
 * preemption flags.
 */

import { readJsonFile } from "./dataFiles.js";

export type JurisdictionType = "federal" | "state" | "district" | "territory" | "county" | "city" | "region";
export type PrecedenceMode = "floor" | "preempted" | "exclusive";

export interface Jurisdiction {
  id: string;
  ruleKey: string;
  name: string;
  type: JurisdictionType;
  parent: string | null;
  fips: string | null;
  agency?: string;
  /** topic (legacy string or taxonomy code) -> how this level treats lower levels */
  preemption?: Record<string, PrecedenceMode>;
  verified: boolean;
  note?: string;
}

export interface JurisdictionsFile {
  version: string;
  precedenceModes: Record<PrecedenceMode, string>;
  verificationSource: string;
  jurisdictions: Jurisdiction[];
}

export const JURISDICTIONS_FILE: JurisdictionsFile = readJsonFile<JurisdictionsFile>("jurisdictions.json");
export const JURISDICTIONS: readonly Jurisdiction[] = JURISDICTIONS_FILE.jurisdictions;

const BY_ID = new Map<string, Jurisdiction>();
const BY_RULE_KEY = new Map<string, Jurisdiction>();

for (const j of JURISDICTIONS) {
  if (BY_ID.has(j.id)) throw new Error(`Duplicate jurisdiction id: ${j.id}`);
  if (BY_RULE_KEY.has(j.ruleKey)) throw new Error(`Duplicate jurisdiction ruleKey: ${j.ruleKey}`);
  BY_ID.set(j.id, j);
  BY_RULE_KEY.set(j.ruleKey, j);
}
for (const j of JURISDICTIONS) {
  if (j.parent !== null && !BY_ID.has(j.parent)) throw new Error(`Jurisdiction ${j.id} has unknown parent ${j.parent}`);
}

export function getJurisdiction(id: string): Jurisdiction | undefined {
  return BY_ID.get(id);
}

/** Resolve the string a rule carries in its `jurisdiction` field. */
export function resolveJurisdiction(ruleKey: string): Jurisdiction | undefined {
  return BY_RULE_KEY.get(ruleKey);
}

export function isKnownJurisdiction(ruleKey: string): boolean {
  return BY_RULE_KEY.has(ruleKey);
}

/** The jurisdiction and all its ancestors, nearest first (city, state, federal). */
export function getJurisdictionChain(idOrRuleKey: string): Jurisdiction[] {
  let current = BY_ID.get(idOrRuleKey) ?? BY_RULE_KEY.get(idOrRuleKey);
  const chain: Jurisdiction[] = [];
  while (current) {
    chain.push(current);
    current = current.parent === null ? undefined : BY_ID.get(current.parent);
  }
  return chain;
}

/**
 * If any ancestor of this jurisdiction preempts the topic, return that ancestor.
 * A local rule on a preempted topic is invalid and should be rejected.
 */
export function findPreemptingAncestor(ruleKey: string, topic: string): Jurisdiction | undefined {
  const [self, ...ancestors] = getJurisdictionChain(ruleKey);
  if (!self || !LOCAL_ORDINANCE_TYPES.has(self.type)) return undefined;
  return ancestors.find(a => a.preemption?.[topic] === "preempted");
}

/**
 * Only jurisdictions that pass their own ordinances can be preempted.
 * A "region" (e.g. the Portland metro tier of Oregon's minimum wage) is
 * defined by state law itself, so state preemption never applies to it.
 */
const LOCAL_ORDINANCE_TYPES: ReadonlySet<JurisdictionType> = new Set(["county", "city"]);

/** Jurisdictions of a given type, in file order. */
export function getJurisdictionsByType(type: JurisdictionType): Jurisdiction[] {
  return JURISDICTIONS.filter(j => j.type === type);
}
