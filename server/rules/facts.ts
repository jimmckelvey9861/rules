/**
 * Fact Registry
 *
 * Canonical vocabulary for all employment law rules.
 * Every fact referenced in a rule's appliesWhen condition must be registered here.
 *
 * Design principles:
 * - Facts are observable inputs, not derived values.
 * - Enums over free-text for bounded domains.
 * - One namespace per entity (no separate "business" vs "employer").
 * - Scoped counts are separate facts (global vs state vs location).
 * - Deprecated facts remain temporarily for backward compatibility.
 */

import type { FactDefinition, FactType } from "./types.js";

const FACTS: FactDefinition[] = [

  // ═══════════════════════════════════════════════════════════════════
  // LOCATION — Geographic Applicability
  // ═══════════════════════════════════════════════════════════════════

  { path: "location.country", type: "string", description: "ISO country code (e.g. US, PR, GU)" },
  { path: "location.state", type: "string", description: "Two-letter state code (e.g. CA, NY)" },
  { path: "location.city", type: "string", description: "City name" },
  { path: "location.county", type: "string", description: "County name" },
  { path: "location.is_unincorporated", type: "boolean", description: "Whether work location is in an unincorporated area" },

  // ═══════════════════════════════════════════════════════════════════
  // EMPLOYER — Size, Structure, Sector
  // ═══════════════════════════════════════════════════════════════════

  { path: "employer.total_employees", type: "number", description: "Total number of employees (unscoped / as specified by rule)" },
  { path: "employer.total_employees_global", type: "number", description: "Total employees worldwide (all locations)" },
  { path: "employer.total_employees_state", type: "number", description: "Total employees in the state" },
  { path: "employer.total_employees_at_location", type: "number", description: "Total employees at the specific work location" },
  { path: "employer.annual_gross_revenue", type: "money", description: "Annual gross revenue in dollars" },
  { path: "employer.number_of_locations", type: "number", description: "Number of business locations" },
  { path: "employer.is_franchisee", type: "boolean", description: "Whether employer is a franchisee" },
  { path: "employer.is_franchisor", type: "boolean", description: "Whether employer is a franchisor" },
  { path: "employer.is_chain", type: "boolean", description: "Whether employer is part of a chain (typically 30+ locations)" },
  { path: "employer.is_government_entity", type: "boolean", description: "Whether employer is a government entity" },
  { path: "employer.is_nonprofit", type: "boolean", description: "Whether employer is a nonprofit organization" },
  { path: "employer.is_federal_contractor", type: "boolean", description: "Whether employer is a federal contractor" },
  { path: "employer.has_collective_bargaining_agreement", type: "boolean", description: "Whether a CBA covers the workforce or relevant employees" },
  { path: "employer.industry_tag", type: "enum", description: "Primary industry classification",
    enumValues: [
      "retail", "fast_food", "restaurant", "hospitality", "hotel",
      "healthcare", "manufacturing", "construction", "agriculture",
      "transportation", "warehouse", "education", "cannabis",
      "staffing_agency", "gig_platform", "domestic_service", "other",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // EMPLOYEE — Classification, Demographics, Pay
  // ═══════════════════════════════════════════════════════════════════

  { path: "employee.exempt_status", type: "enum", description: "FLSA exemption status",
    enumValues: ["exempt", "non_exempt"],
  },
  { path: "employee.tipped_status", type: "enum", description: "Whether employee receives tips",
    enumValues: ["tipped", "non_tipped"],
  },
  { path: "employee.age", type: "number", description: "Employee age in years" },
  { path: "employee.is_minor", type: "boolean", description: "Whether employee is under 18" },
  { path: "employee.regular_hourly_rate", type: "money", description: "Employee regular hourly pay rate in dollars" },
  { path: "employee.cash_wage", type: "money", description: "Tipped employee cash wage before tip credit (dollars/hour)" },
  { path: "employee.weekly_salary", type: "money", description: "Weekly salary in dollars (for exemption threshold tests)" },
  { path: "employee.employment_status", type: "enum", description: "Employment status",
    enumValues: ["full_time", "part_time", "temporary", "seasonal", "probationary"],
  },
  { path: "employee.worker_type", type: "enum", description: "Worker classification type",
    enumValues: ["w2_employee", "independent_contractor", "temp_agency", "intern", "volunteer"],
  },
  { path: "employee.job_category", type: "enum", description: "Occupation category for industry-specific rules",
    enumValues: [
      "food_service", "healthcare", "retail", "hotel", "security",
      "domestic", "agricultural", "office", "driver", "nurse", "other",
    ],
  },
  { path: "employee.tenure_months", type: "number", description: "Months employed with current employer" },
  { path: "employee.hours_worked_last_12_months", type: "number", description: "Total hours worked in prior 12 months (for FMLA eligibility)" },
  { path: "employee.is_school_enrolled", type: "boolean", description: "Whether employee (minor) is enrolled in school" },
  { path: "employee.has_work_permit", type: "boolean", description: "Whether minor has a valid work permit" },
  { path: "employee.union_member", type: "boolean", description: "Whether employee is a union member" },
  { path: "employee.pay_frequency", type: "enum", description: "How often employee is paid",
    enumValues: ["weekly", "biweekly", "semimonthly", "monthly"],
  },

  // ═══════════════════════════════════════════════════════════════════
  // SHIFT — Current Work Period
  // ═══════════════════════════════════════════════════════════════════

  { path: "shift.date", type: "date", description: "Shift date (ISO YYYY-MM-DD)" },
  { path: "shift.hours_worked_today", type: "number", description: "Hours worked in the current day" },
  { path: "shift.hours_worked_this_week", type: "number", description: "Hours worked in the current workweek" },
  { path: "shift.shift_length_hours", type: "number", description: "Length of the current shift in hours" },
  { path: "shift.start_time", type: "string", description: "Shift start time (HH:MM, 24-hour)" },
  { path: "shift.end_time", type: "string", description: "Shift end time (HH:MM, 24-hour)" },
  { path: "shift.is_split_shift", type: "boolean", description: "Whether this is a split shift" },
  { path: "shift.split_shift_gap_minutes", type: "number", description: "Minutes between split shift segments" },
  { path: "shift.is_on_call", type: "boolean", description: "Whether this is an on-call shift" },
  { path: "shift.is_seventh_consecutive_day", type: "boolean", description: "Whether this is the 7th consecutive day worked" },
  { path: "shift.hours_since_last_shift_end", type: "number", description: "Hours between end of last shift and start of this one (clopening)" },
  { path: "shift.is_holiday", type: "boolean", description: "Whether the shift falls on a recognized holiday" },
  { path: "shift.is_school_day", type: "boolean", description: "Whether it is a school day (for minor labor rules)" },
  { path: "shift.meal_break_provided", type: "boolean", description: "Whether a meal break was provided" },
  { path: "shift.meal_break_minutes", type: "number", description: "Duration of meal break in minutes" },
  { path: "shift.meal_break_waived", type: "boolean", description: "Whether meal break was waived by mutual consent" },
  { path: "shift.rest_break_provided", type: "boolean", description: "Whether a rest break was provided" },
  { path: "shift.rest_break_minutes", type: "number", description: "Duration of rest break in minutes" },
  { path: "shift.consecutive_days_worked", type: "number", description: "Number of consecutive days worked including today" },
  { path: "shift.hours_worked_at_report", type: "number", description: "Hours actually worked when employee reported (for reporting time pay)" },

  // ═══════════════════════════════════════════════════════════════════
  // SCHEDULE — Predictive Scheduling & Changes
  // ═══════════════════════════════════════════════════════════════════

  { path: "schedule.advance_notice_days", type: "number", description: "Days in advance the schedule was posted" },
  { path: "schedule.was_changed", type: "boolean", description: "Whether the schedule was changed after posting" },
  { path: "schedule.change_type", type: "enum", description: "Type of schedule change",
    enumValues: [
      "hours_added", "hours_reduced", "time_changed", "location_changed",
      "shift_cancelled", "on_call_to_work", "on_call_not_needed",
    ],
  },
  { path: "schedule.employee_consented", type: "boolean", description: "Whether the employee consented to the change" },
  { path: "schedule.employer_initiated", type: "boolean", description: "Whether the change was employer-initiated" },
  { path: "schedule.called_in", type: "boolean", description: "Whether employee was called in to work" },
  { path: "schedule.good_faith_estimate_provided", type: "boolean", description: "Whether a good faith schedule estimate was provided at hire" },

  // ═══════════════════════════════════════════════════════════════════
  // LEAVE — Leave Law Applicability
  // ═══════════════════════════════════════════════════════════════════

  { path: "leave.type", type: "enum", description: "Type of leave requested",
    enumValues: [
      "sick", "family", "medical", "parental", "bereavement",
      "jury_duty", "voting", "domestic_violence", "military", "school_activity",
    ],
  },
  { path: "leave.reason", type: "enum", description: "Specific qualifying reason for leave",
    enumValues: [
      "own_illness", "family_illness", "childbirth", "adoption", "foster_care",
      "military_deployment", "domestic_violence", "sexual_assault", "stalking", "other",
    ],
  },
  { path: "leave.is_intermittent", type: "boolean", description: "Whether leave is taken intermittently" },
  { path: "leave.hours_requested", type: "number", description: "Hours of leave requested" },
  { path: "leave.hours_accrued", type: "number", description: "Hours of leave accrued/available" },
  { path: "leave.days_notice_given", type: "number", description: "Days of advance notice given for leave request" },

  // ═══════════════════════════════════════════════════════════════════
  // TERMINATION — Final Pay & Separation
  // ═══════════════════════════════════════════════════════════════════

  { path: "termination.type", type: "enum", description: "Type of employment separation",
    enumValues: [
      "voluntary_resignation", "involuntary_discharge", "layoff",
      "constructive_discharge", "end_of_contract", "retirement",
    ],
  },
  { path: "termination.days_since_separation", type: "number", description: "Calendar days since employment ended" },
  { path: "termination.is_mass_layoff", type: "boolean", description: "Whether this is part of a mass layoff" },
  { path: "termination.employees_affected", type: "number", description: "Number of employees affected in mass layoff" },
  { path: "termination.notice_days_given", type: "number", description: "Days of advance notice given before separation" },

  // ═══════════════════════════════════════════════════════════════════
  // PAYROLL — Pay Frequency & Timing
  // ═══════════════════════════════════════════════════════════════════

  { path: "payroll.pay_frequency", type: "enum", description: "Employer pay frequency",
    enumValues: ["weekly", "biweekly", "semimonthly", "monthly"],
  },
  { path: "payroll.days_since_pay_period_end", type: "number", description: "Days elapsed since end of pay period (for timely payment rules)" },

  // ═══════════════════════════════════════════════════════════════════
  // DEPRECATED — Old names kept for backward compatibility
  // ═══════════════════════════════════════════════════════════════════

  { path: "employer.employee_count", type: "number", description: "[DEPRECATED] Total number of employees",
    deprecated: true, replacedBy: "employer.total_employees",
  },
  { path: "employer.industry", type: "string", description: "[DEPRECATED] Employer industry classification",
    deprecated: true, replacedBy: "employer.industry_tag",
  },
  { path: "employee.hourly_rate", type: "money", description: "[DEPRECATED] Employee hourly pay rate in dollars",
    deprecated: true, replacedBy: "employee.regular_hourly_rate",
  },
  { path: "schedule.split_shift", type: "boolean", description: "[DEPRECATED] Whether this is a split shift",
    deprecated: true, replacedBy: "shift.is_split_shift",
  },
  { path: "schedule.posted_days_in_advance", type: "number", description: "[DEPRECATED] Days in advance the schedule was posted",
    deprecated: true, replacedBy: "schedule.advance_notice_days",
  },
];

/** Map from fact path to definition for O(1) lookup */
const FACT_MAP = new Map<string, FactDefinition>(
  FACTS.map(f => [f.path, f])
);

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
 * Check if a fact is deprecated.
 */
export function isDeprecatedFact(path: string): boolean {
  const fact = FACT_MAP.get(path);
  return fact?.deprecated === true;
}

/**
 * Get the canonical replacement for a deprecated fact.
 */
export function getReplacementFact(path: string): string | undefined {
  const fact = FACT_MAP.get(path);
  return fact?.replacedBy;
}

/**
 * Get the type of a registered fact.
 */
export function getFactType(path: string): FactType | undefined {
  return FACT_MAP.get(path)?.type;
}

/**
 * Get all registered fact definitions (including deprecated).
 */
export function getAllFacts(): readonly FactDefinition[] {
  return FACTS;
}

/**
 * Get only canonical (non-deprecated) fact definitions.
 */
export function getCanonicalFacts(): readonly FactDefinition[] {
  return FACTS.filter(f => !f.deprecated);
}

/**
 * Get only deprecated fact definitions.
 */
export function getDeprecatedFacts(): readonly FactDefinition[] {
  return FACTS.filter(f => f.deprecated === true);
}

/**
 * Get enum values for a fact (if it's an enum type).
 */
export function getEnumValues(path: string): string[] | undefined {
  const fact = FACT_MAP.get(path);
  if (fact?.type === "enum") return fact.enumValues;
  return undefined;
}
