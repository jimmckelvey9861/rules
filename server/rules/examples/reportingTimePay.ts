/**
 * Reporting Time Pay / Show-Up Pay / Call-In Pay
 *
 * These rules require employers to pay a minimum number of hours when an
 * employee reports to work but is sent home early or given less work than
 * scheduled. Critical for scheduling compliance — they fire whenever you
 * shorten or cancel a shift after the employee arrives.
 *
 * NY:  12 NYCRR §142-2.3 — "call-in pay" minimum 4 hrs at min wage
 * CT:  CT Regs. §31-62-D1 — reporting time minimum 4 hrs pay
 * CA:  IWC Wage Orders §5(A) — half scheduled shift (min 2 hrs, max 4 hrs)
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ═══════════════════════════════════════════════════════════════════
// NEW YORK — 12 NYCRR §142-2.3 (Call-In Pay)
// ═══════════════════════════════════════════════════════════════════

/**
 * NY: An employee who reports to work must be paid for at least 4 hours
 * (or the number of hours in the scheduled shift, whichever is less)
 * at the applicable minimum wage rate.
 *
 * This applies to all non-exempt employees in non-farm industries.
 */
export const nyCallInPay: Rule = createRule({
  id: "ny-call-in-pay",
  title: "New York Call-In Pay (minimum 4 hours)",
  jurisdiction: "NY",
  topic: "reporting_time_pay",
  effectiveFrom: "2011-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.employee_reported", op: "=", value: true },
      { fact: "shift.sent_home_early", op: "=", value: true },
      { fact: "shift.hours_worked_at_report", op: "<", value: 4 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "call_in_pay",
    amount: 4,
    formula: "Pay for minimum 4 hours (or scheduled hours if less) at applicable minimum wage",
  },

  citations: [
    {
      source: "12 NYCRR §142-2.3",
      url: "https://www.nysenate.gov/legislation/laws/LAB/A6",
      section: "12 NYCRR §142-2.3",
    },
  ],
});

/**
 * NY: Additional call-in pay rule — if an employee is not requested to
 * report but the employer requires them to be available (on-call and
 * contacted to report), they must receive at least 4 hours of call-in pay.
 */
export const nyCallInPayOnCall: Rule = createRule({
  id: "ny-call-in-pay-oncall",
  title: "New York Call-In Pay — On-Call Employee (minimum 4 hours)",
  jurisdiction: "NY",
  topic: "reporting_time_pay",
  effectiveFrom: "2011-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.is_on_call", op: "=", value: true },
      { fact: "shift.employee_reported", op: "=", value: true },
      { fact: "shift.hours_worked_at_report", op: "<", value: 4 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "call_in_pay",
    amount: 4,
    formula: "Pay for minimum 4 hours at applicable minimum wage when called in from on-call status",
  },

  citations: [
    {
      source: "12 NYCRR §142-2.3",
      url: "https://www.nysenate.gov/legislation/laws/LAB/A6",
      section: "12 NYCRR §142-2.3",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// CONNECTICUT — CT Regs. §31-62-D1
// ═══════════════════════════════════════════════════════════════════

/**
 * CT: An employee who reports to work on a regularly scheduled workday
 * must be paid for at least 4 hours at the minimum wage rate, even if
 * they are sent home before completing 4 hours.
 */
export const ctReportingTimePay: Rule = createRule({
  id: "ct-reporting-time-pay",
  title: "Connecticut Reporting Time Pay (minimum 4 hours)",
  jurisdiction: "CT",
  topic: "reporting_time_pay",
  effectiveFrom: "2003-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CT" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.employee_reported", op: "=", value: true },
      { fact: "shift.sent_home_early", op: "=", value: true },
      { fact: "shift.hours_worked_at_report", op: "<", value: 4 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "reporting_time_pay",
    amount: 4,
    formula: "Pay for minimum 4 hours at minimum wage rate",
  },

  citations: [
    {
      source: "CT Regs. §31-62-D1",
      url: "https://www.ctdol.state.ct.us/wgwkstnd/laws-regs/statute31-62.htm",
      section: "§31-62-D1",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// CALIFORNIA — IWC Wage Orders §5(A) (Reporting Time Pay)
// ═══════════════════════════════════════════════════════════════════

/**
 * CA: An employee who reports to work and is not put to work or is
 * furnished less than half the usual/scheduled day's work must be paid
 * for half the scheduled hours (minimum 2 hours, maximum 4 hours) at
 * the employee's regular rate.
 *
 * Example: Scheduled for 8 hrs, sent home after 1 hr → pay for 4 hrs.
 * Example: Scheduled for 3 hrs, sent home after 0.5 hr → pay for 2 hrs (minimum).
 */
export const caReportingTimePay: Rule = createRule({
  id: "ca-reporting-time-pay",
  title: "California Reporting Time Pay (half scheduled shift, min 2 hrs, max 4 hrs)",
  jurisdiction: "CA",
  topic: "reporting_time_pay",
  effectiveFrom: "2001-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.employee_reported", op: "=", value: true },
      { fact: "shift.sent_home_early", op: "=", value: true },
      { fact: "shift.hours_worked_at_report", op: "<", value: 4 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "reporting_time_pay",
    formula: "Half the scheduled shift hours at regular rate (minimum 2 hours, maximum 4 hours)",
  },

  citations: [
    {
      source: "IWC Wage Order 5-2001, §5(A)",
      url: "https://www.dir.ca.gov/iwc/wageorderindustries.htm",
      section: "§5(A) Reporting Time Pay",
    },
  ],
});

/**
 * CA: Second reporting — if an employee is required to report for a
 * second time in any one workday and is furnished less than 2 hours of
 * work, they must be paid for 2 hours at the regular rate.
 */
export const caReportingTimePaySecond: Rule = createRule({
  id: "ca-reporting-time-pay-second",
  title: "California Second Reporting Time Pay (minimum 2 hours)",
  jurisdiction: "CA",
  topic: "reporting_time_pay",
  effectiveFrom: "2001-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.is_split_shift", op: "=", value: true },
      { fact: "shift.employee_reported", op: "=", value: true },
      { fact: "shift.sent_home_early", op: "=", value: true },
      { fact: "shift.hours_worked_at_report", op: "<", value: 2 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "reporting_time_pay",
    amount: 2,
    formula: "Pay for minimum 2 hours at regular rate for second reporting in one workday",
  },

  citations: [
    {
      source: "IWC Wage Order 5-2001, §5(B)",
      url: "https://www.dir.ca.gov/iwc/wageorderindustries.htm",
      section: "§5(B) Reporting Time Pay — Second Report",
    },
  ],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_REPORTING_TIME_PAY_RULES: readonly Rule[] = [
  nyCallInPay,
  nyCallInPayOnCall,
  ctReportingTimePay,
  caReportingTimePay,
  caReportingTimePaySecond,
];
