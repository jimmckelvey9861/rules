/**
 * Engine A — Applicability
 *
 * Given one location's business-level facts, decide which rules can apply
 * there and emit a rule pack for the scheduler. Business conditions that the
 * profile already answers are stripped from each rule; what remains is the
 * employee, shift, schedule and leave logic the scheduler tests per shift
 * with the shared evaluator.
 */

import { createHash } from "node:crypto";
import { RULES } from "../rules/index.js";
import type { Rule } from "../rules/types.js";
import { getFact, isKnownFact } from "../rules/facts.js";
import { ALWAYS, evaluatePartial } from "../rules/partialEvaluate.js";
import { resolveTopic, getEnforcementTarget } from "../reference/taxonomy.js";
import { resolveJurisdiction, getJurisdictionChain } from "../reference/jurisdictions.js";
import { VOCABULARY, getObligation } from "../reference/vocabulary.js";
import { DERIVED_FACTS } from "../scheduler/derivedFacts.js";
import type { BusinessFacts, BusinessProfile, LocationProfile, PackFact, PackRule, RulePack } from "./types.js";

/** Fact namespaces a business profile may set. Everything else is decided per employee or per shift. */
export const BUSINESS_FACT_PREFIXES = ["location.", "employer."] as const;

export function isBusinessFact(path: string): boolean {
  return BUSINESS_FACT_PREFIXES.some(p => path.startsWith(p));
}

export interface ProfileError {
  path: string;
  message: string;
}

/** Check that every fact in a profile is registered and business-level. */
export function validateBusinessFacts(facts: BusinessFacts, path = "facts"): ProfileError[] {
  const errors: ProfileError[] = [];
  for (const [key, value] of Object.entries(facts)) {
    if (!isKnownFact(key)) errors.push({ path: `${path}.${key}`, message: `Unknown fact "${key}"` });
    else if (!isBusinessFact(key)) errors.push({ path: `${path}.${key}`, message: `"${key}" is not a business-level fact (location.* or employer.*)` });
    const type = getFact(key)?.type;
    if (type && !valueMatches(type, value)) errors.push({ path: `${path}.${key}`, message: `expected ${type}, got ${JSON.stringify(value)}` });
  }
  return errors;
}

function valueMatches(type: string, value: unknown): boolean {
  switch (type) {
    case "number": case "money": return typeof value === "number";
    case "boolean": return typeof value === "boolean";
    default: return typeof value === "string";
  }
}

export function validateBusinessProfile(profile: BusinessProfile): ProfileError[] {
  const errors: ProfileError[] = [];
  if (!profile || typeof profile.name !== "string" || !profile.name.trim()) errors.push({ path: "name", message: "name is required" });
  if (!profile?.employer || typeof profile.employer !== "object") errors.push({ path: "employer", message: "employer facts are required (use {} for none)" });
  else errors.push(...validateBusinessFacts(profile.employer, "employer"));
  if (!Array.isArray(profile?.locations) || profile.locations.length === 0) errors.push({ path: "locations", message: "at least one location is required" });
  else {
    profile.locations.forEach((loc, i) => {
      if (!loc.id) errors.push({ path: `locations[${i}].id`, message: "id is required" });
      if (!loc.facts || typeof loc.facts !== "object") errors.push({ path: `locations[${i}].facts`, message: "facts are required" });
      else {
        errors.push(...validateBusinessFacts(loc.facts, `locations[${i}].facts`));
        if (typeof loc.facts["location.state"] !== "string") errors.push({ path: `locations[${i}].facts.location.state`, message: "location.state is required" });
      }
    });
  }
  return errors;
}

const RULES_VERSION = createHash("sha256").update(JSON.stringify(RULES)).digest("hex").slice(0, 16);

export interface BuildOptions {
  /** ISO date the pack is built for; rules that expired before it are left out. Defaults to today. */
  asOf?: string;
  rules?: readonly Rule[];
}

/** Resolve the most specific jurisdiction the location's facts name: city, then county, then state. */
function locationJurisdictionKey(facts: BusinessFacts): string | undefined {
  const city = facts["location.city"];
  if (typeof city === "string" && resolveJurisdiction(city)) return city;
  const county = facts["location.county"];
  if (typeof county === "string" && resolveJurisdiction(county)) return county;
  const state = facts["location.state"];
  return typeof state === "string" ? state : undefined;
}

export function buildRulePack(business: BusinessProfile, location: LocationProfile, options: BuildOptions = {}): RulePack {
  const asOf = options.asOf ?? new Date().toISOString().slice(0, 10);
  const source = options.rules ?? RULES;
  const facts: BusinessFacts = { ...business.employer, ...location.facts };

  const rules: PackRule[] = [];
  const stats = { rulesConsidered: source.length, rulesIncluded: 0, excludedByProfile: 0, excludedExpired: 0, excludedInactive: 0, fullyResolved: 0 };

  for (const rule of source) {
    if (rule.status !== "active") { stats.excludedInactive++; continue; }
    if (rule.effectiveTo && rule.effectiveTo < asOf) { stats.excludedExpired++; continue; }
    const partial = evaluatePartial(rule.appliesWhen, facts);
    if (partial.state === false) { stats.excludedByProfile++; continue; }
    if (partial.state === true) stats.fullyResolved++;

    const topic = resolveTopic(rule.topic);
    const jurisdiction = resolveJurisdiction(rule.jurisdiction);
    const obligation = getObligation(rule.result.obligation);
    rules.push({
      id: rule.id,
      title: rule.title,
      jurisdiction: rule.jurisdiction,
      jurisdictionId: jurisdiction?.id ?? rule.jurisdiction,
      jurisdictionType: jurisdiction?.type ?? "state",
      topic: rule.topic,
      topicCode: topic?.code ?? rule.topic,
      enforcement: getEnforcementTarget(rule.topic) ?? "informational",
      status: rule.status,
      effectiveFrom: rule.effectiveFrom,
      ...(rule.effectiveTo ? { effectiveTo: rule.effectiveTo } : {}),
      appliesWhen: partial.residual ?? ALWAYS,
      satisfiedBy: partial.satisfiedBy,
      factsNeeded: partial.openFacts,
      result: { ...rule.result, kronto: obligation?.kronto ?? "inform" },
      citations: rule.citations,
    });
  }
  stats.rulesIncluded = rules.length;

  const obligationCodes = [...new Set(rules.map(r => r.result.obligation))].sort();
  const factPaths = [...new Set(rules.flatMap(r => r.factsNeeded))].sort();
  const packFacts: PackFact[] = factPaths.map(path => {
    const def = getFact(path)!;
    const derived = DERIVED_FACTS[path];
    return derived ? { ...def, derived } : { ...def };
  });

  const key = locationJurisdictionKey(location.facts);
  const chain = key ? getJurisdictionChain(key) : [];

  const checksum = createHash("sha256").update(JSON.stringify(rules)).digest("hex");

  return {
    format: "kronto-rule-pack/1",
    generatedAt: new Date().toISOString(),
    asOf,
    rulesVersion: RULES_VERSION,
    vocabularyVersion: VOCABULARY.version,
    business: business.name,
    location,
    jurisdictions: chain.map(j => ({ id: j.id, name: j.name, type: j.type, ...(j.fips ? { fips: j.fips } : {}) })),
    rules,
    obligations: obligationCodes.map(c => getObligation(c)!),
    facts: packFacts,
    stats,
    checksum,
  };
}

/** Build one pack per location in the profile. */
export function buildRulePacks(business: BusinessProfile, options: BuildOptions = {}): RulePack[] {
  return business.locations.map(loc => buildRulePack(business, loc, options));
}
