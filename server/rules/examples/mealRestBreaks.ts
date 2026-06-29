/**
 * Meal & Rest Break Rules — Priority States
 *
 * NY:  Labor Law §162 — complex rules by industry type
 * CT:  Gen. Stat. §31-51ii — 30 min after 7.5 consecutive hours
 * NV:  NRS §608.019 — 30 min meal for 8+ hrs, 10 min rest per 4 hrs
 * MD:  Labor & Empl. §3-710 — retail only
 * CA:  IWC Order 5 / Lab. Code §226.7 — 10 min rest per 4 hrs (meal already exists)
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ═══════════════════════════════════════════════════════════════════
// NEW YORK — Labor Law §162
// ═══════════════════════════════════════════════════════════════════

/**
 * NY §162(2): Non-factory workers get 30 min between 11am-2pm for shifts
 * spanning that period and lasting >6 hours.
 */
export const nyMealBreakNonFactory: Rule = createRule({
  id: "ny-meal-break-nonfactory",
  title: "New York Meal Break — Non-Factory (>6 hr shift spanning noon)",
  jurisdiction: "NY",
  topic: "meal_break",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">", value: 6 },
      { fact: "shift.meal_break_provided", op: "=", value: false },
      { fact: "employer.industry_tag", op: "!=", value: "manufacturing" },
    ],
  },

  result: {
    type: "required_break",
    breakType: "meal",
    minimumMinutes: 30,
  },

  citations: [
    {
      source: "NY Labor Law §162(2)",
      url: "https://www.nysenate.gov/legislation/laws/LAB/162",
      section: "§162(2)",
    },
  ],
});

/**
 * NY §162(1): Factory workers get 60 min between 11am-1pm for shifts
 * spanning that period.
 */
export const nyMealBreakFactory: Rule = createRule({
  id: "ny-meal-break-factory",
  title: "New York Meal Break — Factory (60 min noon break)",
  jurisdiction: "NY",
  topic: "meal_break",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">", value: 6 },
      { fact: "shift.meal_break_provided", op: "=", value: false },
      { fact: "employer.industry_tag", op: "=", value: "manufacturing" },
    ],
  },

  result: {
    type: "required_break",
    breakType: "meal",
    minimumMinutes: 60,
  },

  citations: [
    {
      source: "NY Labor Law §162(1)",
      url: "https://www.nysenate.gov/legislation/laws/LAB/162",
      section: "§162(1)",
    },
  ],
});

/**
 * NY §162(3): All workers on shifts starting before 11am and continuing
 * past 7pm get an additional 20-minute meal break between 5pm-7pm.
 */
export const nyMealBreakAdditionalEvening: Rule = createRule({
  id: "ny-meal-break-evening",
  title: "New York Additional Evening Meal Break (shift past 7pm)",
  jurisdiction: "NY",
  topic: "meal_break",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">", value: 10 },
      { fact: "shift.meal_break_provided", op: "=", value: false },
    ],
  },

  result: {
    type: "required_break",
    breakType: "meal",
    minimumMinutes: 20,
  },

  citations: [
    {
      source: "NY Labor Law §162(3)",
      url: "https://www.nysenate.gov/legislation/laws/LAB/162",
      section: "§162(3)",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// CONNECTICUT — Gen. Stat. §31-51ii
// ═══════════════════════════════════════════════════════════════════

/**
 * CT: Employees working 7.5+ consecutive hours must receive a
 * 30-minute meal break within the first 7.5 hours.
 */
export const ctMealBreak: Rule = createRule({
  id: "ct-meal-break-7.5hr",
  title: "Connecticut Meal Break (7.5+ consecutive hours)",
  jurisdiction: "CT",
  topic: "meal_break",
  effectiveFrom: "2003-10-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CT" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">=", value: 7.5 },
      { fact: "shift.meal_break_provided", op: "=", value: false },
    ],
  },

  result: {
    type: "required_break",
    breakType: "meal",
    minimumMinutes: 30,
  },

  citations: [
    {
      source: "CT Gen. Stat. §31-51ii",
      url: "https://www.cga.ct.gov/current/pub/chap_558.htm#sec_31-51ii",
      section: "§31-51ii",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// NEVADA — NRS §608.019
// ═══════════════════════════════════════════════════════════════════

/**
 * NV: Employees working a continuous 8-hour shift must receive
 * a 30-minute meal break.
 */
export const nvMealBreak: Rule = createRule({
  id: "nv-meal-break-8hr",
  title: "Nevada Meal Break (8+ hour continuous shift)",
  jurisdiction: "NV",
  topic: "meal_break",
  effectiveFrom: "2007-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NV" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">=", value: 8 },
      { fact: "shift.meal_break_provided", op: "=", value: false },
    ],
  },

  result: {
    type: "required_break",
    breakType: "meal",
    minimumMinutes: 30,
  },

  citations: [
    {
      source: "NRS §608.019",
      url: "https://www.leg.state.nv.us/nrs/nrs-608.html#NRS608Sec019",
      section: "NRS §608.019(1)",
    },
  ],
});

