/**
 * Sick Leave Accrual — Priority States
 *
 * These rules define mandatory paid sick leave accrual rates.
 * They fire as a "minimum_required_value" — the employer must provide
 * at least this accrual rate. Relevant to scheduling because:
 * - Employees can use accrued sick leave to cover shifts
 * - Employers cannot deny use of accrued sick leave
 * - Some states require frontloading at start of year
 *
 * NY:  Labor Law §196-b (2020)
 * NJ:  NJSA §34:11D-1 (2018)
 * CT:  Gen. Stat. §31-57s (2012, expanded 2024)
 * MD:  Healthy Working Families Act (2018)
 * NV:  SB 312 / NRS §608.0197 (2020)
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ═══════════════════════════════════════════════════════════════════
// NEW YORK — Labor Law §196-b (effective Sept 30, 2020)
// ═══════════════════════════════════════════════════════════════════

/**
 * NY: Employers with 5+ employees must provide paid sick leave
 * accruing at 1 hour per 30 hours worked, up to 56 hours/year.
 * Employers with 100+ employees must provide up to 56 hours.
 * Employers with 5-99 employees: up to 40 hours.
 */
export const nySickLeaveLargeEmployer: Rule = createRule({
  id: "ny-sick-leave-100-plus",
  title: "NY Paid Sick Leave — 100+ employees (1 hr / 30 hrs, up to 56 hrs/yr)",
  jurisdiction: "NY",
  topic: "sick_leave",
  effectiveFrom: "2020-09-30",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employer.total_employees", op: ">=", value: 100 },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "leave.hours_accrued",
    minimum: 56,
    unit: "hours per year (accrued at 1 hr per 30 hrs worked)",
  },

  citations: [
    {
      source: "NY Labor Law §196-b",
      url: "https://www.nysenate.gov/legislation/laws/LAB/196-B",
      section: "§196-b(1)(c)",
    },
  ],
});

