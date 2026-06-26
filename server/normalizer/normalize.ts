/**
 * Normalization Functions
 *
 * Pure functions that convert existing structuredRule JSON into canonical shapes.
 * These do NOT modify the database — they return the normalized object or an error.
 */

import type {
  MinimumWageRule,
  MinimumWageRate,
  OvertimeRule,
  PredictiveSchedulingRule,
  CanonicalRule,
} from "./canonical-schemas.js";

export interface NormalizationWarnings {
  droppedFields: string[];                // Fields present in input but not in canonical output
  possibleMixedCategoryFields: string[];  // Fields that belong to a different rule type
  dataLossWarnings: string[];             // Cases where conditional data was collapsed
}

export interface NormalizationResult {
  success: boolean;
  ruleType: string;
  canonical?: CanonicalRule;
  error?: string;
  changes: string[];       // List of transformations applied
  warnings: NormalizationWarnings;
}

// ═══════════════════════════════════════════════════════════════════════
// Cross-category field detection
// ═══════════════════════════════════════════════════════════════════════

/** Fields that belong to specific rule types — used to detect mixed-category data */
const FIELDS_BY_TYPE: Record<string, Set<string>> = {
  minimum_wage: new Set([
    "minimum_wage", "rates", "multiRate", "defaultRate", "selectedRate",
    "fast_food_minimum_wage", "tipped_wage",
  ]),
  overtime: new Set([
    "overtime_multiplier", "premiumRate", "daily_threshold_hours", "weekly_threshold_hours",
    "daily_double_threshold_hours", "double_time_multiplier", "overtime_threshold_weekly",
    "seventh_day", "calculation", "basis", "threshold",
  ]),
  predictive_scheduling: new Set([
    "advance_notice_days", "advanceNotice", "covered_industries", "coveredIndustries",
    "scheduleChangePenalties", "premiumPay", "premium", "premium_model",
    "fast_food_employer_threshold", "retail_employer_threshold", "employer_threshold_global",
    "employerSizeThreshold", "restrictions",
  ]),
  meal_break: new Set([
    "first_break", "second_break", "waiver", "penalty", "meal_break",
  ]),
  family_medical_leave: new Set([
    "leave_weeks", "qualifying_reasons", "employee_eligibility",
  ]),
  warn_act: new Set([
    "notice_days", "triggers",
  ]),
};

/** Common fields that appear in all types (not type-specific) */
const COMMON_FIELDS = new Set([
  "ruleType", "jurisdiction", "effectiveYear", "effective_date", "confidence",
  "notes", "appliesTo", "applies_to", "employer_threshold",
]);

function emptyWarnings(): NormalizationWarnings {
  return { droppedFields: [], possibleMixedCategoryFields: [], dataLossWarnings: [] };
}

/**
 * Detect which input fields were NOT consumed by the normalizer,
 * and whether any belong to a different rule type.
 */
function detectDroppedAndMixedFields(
  raw: Record<string, unknown>,
  consumedFields: Set<string>,
  thisType: string,
): Pick<NormalizationWarnings, "droppedFields" | "possibleMixedCategoryFields"> {
  const droppedFields: string[] = [];
  const possibleMixedCategoryFields: string[] = [];

  for (const field of Object.keys(raw)) {
    if (consumedFields.has(field) || COMMON_FIELDS.has(field)) continue;

    // Check if this field belongs to another type
    let belongsToOther: string | null = null;
    for (const [otherType, fields] of Object.entries(FIELDS_BY_TYPE)) {
      if (otherType === thisType) continue;
      if (fields.has(field)) {
        belongsToOther = otherType;
        break;
      }
    }

    if (belongsToOther) {
      possibleMixedCategoryFields.push(`"${field}" → likely belongs to ${belongsToOther}`);
    } else {
      droppedFields.push(field);
    }
  }

  return { droppedFields, possibleMixedCategoryFields };
}

