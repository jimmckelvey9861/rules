/**
 * Fact Registry — Applicability Variables Taxonomy
 *
 * Canonical vocabulary for all employment law rules.
 * Every fact referenced in a rule's appliesWhen condition must be registered here.
 *
 * Organized by taxonomy section:
 *   1. Location (Geographic Applicability)
 *   2. Employer (Size, Structure, Sector)
 *   3. Employee (Classification, Demographics, Pay)
 *   4. Shift (Current Work Period)
 *   5. Schedule (Predictive Scheduling & Changes)
 *   6. Leave (Leave Law Applicability)
 *   7. Termination (Final Pay & Separation)
 *   8. Payroll (Pay Frequency & Timing)
 *
 * Design principles:
 * - Facts are observable inputs, not derived values (with convenience booleans where useful).
 * - Enums over free-text for bounded domains.
 * - One namespace per entity (business merged into employer).
 * - Scoped counts are separate facts (global vs state vs city vs location).
 */

import type { FactDefinition, FactType } from "./types.js";

const FACTS: FactDefinition[] = [

  // ═══════════════════════════════════════════════════════════════════
  // 1. LOCATION — Geographic Applicability
  // ═══════════════════════════════════════════════════════════════════

  // 1.1 Work Location
  { path: "location.country", type: "string", description: "ISO country code (e.g. US, PR, GU)", category: "1. Location" },
  { path: "location.state", type: "string", description: "Two-letter state code (e.g. CA, NY)", category: "1. Location" },
  { path: "location.city", type: "string", description: "City name", category: "1. Location" },
  { path: "location.county", type: "string", description: "County name", category: "1. Location" },
  { path: "location.is_unincorporated", type: "boolean", description: "Whether work location is in an unincorporated area", category: "1. Location" },
  { path: "location.tribal_land", type: "boolean", description: "Whether work location is on tribal land", category: "1. Location" },

  // 1.2 Primary Work Location (for multi-jurisdiction employees)
  { path: "location.primary_work_state", type: "string", description: "Primary work state for multi-state employees", category: "1. Location" },
  { path: "location.primary_work_city", type: "string", description: "Primary work city", category: "1. Location" },
  { path: "location.primary_work_county", type: "string", description: "Primary work county", category: "1. Location" },
  { path: "location.employee_residence_state", type: "string", description: "Employee residence state (for leave laws)", category: "1. Location" },
  { path: "location.employee_residence_city", type: "string", description: "Employee residence city", category: "1. Location" },

  // 1.3 Multi-Jurisdiction
  { path: "location.multi_state_employer", type: "boolean", description: "Whether employer operates in multiple states", category: "1. Location" },
  { path: "location.multi_jurisdiction_employee", type: "boolean", description: "Whether employee works across multiple jurisdictions", category: "1. Location" },

  // ═══════════════════════════════════════════════════════════════════
  // 2. EMPLOYER — Size, Structure, Sector (includes Business)
  // ═══════════════════════════════════════════════════════════════════

  // 2.1 Size
  { path: "employer.total_employees", type: "number", description: "Total number of employees (unscoped / as specified by rule)", category: "2. Employer" },
  { path: "employer.total_employees_global", type: "number", description: "Total employees worldwide (all locations)", category: "2. Employer" },
  { path: "employer.total_employees_us", type: "number", description: "Total employees in the United States", category: "2. Employer" },
  { path: "employer.total_employees_state", type: "number", description: "Total employees in the state", category: "2. Employer" },
  { path: "employer.total_employees_city", type: "number", description: "Total employees in the city", category: "2. Employer" },
  { path: "employer.total_employees_at_location", type: "number", description: "Total employees at the specific work location", category: "2. Employer" },
  { path: "employer.number_of_locations", type: "number", description: "Number of business locations", category: "2. Employer" },

  // 2.2 Revenue
  { path: "employer.annual_gross_revenue", type: "money", description: "Annual gross revenue in dollars", category: "2. Employer" },
  { path: "employer.annual_gross_sales", type: "money", description: "Annual gross sales in dollars (FLSA enterprise coverage)", category: "2. Employer" },

  // 2.3 Structure
  { path: "employer.is_franchisee", type: "boolean", description: "Whether employer is a franchisee", category: "2. Employer" },
  { path: "employer.is_franchisor", type: "boolean", description: "Whether employer is a franchisor", category: "2. Employer" },
  { path: "employer.is_chain", type: "boolean", description: "Whether employer is part of a chain (typically 30+ locations)", category: "2. Employer" },
  { path: "employer.is_joint_employer", type: "boolean", description: "Whether employer is a joint employer (aggregates employee counts)", category: "2. Employer" },
  { path: "employer.is_staffing_agency", type: "boolean", description: "Whether employer is a staffing/temp agency", category: "2. Employer" },

  // 2.4 Government & Union
  { path: "employer.is_government_entity", type: "boolean", description: "Whether employer is a government entity", category: "2. Employer" },
  { path: "employer.is_nonprofit", type: "boolean", description: "Whether employer is a nonprofit organization", category: "2. Employer" },
  { path: "employer.is_federal_contractor", type: "boolean", description: "Whether employer is a federal contractor", category: "2. Employer" },
  { path: "employer.is_state_contractor", type: "boolean", description: "Whether employer is a state contractor", category: "2. Employer" },
  { path: "employer.is_prevailing_wage_project", type: "boolean", description: "Whether work is on a prevailing wage project (Davis-Bacon)", category: "2. Employer" },
  { path: "employer.has_collective_bargaining_agreement", type: "boolean", description: "Whether a CBA covers the workforce or relevant employees", category: "2. Employer" },
  { path: "employer.is_unionized_workforce", type: "boolean", description: "Whether the workforce is unionized", category: "2. Employer" },

  // 2.5 Industry (merged from Business namespace)
  { path: "employer.industry_tag", type: "enum", description: "Primary industry classification",
    category: "2. Employer",
    enumValues: [
      "retail", "fast_food", "restaurant", "hospitality", "hotel",
      "healthcare", "manufacturing", "construction", "agriculture",
      "transportation", "warehouse", "education", "cannabis",
      "staffing_agency", "gig_platform", "domestic_service", "other",
    ],
  },
  { path: "employer.operates_24_hours", type: "boolean", description: "Whether the business operates 24 hours", category: "2. Employer" },
  { path: "employer.hotel_room_count", type: "number", description: "Number of hotel rooms (for hotel worker ordinances)", category: "2. Employer" },

  // ═══════════════════════════════════════════════════════════════════
  // 3. EMPLOYEE — Classification, Demographics, Pay
  // ═══════════════════════════════════════════════════════════════════

  // 3.1 Classification
  { path: "employee.exempt_status", type: "enum", description: "FLSA exemption status",
    category: "3. Employee",
    enumValues: ["exempt", "non_exempt"],
  },
  { path: "employee.worker_type", type: "enum", description: "Worker classification type",
    category: "3. Employee",
    enumValues: ["w2_employee", "independent_contractor", "temp_agency", "intern", "volunteer"],
  },
  { path: "employee.employment_status", type: "enum", description: "Employment status",
    category: "3. Employee",
    enumValues: ["full_time", "part_time", "temporary", "seasonal", "probationary"],
  },
  { path: "employee.probationary_status", type: "boolean", description: "Whether employee is in probationary period", category: "3. Employee" },

  // 3.2 Demographics
  { path: "employee.age", type: "number", description: "Employee age in years", category: "3. Employee" },
  { path: "employee.is_minor", type: "boolean", description: "Whether employee is under 18", category: "3. Employee" },
  { path: "employee.is_school_enrolled", type: "boolean", description: "Whether employee (minor) is enrolled in school", category: "3. Employee" },
  { path: "employee.has_work_permit", type: "boolean", description: "Whether minor has a valid work permit", category: "3. Employee" },

  // 3.3 Occupation
  { path: "employee.job_category", type: "enum", description: "Occupation category for industry-specific rules",
    category: "3. Employee",
    enumValues: [
      "food_service", "healthcare", "retail", "hotel", "security",
      "domestic", "agricultural", "office", "driver", "nurse", "other",
    ],
  },

  // 3.4 Tenure & Union
  { path: "employee.tenure_months", type: "number", description: "Months employed with current employer", category: "3. Employee" },
  { path: "employee.hours_worked_last_12_months", type: "number", description: "Total hours worked in prior 12 months (for FMLA eligibility)", category: "3. Employee" },
  { path: "employee.hire_date", type: "date", description: "Employee hire date (ISO YYYY-MM-DD)", category: "3. Employee" },
  { path: "employee.union_member", type: "boolean", description: "Whether employee is a union member", category: "3. Employee" },

  // 3.5 Work Arrangement
  { path: "employee.remote_worker", type: "boolean", description: "Whether employee works remotely", category: "3. Employee" },

  // 3.6 Compensation
  { path: "employee.regular_hourly_rate", type: "money", description: "Employee regular hourly pay rate in dollars", category: "3. Employee" },
  { path: "employee.cash_wage", type: "money", description: "Tipped employee cash wage before tip credit (dollars/hour)", category: "3. Employee" },
  { path: "employee.weekly_salary", type: "money", description: "Weekly salary in dollars (for exemption threshold tests)", category: "3. Employee" },
  { path: "employee.tipped_status", type: "enum", description: "Whether employee receives tips",
    category: "3. Employee",
    enumValues: ["tipped", "non_tipped"],
  },
  { path: "employee.receives_service_charges", type: "boolean", description: "Whether employee receives service charges (distinct from tips)", category: "3. Employee" },
  { path: "employee.pay_structure", type: "enum", description: "How employee is paid (for exemption tests)",
    category: "3. Employee",
    enumValues: ["hourly", "salary", "piece_rate", "commission", "day_rate"],
  },
  { path: "employee.pay_frequency", type: "enum", description: "How often employee is paid",
    category: "3. Employee",
    enumValues: ["weekly", "biweekly", "semimonthly", "monthly"],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. SHIFT — Current Work Period
  // ═══════════════════════════════════════════════════════════════════

  // 4.1 Timing
  { path: "shift.date", type: "date", description: "Shift date (ISO YYYY-MM-DD)", category: "4. Shift" },
  { path: "shift.start_time", type: "string", description: "Shift start time (HH:MM, 24-hour)", category: "4. Shift" },
  { path: "shift.end_time", type: "string", description: "Shift end time (HH:MM, 24-hour)", category: "4. Shift" },
  { path: "shift.start_hour", type: "number", description: "Shift start hour (0-23, for time-of-day comparisons)", category: "4. Shift" },
  { path: "shift.end_hour", type: "number", description: "Shift end hour (0-23, for curfew comparisons)", category: "4. Shift" },
  { path: "shift.shift_length_hours", type: "number", description: "Length of the current shift in hours", category: "4. Shift" },

  // 4.2 Hours Worked
  { path: "shift.hours_worked_today", type: "number", description: "Hours worked in the current day", category: "4. Shift" },
  { path: "shift.hours_worked_this_week", type: "number", description: "Hours worked in the current workweek", category: "4. Shift" },
  { path: "shift.consecutive_days_worked", type: "number", description: "Number of consecutive days worked including today", category: "4. Shift" },
  { path: "shift.is_seventh_consecutive_day", type: "boolean", description: "Whether this is the 7th consecutive day worked", category: "4. Shift" },

  // 4.3 Shift Type
  { path: "shift.is_split_shift", type: "boolean", description: "Whether this is a split shift", category: "4. Shift" },
  { path: "shift.split_shift_gap_minutes", type: "number", description: "Minutes between split shift segments", category: "4. Shift" },
  { path: "shift.is_on_call", type: "boolean", description: "Whether this is an on-call shift", category: "4. Shift" },
  { path: "shift.is_holiday", type: "boolean", description: "Whether the shift falls on a recognized holiday", category: "4. Shift" },
  { path: "shift.is_school_day", type: "boolean", description: "Whether it is a school day (for minor labor rules)", category: "4. Shift" },
  { path: "shift.school_in_session", type: "boolean", description: "Whether school is in session (school year vs summer)", category: "4. Shift" },
  { path: "shift.hours_since_last_shift_end", type: "number", description: "Hours between end of last shift and start of this one (clopening)", category: "4. Shift" },
  { path: "shift.hours_worked_at_report", type: "number", description: "Hours actually worked when employee reported (for reporting time pay)", category: "4. Shift" },
  { path: "shift.scheduled_hours", type: "number", description: "Originally scheduled shift length in hours", category: "4. Shift" },
  { path: "shift.paid_hours", type: "number", description: "Actual hours paid for the shift (may differ from worked hours due to reporting time pay)", category: "4. Shift" },
  { path: "shift.employee_reported", type: "boolean", description: "Whether the employee reported to work as scheduled", category: "4. Shift" },
  { path: "shift.sent_home_early", type: "boolean", description: "Whether the employee was sent home before shift end", category: "4. Shift" },
  { path: "shift.spread_of_hours", type: "number", description: "Total span from first clock-in to last clock-out in a day (includes breaks)", category: "4. Shift" },

  // 4.4 Breaks
  { path: "shift.meal_break_provided", type: "boolean", description: "Whether a meal break was provided", category: "4. Shift" },
  { path: "shift.meal_break_minutes", type: "number", description: "Duration of meal break in minutes", category: "4. Shift" },
  { path: "shift.meal_break_waived", type: "boolean", description: "Whether meal break was waived by mutual consent", category: "4. Shift" },
  { path: "shift.rest_break_provided", type: "boolean", description: "Whether a rest break was provided", category: "4. Shift" },
  { path: "shift.rest_break_minutes", type: "number", description: "Duration of rest break in minutes", category: "4. Shift" },

  // ═══════════════════════════════════════════════════════════════════
  // 5. SCHEDULE — Predictive Scheduling & Changes
  // ═══════════════════════════════════════════════════════════════════

  { path: "schedule.advance_notice_days", type: "number", description: "Days in advance the schedule was posted", category: "5. Schedule" },
  { path: "schedule.was_changed", type: "boolean", description: "Whether the schedule was changed after posting", category: "5. Schedule" },
  { path: "schedule.change_type", type: "enum", description: "Type of schedule change",
    category: "5. Schedule",
    enumValues: [
      "hours_added", "hours_reduced", "time_changed", "location_changed",
      "shift_cancelled", "on_call_to_work", "on_call_not_needed",
    ],
  },
  { path: "schedule.hours_added", type: "number", description: "Number of hours added to schedule", category: "5. Schedule" },
  { path: "schedule.hours_reduced", type: "number", description: "Number of hours reduced from schedule", category: "5. Schedule" },
  { path: "schedule.employee_consented", type: "boolean", description: "Whether the employee consented to the change", category: "5. Schedule" },
  { path: "schedule.employer_initiated", type: "boolean", description: "Whether the change was employer-initiated", category: "5. Schedule" },
  { path: "schedule.called_in", type: "boolean", description: "Whether employee was called in to work", category: "5. Schedule" },
  { path: "schedule.good_faith_estimate_provided", type: "boolean", description: "Whether a good faith schedule estimate was provided at hire", category: "5. Schedule" },
  { path: "schedule.new_hire_pending", type: "boolean", description: "Whether the employer is about to hire a new employee, or bring in agency or temporary staff, to cover hours", category: "5. Schedule" },
  { path: "schedule.hours_offered_to_existing_staff", type: "boolean", description: "Whether those hours were first offered to existing (part-time) employees for the required window", category: "5. Schedule" },

  // ═══════════════════════════════════════════════════════════════════
  // 6. LEAVE — Leave Law Applicability
  // ═══════════════════════════════════════════════════════════════════

  { path: "leave.type", type: "enum", description: "Type of leave requested",
    category: "6. Leave",
    enumValues: [
      "sick", "family", "medical", "parental", "bereavement",
      "jury_duty", "voting", "domestic_violence", "military", "school_activity",
    ],
  },
  { path: "leave.reason", type: "enum", description: "Specific qualifying reason for leave",
    category: "6. Leave",
    enumValues: [
      "own_illness", "family_illness", "childbirth", "adoption", "foster_care",
      "military_deployment", "domestic_violence", "sexual_assault", "stalking", "other",
    ],
  },
  { path: "leave.family_relationship", type: "enum", description: "Relationship to family member (for FMLA qualifying)",
    category: "6. Leave",
    enumValues: ["spouse", "child", "parent", "sibling", "grandparent", "grandchild", "domestic_partner", "in_law"],
  },
  { path: "leave.is_intermittent", type: "boolean", description: "Whether leave is taken intermittently", category: "6. Leave" },
  { path: "leave.hours_requested", type: "number", description: "Hours of leave requested", category: "6. Leave" },
  { path: "leave.hours_accrued", type: "number", description: "Hours of leave accrued/available", category: "6. Leave" },
  { path: "leave.days_notice_given", type: "number", description: "Days of advance notice given for leave request", category: "6. Leave" },
  { path: "leave.medical_certification_provided", type: "boolean", description: "Whether medical certification was provided", category: "6. Leave" },
  { path: "leave.start_date", type: "date", description: "Leave start date (ISO YYYY-MM-DD)", category: "6. Leave" },
  { path: "leave.end_date", type: "date", description: "Leave end date (ISO YYYY-MM-DD)", category: "6. Leave" },
  { path: "leave.family_medical_weeks_available", type: "number", description: "Weeks of family/medical leave available per year", category: "6. Leave" },
  { path: "leave.sick_hours_accrued", type: "number", description: "Sick leave hours accrued/available", category: "6. Leave" },

  // ═══════════════════════════════════════════════════════════════════
  // 7. TERMINATION — Final Pay & Separation
  // ═══════════════════════════════════════════════════════════════════

  { path: "termination.type", type: "enum", description: "Type of employment separation",
    category: "7. Termination",
    enumValues: [
      "voluntary_resignation", "involuntary_discharge", "layoff",
      "constructive_discharge", "end_of_contract", "retirement",
    ],
  },
  { path: "termination.reason", type: "string", description: "Reason for termination (for final pay timing rules)", category: "7. Termination" },
  { path: "termination.days_since_separation", type: "number", description: "Calendar days since employment ended", category: "7. Termination" },
  { path: "termination.is_mass_layoff", type: "boolean", description: "Whether this is part of a mass layoff", category: "7. Termination" },
  { path: "termination.employees_affected", type: "number", description: "Number of employees affected in mass layoff", category: "7. Termination" },
  { path: "termination.notice_days_given", type: "number", description: "Days of advance notice given before separation", category: "7. Termination" },

  // ═══════════════════════════════════════════════════════════════════
  // 8. PAYROLL — Pay Frequency & Timing
  // ═══════════════════════════════════════════════════════════════════

  { path: "payroll.pay_frequency", type: "enum", description: "Employer pay frequency",
    category: "8. Payroll",
    enumValues: ["weekly", "biweekly", "semimonthly", "monthly"],
  },
  { path: "payroll.days_since_pay_period_end", type: "number", description: "Days elapsed since end of pay period (for timely payment rules)", category: "8. Payroll" },

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
 * Get the type of a registered fact.
 */
export function getFactType(path: string): FactType | undefined {
  return FACT_MAP.get(path)?.type;
}

/**
 * Get all registered fact definitions.
 */
export function getAllFacts(): readonly FactDefinition[] {
  return FACTS;
}

/**
 * Get all canonical fact definitions.
 */
export function getCanonicalFacts(): readonly FactDefinition[] {
  return FACTS;
}

/**
 * Get enum values for a fact (if it's an enum type).
 */
export function getEnumValues(path: string): string[] | undefined {
  const fact = FACT_MAP.get(path);
  if (fact?.type === "enum") return fact.enumValues;
  return undefined;
}