/**
 * NV: Employees working 3.5+ continuous hours must receive a
 * 10-minute paid rest break per 4 hours worked.
 */
export const nvRestBreak: Rule = createRule({
  id: "nv-rest-break-4hr",
  title: "Nevada Rest Break (10 min per 4 hours worked)",
  jurisdiction: "NV",
  topic: "rest_break",
  effectiveFrom: "2007-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NV" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">=", value: 3.5 },
      { fact: "shift.rest_break_provided", op: "=", value: false },
    ],
  },

  result: {
    type: "required_break",
    breakType: "rest",
    minimumMinutes: 10,
  },

  citations: [
    {
      source: "NRS §608.019",
      url: "https://www.leg.state.nv.us/nrs/nrs-608.html#NRS608Sec019",
      section: "NRS §608.019(2)",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// MARYLAND — Labor & Employment §3-710 (Retail only)
// ═══════════════════════════════════════════════════════════════════

/**
 * MD: Retail employees working 4-6 consecutive hours must receive
 * a 15-minute break. Those working 6+ hours get a 30-minute break.
 * Only applies to retail establishments.
 */
export const mdMealBreakRetailShort: Rule = createRule({
  id: "md-meal-break-retail-4hr",
  title: "Maryland Retail Break (15 min for 4-6 hour shift)",
  jurisdiction: "MD",
  topic: "meal_break",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MD" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employer.industry_tag", op: "=", value: "retail" },
      { fact: "shift.shift_length_hours", op: ">=", value: 4 },
      { fact: "shift.shift_length_hours", op: "<", value: 6 },
      { fact: "shift.meal_break_provided", op: "=", value: false },
    ],
  },

  result: {
    type: "required_break",
    breakType: "meal",
    minimumMinutes: 15,
  },

  citations: [
    {
      source: "MD Code, Labor & Employment §3-710",
      url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gle&section=3-710",
      section: "§3-710",
    },
  ],
});

export const mdMealBreakRetailLong: Rule = createRule({
  id: "md-meal-break-retail-6hr",
  title: "Maryland Retail Break (30 min for 6+ hour shift)",
  jurisdiction: "MD",
  topic: "meal_break",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MD" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employer.industry_tag", op: "=", value: "retail" },
      { fact: "shift.shift_length_hours", op: ">=", value: 6 },
      { fact: "shift.meal_break_provided", op: "=", value: false },
    ],
  },

  result: {
    type: "required_break",
    breakType: "meal",
    minimumMinutes: 30,
  },

  citations: [
    {
      source: "MD Code, Labor & Employment §3-710",
      url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gle&section=3-710",
      section: "§3-710",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// CALIFORNIA — Rest Break (IWC Order 5 / Lab. Code §226.7)
// Meal breaks already exist in californiaMealBreak.ts
// ═══════════════════════════════════════════════════════════════════

/**
 * CA: Employees are entitled to a 10-minute paid rest break for every
 * 4 hours worked (or major fraction thereof). Applies to shifts of
 * 3.5+ hours.
 */
export const caRestBreak: Rule = createRule({
  id: "ca-rest-break-4hr",
  title: "California Rest Break (10 min per 4 hours worked)",
  jurisdiction: "CA",
  topic: "rest_break",
  effectiveFrom: "2001-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">=", value: 3.5 },
      { fact: "shift.rest_break_provided", op: "=", value: false },
    ],
  },

  result: {
    type: "required_break",
    breakType: "rest",
    minimumMinutes: 10,
  },

  citations: [
    {
      source: "California Labor Code §226.7 / IWC Order 5-2001",
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=226.7.&lawCode=LAB",
      section: "Cal. Lab. Code §226.7",
    },
  ],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_MEAL_REST_BREAK_RULES: readonly Rule[] = [
  nyMealBreakNonFactory,
  nyMealBreakFactory,
  nyMealBreakAdditionalEvening,
  ctMealBreak,
  nvMealBreak,
  nvRestBreak,
  mdMealBreakRetailShort,
  mdMealBreakRetailLong,
  caRestBreak,
];