// ═══════════════════════════════════════════════════════════════════════
// Minimum Wage Normalizer
// ═══════════════════════════════════════════════════════════════════════

export function normalizeMinimumWage(
  raw: Record<string, unknown>,
  jurisdiction: string,
): NormalizationResult {
  const changes: string[] = [];
  const warnings = emptyWarnings();
  const consumedFields = new Set<string>(["ruleType", "jurisdiction", "effectiveYear", "effective_date",
    "rates", "defaultRate", "multiRate", "confidence", "notes", "minimum_wage",
    "fast_food_minimum_wage", "selectedRate", "basis", "adjustment", "region"]);

  // ─── ruleType ────────────────────────────────────────────────────
  if (raw.ruleType !== "minimum_wage") {
    changes.push(`Set ruleType: "minimum_wage" (was: ${JSON.stringify(raw.ruleType)})`);
  }

  // ─── jurisdiction ────────────────────────────────────────────────
  const ruleJurisdiction = (raw.jurisdiction as string) || jurisdiction || "unknown";
  if (!raw.jurisdiction) {
    changes.push(`Set jurisdiction: "${ruleJurisdiction}" (was missing)`);
  }

  // ─── effectiveYear ───────────────────────────────────────────────
  let effectiveYear = "unknown";
  if (raw.effectiveYear && typeof raw.effectiveYear === "string") {
    effectiveYear = raw.effectiveYear;
  } else if (raw.effective_date && typeof raw.effective_date === "string") {
    const yearMatch = (raw.effective_date as string).match(/20\d{2}/);
    if (yearMatch) {
      effectiveYear = yearMatch[0];
      changes.push(`Extracted effectiveYear "${effectiveYear}" from effective_date "${raw.effective_date}"`);
    }
  }
  if (!raw.effectiveYear && effectiveYear !== "unknown") {
    changes.push(`Set effectiveYear: "${effectiveYear}"`);
  }

  // ─── rates ───────────────────────────────────────────────────────
  let rates: MinimumWageRate[] = [];

  if (Array.isArray(raw.rates) && raw.rates.length > 0) {
    // Modern format: rates array
    for (const r of raw.rates as Array<Record<string, unknown>>) {
      const amount = (r.amount as string) || (r.rate as string) || null;
      if (!amount) continue;
      rates.push({
        amount,
        condition: (r.condition as string) || null,
        conditionDetail: (r.conditionDetail as string) || (r.condition_detail as string) || null,
      });
      // Normalize field names
      if (r.rate && !r.amount) changes.push(`Renamed "rate" → "amount" for ${amount}`);
      if (r.condition_detail) changes.push(`Renamed "condition_detail" → "conditionDetail"`);
    }
    // Remove year field from rates if present (legacy)
    const hasYear = (raw.rates as Array<Record<string, unknown>>).some(r => r.year !== undefined);
    if (hasYear) changes.push(`Removed legacy "year" field from individual rates`);
  } else if (raw.minimum_wage != null) {
    // Legacy format: single minimum_wage field (string or number)
    const rawVal = raw.minimum_wage;
    const amount = typeof rawVal === "number" ? `$${rawVal.toFixed(2)}` : String(rawVal);
    rates.push({ amount, condition: null, conditionDetail: null });
    changes.push(`Converted legacy "minimum_wage: ${rawVal}" → rates array (formatted as "${amount}")`);

    // Check for additional rates in other fields
    if (raw.fast_food_minimum_wage != null) {
      const ffVal = raw.fast_food_minimum_wage;
      const ffAmount = typeof ffVal === "number" ? `$${ffVal.toFixed(2)}` : String(ffVal);
      rates.push({
        amount: ffAmount,
        condition: "fast_food_worker",
        conditionDetail: "Fast food workers",
      });
      changes.push(`Moved "fast_food_minimum_wage: ${ffVal}" into rates array with condition (formatted as "${ffAmount}")`);
    }
  } else if (raw.selectedRate && typeof raw.selectedRate === "object") {
    // Legacy format: selectedRate object
    const sr = raw.selectedRate as Record<string, unknown>;
    const amount = sr.amount as string;
    if (amount) {
      rates.push({ amount, condition: null, conditionDetail: null });
      changes.push(`Converted legacy "selectedRate.amount: ${amount}" → rates array`);
    }
  }

  // If rates still empty but defaultRate exists, use it
  if (rates.length === 0 && raw.defaultRate && typeof raw.defaultRate === "string") {
    rates.push({ amount: raw.defaultRate as string, condition: null, conditionDetail: null });
    changes.push(`Recovered rate from defaultRate: "${raw.defaultRate}" (rates array was empty)`);
  }

  if (rates.length === 0) {
    return { success: false, ruleType: "minimum_wage", error: "No rates found in any format", changes, warnings };
  }

  // ─── defaultRate ─────────────────────────────────────────────────
  let defaultRate: string;
  if (raw.defaultRate && typeof raw.defaultRate === "string") {
    defaultRate = raw.defaultRate;
  } else {
    // Prefer unconditioned rate
    const general = rates.find(r => !r.condition);
    defaultRate = general ? general.amount : rates[0].amount;
    changes.push(`Computed defaultRate: "${defaultRate}"`);
  }

  // ─── multiRate ───────────────────────────────────────────────────
  const multiRate = rates.length > 1;
  if (raw.multiRate !== multiRate) {
    changes.push(`Corrected multiRate: ${multiRate} (was: ${raw.multiRate})`);
  }

  // ─── confidence ──────────────────────────────────────────────────
  let confidence: "high" | "medium" | "low" = "medium";
  if (raw.confidence === "high" || raw.confidence === "medium" || raw.confidence === "low") {
    confidence = raw.confidence;
  } else {
    changes.push(`Set default confidence: "medium"`);
  }

  // ─── notes ───────────────────────────────────────────────────────
  const notes = (raw.notes as string) || null;

  // ─── Detect dropped/mixed fields ──────────────────────────────────
  const { droppedFields, possibleMixedCategoryFields } = detectDroppedAndMixedFields(raw, consumedFields, "minimum_wage");
  warnings.droppedFields = droppedFields;
  warnings.possibleMixedCategoryFields = possibleMixedCategoryFields;

  // ─── Build canonical rule ────────────────────────────────────────
  const canonical: MinimumWageRule = {
    ruleType: "minimum_wage",
    jurisdiction: ruleJurisdiction,
    effectiveYear,
    rates,
    defaultRate,
    multiRate,
    confidence,
    notes,
  };

  return { success: true, ruleType: "minimum_wage", canonical, changes, warnings };
}

