/**
 * Reporting Time Pay — Additional States
 *
 * Already covered in reportingTimePay.ts: NY, CT, CA
 * This file adds: MA, NH, OR, RI
 *
 * These rules fire when an employee reports to work but is sent home
 * early or given less work than scheduled.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ═══════════════════════════════════════════════════════════════════
// MASSACHUSETTS — 454 CMR 27.04
// ═══════════════════════════════════════════════════════════════════

/**
 * MA: An employee who reports to work and is scheduled for 3+ hours
 * must be paid for at least 3 hours at minimum wage, even if sent
 * home early.
 */
export const maReportingTimePay: Rule = createRule({
  id: "ma-reporting-time-pay",
  title: "Massachusetts Reporting Time Pay (minimum 3 hours)",
  jurisdiction: "MA",
  topic: "reporting_time_pay",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.employee_reported", op: "=", value: true },
      { fact: "shift.sent_home_early", op: "=", value: true },
      { fact: "shift.scheduled_hours", op: ">=", value: 3 },
      { fact: "shift.hours_worked_at_report", op: "<", value: 3 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "reporting_time_pay",
    amount: 3,
    formula: "Pay for minimum 3 hours at minimum wage rate",
  },

  citations: [
    {
      source: "454 CMR 27.04(1)",
      url: "https://www.mass.gov/info-details/454-cmr-2700-minimum-wage",
      section: "454 CMR 27.04(1)",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// NEW HAMPSHIRE — NH RSA §275:43-a
// ═══════════════════════════════════════════════════════════════════

/**
 * NH: An employee who reports to work at the employer's request must
 * be paid for at least 2 hours at the regular rate.
 */
export const nhReportingTimePay: Rule = createRule({
  id: "nh-reporting-time-pay",
  title: "New Hampshire Reporting Time Pay (minimum 2 hours)",
  jurisdiction: "NH",
  topic: "reporting_time_pay",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NH" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.employee_reported", op: "=", value: true },
      { fact: "shift.sent_home_early", op: "=", value: true },
      { fact: "shift.hours_worked_at_report", op: "<", value: 2 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "reporting_time_pay",
    amount: 2,
    formula: "Pay for minimum 2 hours at regular rate",
  },

  citations: [
    {
      source: "NH RSA §275:43-a",
      url: "https://www.nh.gov/labor/inspection/wage-hour/minimum-wage.htm",
      section: "RSA §275:43-a",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// OREGON — OAR 839-020-0041
// ═══════════════════════════════════════════════════════════════════

/**
 * OR: If an employee is required to report but not put to work or
 * given less than half the scheduled shift, they must be paid for
 * half the scheduled shift (minimum 1 hour, maximum 4 hours).
 */
export const orReportingTimePay: Rule = createRule({
  id: "or-reporting-time-pay",
  title: "Oregon Reporting Time Pay (half scheduled shift, min 1 hr)",
  jurisdiction: "OR",
  topic: "reporting_time_pay",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "OR" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.employee_reported", op: "=", value: true },
      { fact: "shift.sent_home_early", op: "=", value: true },
      { fact: "shift.hours_worked_at_report", op: "<", value: 4 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "reporting_time_pay",
    formula: "Half the scheduled shift at regular rate (minimum 1 hour)",
  },

  citations: [
    {
      source: "OAR 839-020-0041",
      url: "https://www.oregon.gov/boli/workers/pages/reporting-time-pay.aspx",
      section: "OAR 839-020-0041",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// RHODE ISLAND — RI Gen. Laws §28-3-4
// ═══════════════════════════════════════════════════════════════════

/**
 * RI: An employee scheduled for 8+ hours who reports to work must
 * be paid for at least 3 hours, even if sent home early.
 */
export const riReportingTimePay: Rule = createRule({
  id: "ri-reporting-time-pay",
  title: "Rhode Island Reporting Time Pay (3 hrs if scheduled 8+)",
  jurisdiction: "RI",
  topic: "reporting_time_pay",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "RI" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.employee_reported", op: "=", value: true },
      { fact: "shift.sent_home_early", op: "=", value: true },
      { fact: "shift.scheduled_hours", op: ">=", value: 8 },
      { fact: "shift.hours_worked_at_report", op: "<", value: 3 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "reporting_time_pay",
    amount: 3,
    formula: "Pay for minimum 3 hours at regular rate when scheduled for 8+ hours",
  },

  citations: [
    {
      source: "RI Gen. Laws §28-3-4",
      url: "https://dlt.ri.gov/individuals/workplace-protections/reporting-pay",
      section: "§28-3-4",
    },
  ],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_ADDITIONAL_REPORTING_TIME_RULES: readonly Rule[] = [
  maReportingTimePay,
  nhReportingTimePay,
  orReportingTimePay,
  riReportingTimePay,
];
