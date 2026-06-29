/**
 * Overtime Rules — Priority States
 *
 * States: NY, DC, VA, MD, NJ, CT, NV
 * (CA already covered in californiaDailyOvertime.ts and californiaDoubleTime.ts)
 *
 * Most states mirror federal (weekly > 40 at 1.5x).
 * Nevada is unique: daily overtime after 8 hours for lower-paid employees.
 * Connecticut: 7th consecutive day premium for restaurant/hotel workers.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── New York ──────────────────────────────────────────────────────

export const newYorkWeeklyOvertime: Rule = createRule({
  id: "ny-weekly-overtime-40",
  title: "New York Weekly Overtime",
  jurisdiction: "NY",
  topic: "overtime",
  effectiveFrom: "2000-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_this_week", op: ">", value: 40 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
  },

  citations: [
    {
      source: "NY Labor Law §160, 12 NYCRR §142-2.2",
      url: "https://dol.ny.gov/overtime",
      section: "12 NYCRR §142-2.2",
    },
  ],
});

// NY residential (live-in) workers: overtime after 44 hours
export const newYorkResidentialOvertime: Rule = createRule({
  id: "ny-residential-overtime-44",
  title: "New York Residential Worker Overtime (44 hours)",
  jurisdiction: "NY",
  topic: "overtime",
  effectiveFrom: "2000-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employee.job_category", op: "=", value: "domestic" },
      { fact: "shift.hours_worked_this_week", op: ">", value: 44 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
  },

  citations: [
    {
      source: "NY Labor Law §170, 12 NYCRR §142-2.2",
      url: "https://dol.ny.gov/overtime",
      section: "12 NYCRR §142-2.2 (residential employees)",
    },
  ],
});

// ─── District of Columbia ──────────────────────────────────────────

export const dcWeeklyOvertime: Rule = createRule({
  id: "dc-weekly-overtime-40",
  title: "District of Columbia Weekly Overtime",
  jurisdiction: "DC",
  topic: "overtime",
  effectiveFrom: "2000-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "DC" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_this_week", op: ">", value: 40 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
  },

  citations: [
    {
      source: "DC Code §32-1003(c)",
      url: "https://code.dccouncil.gov/us/dc/council/code/sections/32-1003",
      section: "DC Code §32-1003(c)",
    },
  ],
});

// ─── Virginia ──────────────────────────────────────────────────────

export const virginiaWeeklyOvertime: Rule = createRule({
  id: "va-weekly-overtime-40",
  title: "Virginia Weekly Overtime",
  jurisdiction: "VA",
  topic: "overtime",
  effectiveFrom: "2021-05-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "VA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_this_week", op: ">", value: 40 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
  },

  citations: [
    {
      source: "Virginia Overtime Wage Act, Code of Virginia §40.1-29.2",
      url: "https://law.lis.virginia.gov/vacode/title40.1/chapter3/section40.1-29.2/",
      section: "Va. Code §40.1-29.2",
    },
  ],
});

// ─── Maryland ──────────────────────────────────────────────────────

export const marylandWeeklyOvertime: Rule = createRule({
  id: "md-weekly-overtime-40",
  title: "Maryland Weekly Overtime",
  jurisdiction: "MD",
  topic: "overtime",
  effectiveFrom: "2000-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MD" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_this_week", op: ">", value: 40 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
  },

  citations: [
    {
      source: "Maryland Wage and Hour Law, Md. Code Lab. & Empl. §3-415",
      url: "https://www.dllr.state.md.us/labor/wages/overtimelaw.shtml",
      section: "Md. Code Lab. & Empl. §3-415",
    },
  ],
});

// ─── New Jersey ────────────────────────────────────────────────────

export const newJerseyWeeklyOvertime: Rule = createRule({
  id: "nj-weekly-overtime-40",
  title: "New Jersey Weekly Overtime",
  jurisdiction: "NJ",
  topic: "overtime",
  effectiveFrom: "2000-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NJ" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_this_week", op: ">", value: 40 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
  },

  citations: [
    {
      source: "New Jersey Wage and Hour Law, N.J.S.A. 34:11-56a4",
      url: "https://www.nj.gov/labor/wageandhour/tools-resources/overtime/",
      section: "N.J.S.A. 34:11-56a4",
    },
  ],
});

// ─── Connecticut ───────────────────────────────────────────────────

export const connecticutWeeklyOvertime: Rule = createRule({
  id: "ct-weekly-overtime-40",
  title: "Connecticut Weekly Overtime",
  jurisdiction: "CT",
  topic: "overtime",
  effectiveFrom: "2000-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CT" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_this_week", op: ">", value: 40 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
  },

  citations: [
    {
      source: "Connecticut General Statutes §31-76c",
      url: "https://www.ctdol.state.ct.us/wgwkstnd/wage-hour/overtime.htm",
      section: "Conn. Gen. Stat. §31-76c",
    },
  ],
});

// ─── Nevada ────────────────────────────────────────────────────────

// Nevada: Daily overtime after 8 hours for employees earning < 1.5x minimum wage
export const nevadaDailyOvertime: Rule = createRule({
  id: "nv-daily-overtime-8",
  title: "Nevada Daily Overtime (employees earning < 1.5x minimum wage)",
  jurisdiction: "NV",
  topic: "overtime",
  effectiveFrom: "2024-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NV" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employee.regular_hourly_rate", op: "<", value: 18.00 },
      { fact: "shift.hours_worked_today", op: ">", value: 8 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
  },

  citations: [
    {
      source: "Nevada Revised Statutes §608.018",
      url: "https://www.leg.state.nv.us/nrs/nrs-608.html#NRS608Sec018",
      section: "NRS §608.018",
    },
  ],
});

// Nevada: Weekly overtime after 40 hours (all non-exempt)
export const nevadaWeeklyOvertime: Rule = createRule({
  id: "nv-weekly-overtime-40",
  title: "Nevada Weekly Overtime",
  jurisdiction: "NV",
  topic: "overtime",
  effectiveFrom: "2024-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NV" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_this_week", op: ">", value: 40 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
  },

  citations: [
    {
      source: "Nevada Revised Statutes §608.018",
      url: "https://www.leg.state.nv.us/nrs/nrs-608.html#NRS608Sec018",
      section: "NRS §608.018",
    },
  ],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_PRIORITY_STATE_OVERTIME: readonly Rule[] = [
  newYorkWeeklyOvertime,
  newYorkResidentialOvertime,
  dcWeeklyOvertime,
  virginiaWeeklyOvertime,
  marylandWeeklyOvertime,
  newJerseyWeeklyOvertime,
  connecticutWeeklyOvertime,
  nevadaDailyOvertime,
  nevadaWeeklyOvertime,
];