// ═══════════════════════════════════════════════════════════════════════
// Overtime Normalizer
// ═══════════════════════════════════════════════════════════════════════

export function normalizeOvertime(
  raw: Record<string, unknown>,
  jurisdiction: string,
): NormalizationResult {
  const changes: string[] = [];
  const warnings = emptyWarnings();
  const consumedFields = new Set<string>(["ruleType", "jurisdiction", "basis", "threshold",
    "premiumRate", "overtime_multiplier", "appliesTo", "applies_to", "calculation",
    "weekly_threshold_hours", "daily_threshold_hours", "daily_double_threshold_hours",
    "double_time_multiplier", "seventh_day", "doubleTimeRate", "doubleTimeThreshold"]);

  // ─── ruleType ────────────────────────────────────────────────────
  if (raw.ruleType !== "overtime") {
    changes.push(`Set ruleType: "overtime" (was: ${JSON.stringify(raw.ruleType)})`);
  }

  // ─── jurisdiction ────────────────────────────────────────────────
  const ruleJurisdiction = (raw.jurisdiction as string) || jurisdiction || "unknown";
  if (!raw.jurisdiction) {
    changes.push(`Set jurisdiction: "${ruleJurisdiction}"`);
  }

  // ─── basis & threshold ───────────────────────────────────────────
  let basis: "weekly_hours" | "daily_hours" | "both" = "weekly_hours";
  let thresholdHours = 40;
  let thresholdPeriod: "workweek" | "workday" = "workweek";
  let doubleTimeRate: number | undefined;
  let doubleTimeThreshold: { hours: number; period: "workweek" | "workday" } | undefined;

  if (raw.basis === "daily_hours" || raw.basis === "daily") {
    basis = "daily_hours";
    thresholdHours = 8;
    thresholdPeriod = "workday";
    if (raw.basis === "daily") changes.push(`Normalized basis: "daily" → "daily_hours"`);
  } else if (raw.basis === "weekly_hours" || raw.basis === "weekly") {
    basis = "weekly_hours";
    if (raw.basis === "weekly") changes.push(`Normalized basis: "weekly" → "weekly_hours"`);
  } else if (raw.basis === "both") {
    basis = "both";
  }

  // Extract threshold from various formats
  if (raw.threshold && typeof raw.threshold === "object") {
    const t = raw.threshold as Record<string, unknown>;
    thresholdHours = (t.hours as number) || thresholdHours;
    thresholdPeriod = (t.period as "workweek" | "workday") || thresholdPeriod;
  } else if (raw.weekly_threshold_hours) {
    thresholdHours = raw.weekly_threshold_hours as number;
    changes.push(`Moved "weekly_threshold_hours" → threshold.hours`);
  } else if (raw.daily_threshold_hours) {
    thresholdHours = raw.daily_threshold_hours as number;
    thresholdPeriod = "workday";
    basis = "daily_hours";
    changes.push(`Moved "daily_threshold_hours" → threshold.hours, set basis to "daily_hours"`);
  }

  // Double time (California)
  if (raw.daily_double_threshold_hours) {
    doubleTimeRate = (raw.double_time_multiplier as number) || 2.0;
    doubleTimeThreshold = {
      hours: raw.daily_double_threshold_hours as number,
      period: "workday",
    };
    changes.push(`Extracted double time: ${doubleTimeRate}x after ${doubleTimeThreshold.hours} hours/day`);
  }

  // ─── premiumRate ─────────────────────────────────────────────────
  let premiumRate = 1.5;
  if (raw.premiumRate && typeof raw.premiumRate === "number") {
    premiumRate = raw.premiumRate;
  } else if (raw.overtime_multiplier && typeof raw.overtime_multiplier === "number") {
    premiumRate = raw.overtime_multiplier;
    changes.push(`Renamed "overtime_multiplier" → premiumRate`);
  }

  // ─── appliesTo ───────────────────────────────────────────────────
  let appliesTo: Record<string, unknown> = { "employee.exemption_status": "non_exempt" };
  if (raw.appliesTo && typeof raw.appliesTo === "object") {
    appliesTo = raw.appliesTo as Record<string, unknown>;
  } else if (raw.applies_to && typeof raw.applies_to === "object") {
    appliesTo = raw.applies_to as Record<string, unknown>;
    changes.push(`Renamed "applies_to" → appliesTo`);
  } else if (raw.applies_to && typeof raw.applies_to === "string") {
    appliesTo = { "employee.exemption_status": raw.applies_to };
    changes.push(`Converted "applies_to" string → appliesTo object`);
  }

  // ─── calculation ─────────────────────────────────────────────────
  let calculation: { overtimeHours: string; overtimePay: string };
  if (raw.calculation && typeof raw.calculation === "object") {
    const c = raw.calculation as Record<string, unknown>;
    calculation = {
      overtimeHours: (c.overtimeHours as string) || `max(0, hours_worked - ${thresholdHours})`,
      overtimePay: (c.overtimePay as string) || `overtimeHours * regular_rate * ${premiumRate}`,
    };
  } else {
    calculation = {
      overtimeHours: basis === "weekly_hours"
        ? `max(0, hours_worked_in_workweek - ${thresholdHours})`
        : `max(0, hours_worked_in_workday - ${thresholdHours})`,
      overtimePay: `overtimeHours * regular_rate * ${premiumRate}`,
    };
    changes.push(`Generated calculation formulas`);
  }

  // ─── Build canonical rule ────────────────────────────────────────
  const canonical: OvertimeRule = {
    ruleType: "overtime",
    jurisdiction: ruleJurisdiction,
    basis,
    threshold: { hours: thresholdHours, period: thresholdPeriod },
    premiumRate,
    ...(doubleTimeRate ? { doubleTimeRate } : {}),
    ...(doubleTimeThreshold ? { doubleTimeThreshold } : {}),
    appliesTo,
    calculation,
  };

  // ─── Detect dropped/mixed fields ──────────────────────────────────
  const { droppedFields, possibleMixedCategoryFields } = detectDroppedAndMixedFields(raw, consumedFields, "overtime");
  warnings.droppedFields = droppedFields;
  warnings.possibleMixedCategoryFields = possibleMixedCategoryFields;

  return { success: true, ruleType: "overtime", canonical, changes, warnings };
}

