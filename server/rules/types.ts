/**
 * Deterministic TypeScript Rule Types
 *
 * Strict type definitions for the new rule representation.
 * These types will eventually replace the loose JSON rule format.
 */

// ─── Fact Types ────────────────────────────────────────────────────

export type FactType = "string" | "number" | "boolean" | "date" | "money" | "enum";

export interface FactDefinition {
  path: string;
  type: FactType;
  description: string;
  category?: string;
  enumValues?: string[];
  deprecated?: boolean;
  replacedBy?: string;
}

// ─── Condition DSL ─────────────────────────────────────────────────

export type ComparisonOp = "=" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "not_in";

export interface ComparisonCondition {
  fact: string;
  op: ComparisonOp;
  value: string | number | boolean | string[] | number[];
}

export interface AllCondition {
  all: Condition[];
}

export interface AnyCondition {
  any: Condition[];
}

export interface NotCondition {
  not: Condition;
}

export type Condition = ComparisonCondition | AllCondition | AnyCondition | NotCondition;

// ─── Result Types ──────────────────────────────────────────────────

export interface MinimumRequiredValueResult {
  type: "minimum_required_value";
  targetFact: string;
  minimum: number;
  unit: string;
}

export interface RequiredBreakResult {
  type: "required_break";
  breakType: string;
  minimumMinutes: number;
}

export interface PremiumRequiredResult {
  type: "premium_required";
  premiumType: string;
  amount?: number;
  formula?: string;
}

export interface ProhibitionResult {
  type: "prohibition";
  prohibitedAction: string;
}

export interface WarningResult {
  type: "warning";
  message: string;
}

export type RuleResult =
  | MinimumRequiredValueResult
  | RequiredBreakResult
  | PremiumRequiredResult
  | ProhibitionResult
  | WarningResult;

// ─── Rule Shape ────────────────────────────────────────────────────

export type RuleStatus = "active" | "draft" | "repealed" | "pending";

/**
 * What kind of legal source a citation points at. Statutes and ordinances are
 * the durable authority; regulations carry the specifics (rates, thresholds)
 * and change more often; guidance pages (agency FAQs, fact sheets) are the
 * least stable and should never be a rule's only citation.
 */
export type CitationKind = "statute" | "regulation" | "ordinance" | "constitution" | "guidance";

export const CITATION_KINDS: readonly CitationKind[] = ["statute", "regulation", "ordinance", "constitution", "guidance"];

export interface Citation {
  /** Formal cite or document name, e.g. "Cal. Lab. Code §512(a)" */
  source: string;
  url?: string;
  section?: string;
  kind?: CitationKind;
}

export interface Rule {
  id: string;
  title: string;
  jurisdiction: string;
  topic: string;
  effectiveFrom: string;       // ISO date string YYYY-MM-DD
  effectiveTo?: string;        // ISO date string YYYY-MM-DD, optional
  appliesWhen: Condition;
  result: RuleResult;
  citations: Citation[];
  status: RuleStatus;
}

// ─── Evaluation Output ─────────────────────────────────────────────

export type EvaluationOutcome = "violation" | "warning" | "passed";

export interface ConditionDetail {
  fact: string;
  op: string;
  expected: unknown;
  actual: unknown;
  met: boolean;
}

export interface EvaluationResult {
  ruleId: string;
  title: string;
  outcome: EvaluationOutcome;
  explanation: string;
  triggeredFacts: string[];
  conditionDetails: ConditionDetail[];
  supersededBy?: string;
  citation: Citation;
}

export interface EvaluationSummary {
  passed: EvaluationResult[];
  warnings: EvaluationResult[];
  violations: EvaluationResult[];
}

// ─── Scenario (input to evaluator) ────────────────────────────────

/**
 * A scenario is a flat key-value map where keys are fact paths
 * (e.g. "employee.exempt_status") and values are the fact values.
 */
export type Scenario = Record<string, string | number | boolean>;