export const nySickLeaveMediumEmployer: Rule = createRule({
  id: "ny-sick-leave-5-99",
  title: "NY Paid Sick Leave — 5-99 employees (1 hr / 30 hrs, up to 40 hrs/yr)",
  jurisdiction: "NY",
  topic: "sick_leave",
  effectiveFrom: "2020-09-30",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employer.total_employees", op: ">=", value: 5 },
      { fact: "employer.total_employees", op: "<", value: 100 },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "leave.hours_accrued",
    minimum: 40,
    unit: "hours per year (accrued at 1 hr per 30 hrs worked)",
  },

  citations: [
    {
      source: "NY Labor Law §196-b",
      url: "https://www.nysenate.gov/legislation/laws/LAB/196-B",
      section: "§196-b(1)(b)",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// NEW JERSEY — NJSA §34:11D-1 (effective Oct 29, 2018)
// ═══════════════════════════════════════════════════════════════════

/**
 * NJ: All employers must provide paid sick leave accruing at
 * 1 hour per 30 hours worked, up to 40 hours per benefit year.
 */
export const njSickLeave: Rule = createRule({
  id: "nj-sick-leave",
  title: "NJ Earned Sick Leave (1 hr / 30 hrs worked, up to 40 hrs/yr)",
  jurisdiction: "NJ",
  topic: "sick_leave",
  effectiveFrom: "2018-10-29",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NJ" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "leave.hours_accrued",
    minimum: 40,
    unit: "hours per benefit year (accrued at 1 hr per 30 hrs worked)",
  },

  citations: [
    {
      source: "NJSA §34:11D-1 et seq.",
      url: "https://www.nj.gov/labor/worker-protections/earnedsick/law.shtml",
      section: "§34:11D-2",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// CONNECTICUT — Gen. Stat. §31-57s (effective Jan 1, 2012; expanded 2024)
// ═══════════════════════════════════════════════════════════════════

/**
 * CT: Employers with 50+ employees must provide paid sick leave to
 * service workers, accruing at 1 hour per 40 hours worked, up to
 * 40 hours per year. (As of Jan 2025, expanded to all employers
 * with 25+ employees and all worker types.)
 */
export const ctSickLeave: Rule = createRule({
  id: "ct-sick-leave",
  title: "CT Paid Sick Leave (1 hr / 40 hrs worked, up to 40 hrs/yr)",
  jurisdiction: "CT",
  topic: "sick_leave",
  effectiveFrom: "2012-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CT" },
      { fact: "employer.total_employees", op: ">=", value: 25 },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "leave.hours_accrued",
    minimum: 40,
    unit: "hours per year (accrued at 1 hr per 40 hrs worked)",
  },

  citations: [
    {
      source: "CT Gen. Stat. §31-57s",
      url: "https://www.cga.ct.gov/current/pub/chap_557.htm#sec_31-57s",
      section: "§31-57s",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// MARYLAND — Healthy Working Families Act (effective Feb 11, 2018)
// ═══════════════════════════════════════════════════════════════════

/**
 * MD: Employers with 15+ employees must provide paid sick and safe
 * leave accruing at 1 hour per 30 hours worked, up to 64 hours/year.
 * Employers with fewer than 15 must provide unpaid leave.
 */
export const mdSickLeavePaid: Rule = createRule({
  id: "md-sick-leave-paid",
  title: "MD Paid Sick & Safe Leave — 15+ employees (1 hr / 30 hrs, up to 64 hrs/yr)",
  jurisdiction: "MD",
  topic: "sick_leave",
  effectiveFrom: "2018-02-11",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MD" },
      { fact: "employer.total_employees", op: ">=", value: 15 },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "leave.hours_accrued",
    minimum: 64,
    unit: "hours per year (accrued at 1 hr per 30 hrs worked)",
  },

  citations: [
    {
      source: "MD Healthy Working Families Act, Labor & Empl. §3-1304",
      url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gle&section=3-1304",
      section: "§3-1304",
    },
  ],
});

export const mdSickLeaveUnpaid: Rule = createRule({
  id: "md-sick-leave-unpaid",
  title: "MD Unpaid Sick & Safe Leave — <15 employees (1 hr / 30 hrs, up to 64 hrs/yr)",
  jurisdiction: "MD",
  topic: "sick_leave",
  effectiveFrom: "2018-02-11",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MD" },
      { fact: "employer.total_employees", op: "<", value: 15 },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "leave.hours_accrued",
    minimum: 64,
    unit: "hours per year unpaid (accrued at 1 hr per 30 hrs worked)",
  },

  citations: [
    {
      source: "MD Healthy Working Families Act, Labor & Empl. §3-1304",
      url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gle&section=3-1304",
      section: "§3-1304",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// NEVADA — SB 312 / NRS §608.0197 (effective Jan 1, 2020)
// ═══════════════════════════════════════════════════════════════════

/**
 * NV: Employers with 50+ employees must provide paid leave (not
 * limited to sick — can be used for any reason) accruing at
 * 0.01923 hours per hour worked (≈1 hr per 52 hrs), up to 40 hrs/yr.
 */
export const nvPaidLeave: Rule = createRule({
  id: "nv-paid-leave",
  title: "NV Paid Leave — 50+ employees (0.01923 hrs/hr worked, up to 40 hrs/yr)",
  jurisdiction: "NV",
  topic: "sick_leave",
  effectiveFrom: "2020-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NV" },
      { fact: "employer.total_employees", op: ">=", value: 50 },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "leave.hours_accrued",
    minimum: 40,
    unit: "hours per benefit year (accrued at 0.01923 hrs per hr worked)",
  },

  citations: [
    {
      source: "NRS §608.0197 (SB 312)",
      url: "https://www.leg.state.nv.us/nrs/nrs-608.html#NRS608Sec0197",
      section: "NRS §608.0197",
    },
  ],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_SICK_LEAVE_RULES: readonly Rule[] = [
  nySickLeaveLargeEmployer,
  nySickLeaveMediumEmployer,
  njSickLeave,
  ctSickLeave,
  mdSickLeavePaid,
  mdSickLeaveUnpaid,
  nvPaidLeave,
];