// ═══════════════════════════════════════════════════════════════════════
// Predictive Scheduling Normalizer
// ═══════════════════════════════════════════════════════════════════════

export function normalizePredictiveScheduling(
  raw: Record<string, unknown>,
  jurisdiction: string,
): NormalizationResult {
  const changes: string[] = [];
  const warnings = emptyWarnings();
  const consumedFields = new Set<string>(["ruleType", "jurisdiction", "coveredIndustries",
    "covered_industries", "advanceNotice", "advance_notice_days", "scheduleChangePenalties",
    "premiumPay", "premium", "premium_model", "restrictions", "employerSizeThreshold",
    "employerSizeScope", "employer_threshold_global", "fast_food_employer_threshold",
    "retail_employer_threshold", "appliesTo", "industryThresholds"]);

  // ─── ruleType ────────────────────────────────────────────────────
  if (raw.ruleType !== "predictive_scheduling") {
    changes.push(`Set ruleType: "predictive_scheduling" (was: ${JSON.stringify(raw.ruleType)})`);
  }

  // ─── jurisdiction ────────────────────────────────────────────────
  const ruleJurisdiction = (raw.jurisdiction as string) || jurisdiction || "unknown";
  if (!raw.jurisdiction) {
    changes.push(`Set jurisdiction: "${ruleJurisdiction}"`);
  }

  // ─── coveredIndustries ───────────────────────────────────────────
  let coveredIndustries: string[] = [];
  if (Array.isArray(raw.coveredIndustries)) {
    coveredIndustries = raw.coveredIndustries as string[];
  } else if (Array.isArray(raw.covered_industries)) {
    coveredIndustries = raw.covered_industries as string[];
    changes.push(`Renamed "covered_industries" → coveredIndustries`);
  } else {
    coveredIndustries = ["covered_employers"];
    changes.push(`Set default coveredIndustries: ["covered_employers"]`);
  }

  // ─── advanceNotice ───────────────────────────────────────────────
  let advanceNotice: { days?: number; hours?: number } | undefined;
  if (raw.advanceNotice && typeof raw.advanceNotice === "object") {
    advanceNotice = raw.advanceNotice as { days?: number; hours?: number };
  } else if (raw.advance_notice_days) {
    advanceNotice = { days: raw.advance_notice_days as number };
    changes.push(`Moved "advance_notice_days" → advanceNotice.days`);
  }

  // ─── scheduleChangePenalties ─────────────────────────────────────
  let scheduleChangePenalties: Array<Record<string, unknown>> | undefined;
  if (Array.isArray(raw.scheduleChangePenalties)) {
    scheduleChangePenalties = raw.scheduleChangePenalties as Array<Record<string, unknown>>;
  }

  // ─── premiumPay ──────────────────────────────────────────────────
  let premiumPay: Record<string, unknown> | undefined;
  if (raw.premiumPay && typeof raw.premiumPay === "object") {
    premiumPay = raw.premiumPay as Record<string, unknown>;
  } else if (raw.premium && typeof raw.premium === "object") {
    premiumPay = raw.premium as Record<string, unknown>;
    changes.push(`Renamed "premium" → premiumPay`);
  } else if (raw.premium_model && typeof raw.premium_model === "string") {
    premiumPay = { type: "required", detail: raw.premium_model as string };
    changes.push(`Converted "premium_model" string → premiumPay object`);
  }

  // ─── restrictions ────────────────────────────────────────────────
  let restrictions: Record<string, unknown> = {};
  if (raw.restrictions && typeof raw.restrictions === "object") {
    restrictions = raw.restrictions as Record<string, unknown>;
  }

  // ─── employerSizeThreshold / industryThresholds ────────────────────
  let employerSizeThreshold: number | undefined;
  let employerSizeScope: "worldwide" | "local" | undefined;
  let industryThresholds: Array<{ industry: string; employerSizeThreshold: number; employeeCountScope?: string }> | undefined;

  if (raw.employerSizeThreshold) {
    // Single threshold — already canonical
    employerSizeThreshold = raw.employerSizeThreshold as number;
  } else if (raw.employer_threshold_global) {
    // Single threshold with global scope
    employerSizeThreshold = raw.employer_threshold_global as number;
    employerSizeScope = "worldwide";
    changes.push(`Moved "employer_threshold_global" → employerSizeThreshold + scope "worldwide"`);
  } else if (raw.fast_food_employer_threshold || raw.retail_employer_threshold) {
    // CONDITIONAL thresholds — preserve per-industry detail, do NOT collapse
    industryThresholds = [];
    if (raw.fast_food_employer_threshold) {
      industryThresholds.push({
        industry: "fast_food",
        employerSizeThreshold: raw.fast_food_employer_threshold as number,
        employeeCountScope: "global_or_chain",
      });
    }
    if (raw.retail_employer_threshold) {
      industryThresholds.push({
        industry: "retail",
        employerSizeThreshold: raw.retail_employer_threshold as number,
        employeeCountScope: "global_or_chain",
      });
    }
    changes.push(`Preserved per-industry thresholds in industryThresholds array (${industryThresholds.length} entries)`);
  }
  // Also check for existing industryThresholds (already canonical)
  if (Array.isArray(raw.industryThresholds)) {
    industryThresholds = raw.industryThresholds as typeof industryThresholds;
  }
  if (raw.employerSizeScope) {
    employerSizeScope = raw.employerSizeScope as "worldwide" | "local";
  }

  // ─── appliesTo ───────────────────────────────────────────────────
  let appliesTo: Record<string, unknown> = {};
  if (raw.appliesTo && typeof raw.appliesTo === "object") {
    appliesTo = raw.appliesTo as Record<string, unknown>;
  } else {
    appliesTo = {
      "business.industry_tags": coveredIndustries,
      ...(employerSizeThreshold ? { "employer.total_employees_global": `>= ${employerSizeThreshold}` } : {}),
    };
    changes.push(`Generated appliesTo from coveredIndustries and employerSizeThreshold`);
  }

  // ─── Detect dropped/mixed fields ──────────────────────────────────
  const { droppedFields, possibleMixedCategoryFields } = detectDroppedAndMixedFields(raw, consumedFields, "predictive_scheduling");
  warnings.droppedFields = droppedFields;
  warnings.possibleMixedCategoryFields = possibleMixedCategoryFields;

  // ─── Build canonical rule ────────────────────────────────────────
  const canonical: PredictiveSchedulingRule = {
    ruleType: "predictive_scheduling",
    jurisdiction: ruleJurisdiction,
    coveredIndustries,
    ...(advanceNotice ? { advanceNotice } : {}),
    ...(scheduleChangePenalties ? { scheduleChangePenalties: scheduleChangePenalties as PredictiveSchedulingRule["scheduleChangePenalties"] } : {}),
    ...(premiumPay ? { premiumPay: premiumPay as unknown as PredictiveSchedulingRule["premiumPay"] } : {}),
    restrictions: restrictions as unknown as PredictiveSchedulingRule["restrictions"],
    ...(employerSizeThreshold ? { employerSizeThreshold } : {}),
    ...(employerSizeScope ? { employerSizeScope } : {}),
    ...(industryThresholds ? { industryThresholds } : {}),
    appliesTo,
  };

  return { success: true, ruleType: "predictive_scheduling", canonical, changes, warnings };
}

