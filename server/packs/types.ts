/**
 * Rule Pack Types
 *
 * A business profile describes a company and its locations in business-level
 * facts (location.* and employer.*). Engine A evaluates every rule against a
 * location's facts and emits a rule pack: the rules that can still apply at
 * that location, with their business-level conditions already resolved, plus
 * everything a scheduler needs to evaluate them locally.
 */

import type { Citation, Condition, FactDefinition, Rule, RuleResult, RuleStatus } from "../rules/types.js";
import type { Obligation, KrontoAction } from "../reference/vocabulary.js";
import type { EnforcementTarget } from "../reference/taxonomy.js";
import type { JurisdictionType } from "../reference/jurisdictions.js";

export type BusinessFactValue = string | number | boolean;

/** Facts about one place of business. Keys are fact paths from the registry (location.*, employer.*). */
export type BusinessFacts = Record<string, BusinessFactValue>;

export interface LocationProfile {
  id: string;
  name: string;
  /** location.* facts for this site, plus any employer.* facts that differ here (e.g. employees at location) */
  facts: BusinessFacts;
}

export interface BusinessProfile {
  name: string;
  /** employer.* facts shared by every location */
  employer: BusinessFacts;
  locations: LocationProfile[];
}

export interface PackResult extends RuleResult {
  /** What the scheduler should do when the rule fires: block the schedule, compute a premium, or inform */
  kronto: KrontoAction;
}

/**
 * A rule as shipped in a pack. It is a valid Rule (so the shared evaluator
 * runs it unchanged) with its business-level conditions already resolved:
 * `appliesWhen` holds only the employee, shift, schedule and leave conditions
 * the scheduler must still test.
 */
export interface PackRule extends Omit<Rule, "result"> {
  result: PackResult;
  /** Taxonomy node code for the topic, e.g. "sched.predictive" */
  topicCode: string;
  enforcement: EnforcementTarget;
  jurisdictionId: string;
  jurisdictionType: JurisdictionType;
  /** Business-level facts that decided this rule applies here */
  satisfiedBy: string[];
  /** Facts the scheduler must supply to evaluate appliesWhen */
  factsNeeded: string[];
}

export interface PackFact extends FactDefinition {
  /** How to compute the fact from shift data, when it is derived rather than stored */
  derived?: string;
}

export interface PackJurisdiction {
  id: string;
  name: string;
  type: JurisdictionType;
  fips?: string;
}

export interface PackStats {
  rulesConsidered: number;
  rulesIncluded: number;
  excludedByProfile: number;
  excludedExpired: number;
  excludedInactive: number;
  /** Rules whose business-level conditions are fully resolved (nothing left to test but employee/shift facts) */
  fullyResolved: number;
}

export interface RulePack {
  format: "kronto-rule-pack/1";
  generatedAt: string;
  /** Date the pack was built for: rules that expired before it are left out */
  asOf: string;
  /** Hash of the complete rule set the pack was cut from */
  rulesVersion: string;
  vocabularyVersion: string;
  business: string;
  location: LocationProfile;
  /** The location's jurisdiction and its ancestors, nearest first */
  jurisdictions: PackJurisdiction[];
  rules: PackRule[];
  /** Obligation types used by the rules in this pack */
  obligations: Obligation[];
  /** Definitions of every fact the rules still need, with recipes for derived ones */
  facts: PackFact[];
  stats: PackStats;
  /** sha256 of the rules array, so a consumer can tell whether a pack changed */
  checksum: string;
}

export type { Citation, Condition, RuleStatus };
