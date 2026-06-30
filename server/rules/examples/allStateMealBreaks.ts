/**
 * State Meal Break Rules — All States with Statutory Requirements
 *
 * About 20 states have mandatory meal break laws for adults.
 * States already covered in other files: NY, CT, NV, MD, CA.
 * This file adds the remaining states with meal break requirements.
 *
 * States with NO adult meal break law (federal has none either):
 * AL, AK, AZ, AR, FL, GA, HI, ID, IN, IA, KS, KY, LA, MI, MS,
 * MO, MT, NJ, NM, NC, ND, OH, OK, PA, SC, SD, TX, UT, VA, WI, WY
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── Helper ────────────────────────────────────────────────────────

function mealBreakRule(opts: {
  state: string;
  stateName: string;
  hoursThreshold: number;
  breakMinutes: number;
  effectiveFrom: string;
  source: string;
  url: string;
  section?: string;
  industryLimit?: string;
  note?: string;
}): Rule {
  const conditions: any[] = [
    { fact: "location.state", op: "=", value: opts.state },
    { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    { fact: "shift.shift_length_hours", op: ">=", value: opts.hoursThreshold },
    { fact: "shift.meal_break_provided", op: "=", value: false },
  ];
  if (opts.industryLimit) {
    conditions.push({ fact: "employer.industry_tag", op: "=", value: opts.industryLimit });
  }

  return createRule({
    id: `${opts.state.toLowerCase()}-meal-break-${opts.hoursThreshold}hr`,
    title: `${opts.stateName} Meal Break (${opts.breakMinutes} min for ${opts.hoursThreshold}+ hr shift)`,
    jurisdiction: opts.state,
    topic: "meal_break",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: { all: conditions },
    result: {
      type: "required_break",
      breakType: "meal",
      minimumMinutes: opts.breakMinutes,
    },
    citations: [
      {
        source: opts.source,
        url: opts.url,
        section: opts.section,
      },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════
// STATES WITH MEAL BREAK REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════

export const coloradoMealBreak = mealBreakRule({
  state: "CO", stateName: "Colorado", hoursThreshold: 5, breakMinutes: 30,
  effectiveFrom: "2020-03-16",
  source: "COMPS Order #40, Rule 5.2.1",
  url: "https://cdle.colorado.gov/wage-and-hour-law/meal-and-rest-periods",
});

export const delawareMealBreak = mealBreakRule({
  state: "DE", stateName: "Delaware", hoursThreshold: 7.5, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "19 Del. C. §707",
  url: "https://dia.delawareworks.com/labor-law/breaks.php",
});

export const illinoisMealBreak = mealBreakRule({
  state: "IL", stateName: "Illinois", hoursThreshold: 7.5, breakMinutes: 20,
  effectiveFrom: "2010-01-01",
  source: "820 ILCS 140/3",
  url: "https://labor.illinois.gov/laws-rules/conmed/one-day-rest-in-seven-act.html",
  section: "820 ILCS 140/3",
});

export const kentuckyMealBreak = mealBreakRule({
  state: "KY", stateName: "Kentucky", hoursThreshold: 5, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "KRS §337.355",
  url: "https://labor.ky.gov/standards/Pages/Breaks-and-Meals.aspx",
  note: "Reasonable period close to middle of shift",
});

export const maineMealBreak = mealBreakRule({
  state: "ME", stateName: "Maine", hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "26 MRSA §601",
  url: "https://www.maine.gov/labor/labor_laws/rest_meal.html",
});

export const massachusettsMealBreak = mealBreakRule({
  state: "MA", stateName: "Massachusetts", hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "MGL c.149 §100",
  url: "https://www.mass.gov/info-details/massachusetts-law-about-meal-breaks",
  section: "c.149 §100",
});

export const minnesotaMealBreak = mealBreakRule({
  state: "MN", stateName: "Minnesota", hoursThreshold: 8, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "Minn. Stat. §177.254",
  url: "https://www.dli.mn.gov/business/employment-practices/work-breaks-and-meal-time",
  note: "Sufficient time to eat a meal",
});

export const nebraskaMealBreak = mealBreakRule({
  state: "NE", stateName: "Nebraska", hoursThreshold: 8, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "Neb. Rev. Stat. §48-212",
  url: "https://dol.nebraska.gov/LaborStandards/FAQ/Breaks",
  note: "Applies to assembly plant, workshop, or mechanical establishments",
});

export const newHampshireMealBreak = mealBreakRule({
  state: "NH", stateName: "New Hampshire", hoursThreshold: 5, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "NH RSA §275:30-a",
  url: "https://www.nh.gov/labor/inspection/wage-hour/breaks.htm",
});

export const northDakotaMealBreak = mealBreakRule({
  state: "ND", stateName: "North Dakota", hoursThreshold: 5, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "NDAC §46-02-07-02(5)",
  url: "https://www.nd.gov/labor/meal-periods-and-rest-breaks",
});

export const oregonMealBreak = mealBreakRule({
  state: "OR", stateName: "Oregon", hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "ORS §653.261",
  url: "https://www.oregon.gov/boli/workers/pages/meals-and-breaks.aspx",
});

export const rhodeIslandMealBreak = mealBreakRule({
  state: "RI", stateName: "Rhode Island", hoursThreshold: 6, breakMinutes: 20,
  effectiveFrom: "2010-01-01",
  source: "RI Gen. Laws §28-3-14",
  url: "https://dlt.ri.gov/individuals/workplace-protections/breaks-and-lunches",
});

export const tennesseeeMealBreak = mealBreakRule({
  state: "TN", stateName: "Tennessee", hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "Tenn. Code §50-2-103(h)",
  url: "https://www.tn.gov/workforce/employees/labor-laws/labor-laws-redirect/wages-breaks.html",
});

export const vermontMealBreak = mealBreakRule({
  state: "VT", stateName: "Vermont", hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "21 VSA §304",
  url: "https://labor.vermont.gov/document/meal-break-fact-sheet",
  note: "Reasonable opportunity to eat and use restroom",
});

export const washingtonMealBreak = mealBreakRule({
  state: "WA", stateName: "Washington", hoursThreshold: 5, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "WAC §296-126-092",
  url: "https://lni.wa.gov/workers-rights/workplace-policies/rest-breaks-meal-periods",
  section: "WAC §296-126-092",
});

export const westVirginiaMealBreak = mealBreakRule({
  state: "WV", stateName: "West Virginia", hoursThreshold: 6, breakMinutes: 20,
  effectiveFrom: "2010-01-01",
  source: "W. Va. Code §21-3-10a",
  url: "https://labor.wv.gov/Pages/Breaks-and-Meals.aspx",
});

// ═══════════════════════════════════════════════════════════════════
// REST BREAK RULES (states with statutory rest break requirements)
// Already have: CA, NV. Adding: CO, WA, OR, MN, KY
// ═══════════════════════════════════════════════════════════════════

export const coloradoRestBreak: Rule = createRule({
  id: "co-rest-break-4hr",
  title: "Colorado Rest Break (10 min per 4 hours worked)",
  jurisdiction: "CO",
  topic: "rest_break",
  effectiveFrom: "2020-03-16",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CO" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">=", value: 4 },
      { fact: "shift.rest_break_provided", op: "=", value: false },
    ],
  },
  result: { type: "required_break", breakType: "rest", minimumMinutes: 10 },
  citations: [{
    source: "COMPS Order #40, Rule 5.2.2",
    url: "https://cdle.colorado.gov/wage-and-hour-law/meal-and-rest-periods",
    section: "Rule 5.2.2",
  }],
});

export const washingtonRestBreak: Rule = createRule({
  id: "wa-rest-break-4hr",
  title: "Washington Rest Break (10 min per 4 hours worked)",
  jurisdiction: "WA",
  topic: "rest_break",
  effectiveFrom: "2010-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "WA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">=", value: 4 },
      { fact: "shift.rest_break_provided", op: "=", value: false },
    ],
  },
  result: { type: "required_break", breakType: "rest", minimumMinutes: 10 },
  citations: [{
    source: "WAC §296-126-092",
    url: "https://lni.wa.gov/workers-rights/workplace-policies/rest-breaks-meal-periods",
    section: "WAC §296-126-092",
  }],
});

export const oregonRestBreak: Rule = createRule({
  id: "or-rest-break-4hr",
  title: "Oregon Rest Break (10 min per 4 hours worked)",
  jurisdiction: "OR",
  topic: "rest_break",
  effectiveFrom: "2010-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "OR" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">=", value: 4 },
      { fact: "shift.rest_break_provided", op: "=", value: false },
    ],
  },
  result: { type: "required_break", breakType: "rest", minimumMinutes: 10 },
  citations: [{
    source: "ORS §653.261",
    url: "https://www.oregon.gov/boli/workers/pages/meals-and-breaks.aspx",
    section: "ORS §653.261",
  }],
});

export const kentuckyRestBreak: Rule = createRule({
  id: "ky-rest-break-4hr",
  title: "Kentucky Rest Break (10 min per 4 hours worked)",
  jurisdiction: "KY",
  topic: "rest_break",
  effectiveFrom: "2010-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "KY" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">=", value: 4 },
      { fact: "shift.rest_break_provided", op: "=", value: false },
    ],
  },
  result: { type: "required_break", breakType: "rest", minimumMinutes: 10 },
  citations: [{
    source: "KRS §337.365",
    url: "https://labor.ky.gov/standards/Pages/Breaks-and-Meals.aspx",
    section: "KRS §337.365",
  }],
});

export const minnesotaRestBreak: Rule = createRule({
  id: "mn-rest-break-4hr",
  title: "Minnesota Rest Break (adequate time per 4 consecutive hours)",
  jurisdiction: "MN",
  topic: "rest_break",
  effectiveFrom: "2010-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MN" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">=", value: 4 },
      { fact: "shift.rest_break_provided", op: "=", value: false },
    ],
  },
  result: { type: "required_break", breakType: "rest", minimumMinutes: 10 },
  citations: [{
    source: "Minn. Stat. §177.254",
    url: "https://www.dli.mn.gov/business/employment-practices/work-breaks-and-meal-time",
    section: "§177.254",
  }],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_ADDITIONAL_STATE_MEAL_BREAKS: readonly Rule[] = [
  coloradoMealBreak,
  delawareMealBreak,
  illinoisMealBreak,
  kentuckyMealBreak,
  maineMealBreak,
  massachusettsMealBreak,
  minnesotaMealBreak,
  nebraskaMealBreak,
  newHampshireMealBreak,
  northDakotaMealBreak,
  oregonMealBreak,
  rhodeIslandMealBreak,
  tennesseeeMealBreak,
  vermontMealBreak,
  washingtonMealBreak,
  westVirginiaMealBreak,
];

export const ALL_ADDITIONAL_STATE_REST_BREAKS: readonly Rule[] = [
  coloradoRestBreak,
  washingtonRestBreak,
  oregonRestBreak,
  kentuckyRestBreak,
  minnesotaRestBreak,
];