// ═══════════════════════════════════════════════════════════════════════
// Router: detect type and normalize
// ═══════════════════════════════════════════════════════════════════════

/**
 * Detect the rule type from raw JSON and apply the appropriate normalizer.
 */
export function normalizeRule(
  raw: Record<string, unknown>,
  jurisdiction: string,
  categoryHint?: string,
): NormalizationResult {
  // Determine rule type
  let ruleType = raw.ruleType as string | undefined;

  if (!ruleType || ruleType === "unknown") {
    // Infer from fields
    ruleType = inferRuleType(raw, categoryHint);
  }

  switch (ruleType) {
    case "minimum_wage":
      return normalizeMinimumWage(raw, jurisdiction);
    case "overtime":
      return normalizeOvertime(raw, jurisdiction);
    case "predictive_scheduling":
      return normalizePredictiveScheduling(raw, jurisdiction);
    default:
      return {
        success: false,
        ruleType: ruleType || "unknown",
        error: `Rule type "${ruleType}" is not yet supported for normalization.`,
        changes: [],
        warnings: emptyWarnings(),
      };
  }
}

/**
 * Infer rule type from field names when ruleType is missing.
 */
function inferRuleType(raw: Record<string, unknown>, categoryHint?: string): string {
  const fields = new Set(Object.keys(raw));
  const catLower = (categoryHint || "").toLowerCase();

  // Minimum wage indicators
  if (fields.has("minimum_wage") || fields.has("selectedRate") ||
      (fields.has("rates") && fields.has("multiRate")) ||
      catLower.includes("minimum wage")) {
    return "minimum_wage";
  }

  // Overtime indicators
  if (fields.has("overtime_multiplier") || fields.has("premiumRate") ||
      fields.has("daily_threshold_hours") || fields.has("weekly_threshold_hours") ||
      (fields.has("basis") && (fields.has("threshold") || fields.has("calculation"))) ||
      catLower.includes("overtime")) {
    return "overtime";
  }

  // Predictive scheduling indicators
  if (fields.has("advance_notice_days") || fields.has("advanceNotice") ||
      fields.has("covered_industries") || fields.has("coveredIndustries") ||
      fields.has("scheduleChangePenalties") ||
      catLower.includes("scheduling") || catLower.includes("workweek")) {
    return "predictive_scheduling";
  }

  // FMLA
  if (fields.has("leave_weeks") || fields.has("qualifying_reasons") ||
      catLower.includes("fmla") || catLower.includes("family")) {
    return "family_medical_leave";
  }

  // WARN Act
  if (fields.has("notice_days") && fields.has("triggers") ||
      catLower.includes("warn")) {
    return "warn_act";
  }

  // Meal break
  if (fields.has("first_break") || fields.has("second_break") ||
      catLower.includes("meal") || catLower.includes("break")) {
    return "meal_break";
  }

  return "unknown";
}
