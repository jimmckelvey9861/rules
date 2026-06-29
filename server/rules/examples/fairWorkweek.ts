/**
 * Fair Workweek / Predictive Scheduling Rules — Full Penalty Tiers
 *
 * Jurisdictions with active laws:
 * - New York City (fast food, retail)
 * - San Francisco
 * - Seattle
 * - Oregon (statewide)
 * - Philadelphia
 * - Chicago
 * - Los Angeles
 *
 * Each jurisdiction gets rules for:
 * - Advance notice violation
 * - Schedule change premiums (by change type and timing)
 * - Clopening / right to rest
 * - Good faith estimate requirement
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ═══════════════════════════════════════════════════════════════════════
// NEW YORK CITY — Fast Food
// NYC Admin Code §20-1221 et seq.
// ═══════════════════════════════════════════════════════════════════════

// Advance notice: 14 days required
export const nycFastFoodAdvanceNotice: Rule = createRule({
  id: "nyc-ff-advance-notice-14day",
  title: "NYC Fast Food — 14-Day Advance Notice Required",
  jurisdiction: "New York City",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-11-26",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employer.industry_tag", op: "=", value: "fast_food" },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Posting fast food employee schedules with less than 14 days advance notice",
  },

  citations: [
    {
      source: "NYC Admin Code §20-1221 (Fair Workweek Law)",
      url: "https://www.nyc.gov/site/dca/workers/workersrights/fair-work-week-702.page",
      section: "NYC Admin Code §20-1221",
    },
  ],
});

// Schedule change with 7-13 days notice: $10 premium
export const nycFastFoodChange7to13: Rule = createRule({
  id: "nyc-ff-change-7-13day-premium",
  title: "NYC Fast Food — Schedule Change Premium (7-13 days notice)",
  jurisdiction: "New York City",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-11-26",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employer.industry_tag", op: "=", value: "fast_food" },
      { fact: "schedule.was_changed", op: "=", value: true },
      { fact: "schedule.employer_initiated", op: "=", value: true },
      { fact: "schedule.employee_consented", op: "=", value: false },
      { fact: "schedule.advance_notice_days", op: ">=", value: 7 },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "$10 per schedule change (added hours or changed time with 7-13 days notice)",
  },

  citations: [
    {
      source: "NYC Admin Code §20-1222(a) (Fair Workweek Law)",
      url: "https://www.nyc.gov/site/dca/workers/workersrights/fair-work-week-702.page",
      section: "NYC Admin Code §20-1222(a)",
    },
  ],
});

// Schedule change with <7 days notice (added hours): $15 premium
export const nycFastFoodChangeUnder7Added: Rule = createRule({
  id: "nyc-ff-change-under7-added-premium",
  title: "NYC Fast Food — Schedule Change Premium (<7 days, hours added)",
  jurisdiction: "New York City",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-11-26",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employer.industry_tag", op: "=", value: "fast_food" },
      { fact: "schedule.was_changed", op: "=", value: true },
      { fact: "schedule.employer_initiated", op: "=", value: true },
      { fact: "schedule.employee_consented", op: "=", value: false },
      { fact: "schedule.advance_notice_days", op: "<", value: 7 },
      { fact: "schedule.change_type", op: "=", value: "hours_added" },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "$15 per schedule change (hours added with less than 7 days notice)",
  },

  citations: [
    {
      source: "NYC Admin Code §20-1222(b) (Fair Workweek Law)",
      url: "https://www.nyc.gov/site/dca/workers/workersrights/fair-work-week-702.page",
      section: "NYC Admin Code §20-1222(b)",
    },
  ],
});

// Schedule change with <7 days notice (subtracted hours or cancelled): $75 premium
export const nycFastFoodChangeUnder7Subtracted: Rule = createRule({
  id: "nyc-ff-change-under7-subtracted-premium",
  title: "NYC Fast Food — Schedule Change Premium (<7 days, hours subtracted/cancelled)",
  jurisdiction: "New York City",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-11-26",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employer.industry_tag", op: "=", value: "fast_food" },
      { fact: "schedule.was_changed", op: "=", value: true },
      { fact: "schedule.employer_initiated", op: "=", value: true },
      { fact: "schedule.employee_consented", op: "=", value: false },
      { fact: "schedule.advance_notice_days", op: "<", value: 7 },
      { fact: "schedule.change_type", op: "in", value: ["hours_reduced", "shift_cancelled"] },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "$75 per schedule change (hours subtracted or shift cancelled with less than 7 days notice)",
  },

  citations: [
    {
      source: "NYC Admin Code §20-1222(b) (Fair Workweek Law)",
      url: "https://www.nyc.gov/site/dca/workers/workersrights/fair-work-week-702.page",
      section: "NYC Admin Code §20-1222(b)",
    },
  ],
});

// Clopening: 11-hour rest period required
export const nycFastFoodClopening: Rule = createRule({
  id: "nyc-ff-clopening-11hr",
  title: "NYC Fast Food — 11-Hour Rest Period (Clopening)",
  jurisdiction: "New York City",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-11-26",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employer.industry_tag", op: "=", value: "fast_food" },
      { fact: "shift.hours_since_last_shift_end", op: "<", value: 11 },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "clopening_premium",
    formula: "$100 per clopening violation (scheduling closing and opening shifts less than 11 hours apart without written consent)",
  },

  citations: [
    {
      source: "NYC Admin Code §20-1231 (Fair Workweek Law)",
      url: "https://www.nyc.gov/site/dca/workers/workersrights/fair-work-week-702.page",
      section: "NYC Admin Code §20-1231",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════════
// NEW YORK CITY — Retail
// NYC Admin Code §20-1241 et seq.
// ═══════════════════════════════════════════════════════════════════════

export const nycRetailAdvanceNotice: Rule = createRule({
  id: "nyc-retail-advance-notice-72hr",
  title: "NYC Retail — 72-Hour Advance Notice Required",
  jurisdiction: "New York City",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-11-26",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employer.industry_tag", op: "=", value: "retail" },
      { fact: "employer.total_employees_global", op: ">=", value: 20 },
      { fact: "schedule.advance_notice_days", op: "<", value: 3 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Posting retail employee schedules with less than 72 hours advance notice",
  },

  citations: [
    {
      source: "NYC Admin Code §20-1241 (Fair Workweek Law)",
      url: "https://www.nyc.gov/site/dca/workers/workersrights/fair-work-week-702.page",
      section: "NYC Admin Code §20-1241",
    },
  ],
});

// Retail on-call ban
export const nycRetailOnCallBan: Rule = createRule({
  id: "nyc-retail-on-call-ban",
  title: "NYC Retail — On-Call Scheduling Prohibited",
  jurisdiction: "New York City",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-11-26",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employer.industry_tag", op: "=", value: "retail" },
      { fact: "employer.total_employees_global", op: ">=", value: 20 },
      { fact: "shift.is_on_call", op: "=", value: true },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Requiring retail employees to be on-call (must schedule or not schedule; cannot require availability without pay)",
  },

  citations: [
    {
      source: "NYC Admin Code §20-1243 (Fair Workweek Law)",
      url: "https://www.nyc.gov/site/dca/workers/workersrights/fair-work-week-702.page",
      section: "NYC Admin Code §20-1243",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════════
// SAN FRANCISCO — Formula Retail Employee Rights Ordinance
// SF Admin Code Ch. 12Z
// ═══════════════════════════════════════════════════════════════════════

export const sfAdvanceNotice: Rule = createRule({
  id: "sf-advance-notice-14day",
  title: "San Francisco — 14-Day Advance Notice Required",
  jurisdiction: "San Francisco",
  topic: "predictive_scheduling",
  effectiveFrom: "2015-07-03",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "San Francisco" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "hospitality"] },
      { fact: "employer.total_employees_global", op: ">=", value: 40 },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "1-4 hours of pay depending on change type (predictability pay)",
  },

  citations: [
    {
      source: "San Francisco Administrative Code Ch. 12Z (Formula Retail Employee Rights)",
      url: "https://sfgov.org/olse/formula-retail-employee-rights-ordinance",
      section: "SF Admin Code §12Z",
    },
  ],
});

export const sfClopening: Rule = createRule({
  id: "sf-clopening-11hr",
  title: "San Francisco — Right to Rest (11-Hour Gap)",
  jurisdiction: "San Francisco",
  topic: "predictive_scheduling",
  effectiveFrom: "2015-07-03",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "San Francisco" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "hospitality"] },
      { fact: "employer.total_employees_global", op: ">=", value: 40 },
      { fact: "shift.hours_since_last_shift_end", op: "<", value: 11 },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "clopening_premium",
    formula: "1.25x pay rate for hours worked within the 11-hour rest period",
  },

  citations: [
    {
      source: "San Francisco Administrative Code Ch. 12Z §12Z.6",
      url: "https://sfgov.org/olse/formula-retail-employee-rights-ordinance",
      section: "SF Admin Code §12Z.6",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════════
// OREGON — Statewide Predictive Scheduling (ORS 653.412-659)
// Applies to retail, hospitality, food service employers with 500+ worldwide
// ═══════════════════════════════════════════════════════════════════════

export const oregonAdvanceNotice: Rule = createRule({
  id: "or-advance-notice-14day",
  title: "Oregon — 14-Day Advance Notice Required",
  jurisdiction: "OR",
  topic: "predictive_scheduling",
  effectiveFrom: "2018-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "OR" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "hospitality"] },
      { fact: "employer.total_employees_global", op: ">=", value: 500 },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "1 hour of pay per shift for schedule posted with less than 14 days notice",
  },

  citations: [
    {
      source: "Oregon Predictive Scheduling Law, ORS 653.455",
      url: "https://www.oregon.gov/boli/workers/pages/predictive-scheduling.aspx",
      section: "ORS 653.455",
    },
  ],
});

// Oregon: schedule change with <7 days notice — premium varies by type
export const oregonChangeUnder7Added: Rule = createRule({
  id: "or-change-under7-added",
  title: "Oregon — Schedule Change Premium (<7 days, hours added)",
  jurisdiction: "OR",
  topic: "predictive_scheduling",
  effectiveFrom: "2018-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "OR" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "hospitality"] },
      { fact: "employer.total_employees_global", op: ">=", value: 500 },
      { fact: "schedule.was_changed", op: "=", value: true },
      { fact: "schedule.advance_notice_days", op: "<", value: 7 },
      { fact: "schedule.change_type", op: "=", value: "hours_added" },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "1 hour of pay at regular rate (hours added with less than 7 days notice)",
  },

  citations: [
    {
      source: "Oregon Predictive Scheduling Law, ORS 653.455(4)(a)",
      url: "https://www.oregon.gov/boli/workers/pages/predictive-scheduling.aspx",
      section: "ORS 653.455(4)(a)",
    },
  ],
});

export const oregonChangeUnder7Subtracted: Rule = createRule({
  id: "or-change-under7-subtracted",
  title: "Oregon — Schedule Change Premium (<7 days, hours subtracted/cancelled)",
  jurisdiction: "OR",
  topic: "predictive_scheduling",
  effectiveFrom: "2018-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "OR" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "hospitality"] },
      { fact: "employer.total_employees_global", op: ">=", value: 500 },
      { fact: "schedule.was_changed", op: "=", value: true },
      { fact: "schedule.advance_notice_days", op: "<", value: 7 },
      { fact: "schedule.change_type", op: "in", value: ["hours_reduced", "shift_cancelled"] },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "One-half of scheduled hours at regular rate (hours subtracted or shift cancelled with less than 7 days notice)",
  },

  citations: [
    {
      source: "Oregon Predictive Scheduling Law, ORS 653.455(4)(b)",
      url: "https://www.oregon.gov/boli/workers/pages/predictive-scheduling.aspx",
      section: "ORS 653.455(4)(b)",
    },
  ],
});

export const oregonClopening: Rule = createRule({
  id: "or-clopening-10hr",
  title: "Oregon — Right to Rest (10-Hour Gap)",
  jurisdiction: "OR",
  topic: "predictive_scheduling",
  effectiveFrom: "2018-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "OR" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "hospitality"] },
      { fact: "employer.total_employees_global", op: ">=", value: 500 },
      { fact: "shift.hours_since_last_shift_end", op: "<", value: 10 },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "clopening_premium",
    formula: "1.5x pay rate for all hours worked within the 10-hour rest period",
  },

  citations: [
    {
      source: "Oregon Predictive Scheduling Law, ORS 653.455(5)",
      url: "https://www.oregon.gov/boli/workers/pages/predictive-scheduling.aspx",
      section: "ORS 653.455(5)",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════════
// PHILADELPHIA — Fair Workweek Employment Standards
// Phila. Code §9-4601 et seq.
// ═══════════════════════════════════════════════════════════════════════

export const philadelphiaAdvanceNotice: Rule = createRule({
  id: "phl-advance-notice-14day",
  title: "Philadelphia — 14-Day Advance Notice Required",
  jurisdiction: "Philadelphia",
  topic: "predictive_scheduling",
  effectiveFrom: "2020-04-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "Philadelphia" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "hospitality", "fast_food"] },
      { fact: "employer.total_employees_global", op: ">=", value: 250 },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "$40 per schedule change (less than 14 days notice); $56 if less than 24 hours notice",
  },

  citations: [
    {
      source: "Philadelphia Code §9-4601 et seq. (Fair Workweek Employment Standards)",
      url: "https://www.phila.gov/departments/department-of-labor/workers-rights/fair-workweek/",
      section: "Phila. Code §9-4603",
    },
  ],
});

export const philadelphiaClopening: Rule = createRule({
  id: "phl-clopening-9hr",
  title: "Philadelphia — 9-Hour Rest Period",
  jurisdiction: "Philadelphia",
  topic: "predictive_scheduling",
  effectiveFrom: "2020-04-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "Philadelphia" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "hospitality", "fast_food"] },
      { fact: "employer.total_employees_global", op: ">=", value: 250 },
      { fact: "shift.hours_since_last_shift_end", op: "<", value: 9 },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling an employee to work with less than 9 hours rest between shifts without written consent",
  },

  citations: [
    {
      source: "Philadelphia Code §9-4605 (Fair Workweek Employment Standards)",
      url: "https://www.phila.gov/departments/department-of-labor/workers-rights/fair-workweek/",
      section: "Phila. Code §9-4605",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════════
// CHICAGO — Fair Workweek Ordinance
// Chicago Municipal Code §1-25
// ═══════════════════════════════════════════════════════════════════════

export const chicagoAdvanceNotice: Rule = createRule({
  id: "chi-advance-notice-14day",
  title: "Chicago — 14-Day Advance Notice Required",
  jurisdiction: "Chicago",
  topic: "predictive_scheduling",
  effectiveFrom: "2020-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "Chicago" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "hospitality", "fast_food", "healthcare", "hotel", "manufacturing", "warehouse"] },
      { fact: "employer.total_employees_global", op: ">=", value: 100 },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "1 hour of pay per affected shift (schedule posted with less than 14 days notice)",
  },

  citations: [
    {
      source: "Chicago Municipal Code §1-25 (Fair Workweek Ordinance)",
      url: "https://www.chicago.gov/city/en/depts/bacp/supp_info/fairworkweek.html",
      section: "Chi. Mun. Code §1-25-050",
    },
  ],
});

export const chicagoChangeUnder14Subtracted: Rule = createRule({
  id: "chi-change-under14-subtracted",
  title: "Chicago — Schedule Change Premium (hours subtracted with <14 days notice)",
  jurisdiction: "Chicago",
  topic: "predictive_scheduling",
  effectiveFrom: "2020-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "Chicago" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "hospitality", "fast_food", "healthcare", "hotel", "manufacturing", "warehouse"] },
      { fact: "employer.total_employees_global", op: ">=", value: 100 },
      { fact: "schedule.was_changed", op: "=", value: true },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
      { fact: "schedule.change_type", op: "in", value: ["hours_reduced", "shift_cancelled"] },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "50% of pay for subtracted/cancelled hours (predictability pay)",
  },

  citations: [
    {
      source: "Chicago Municipal Code §1-25-050 (Fair Workweek Ordinance)",
      url: "https://www.chicago.gov/city/en/depts/bacp/supp_info/fairworkweek.html",
      section: "Chi. Mun. Code §1-25-050",
    },
  ],
});

export const chicagoClopening: Rule = createRule({
  id: "chi-clopening-10hr",
  title: "Chicago — 10-Hour Rest Period",
  jurisdiction: "Chicago",
  topic: "predictive_scheduling",
  effectiveFrom: "2020-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "Chicago" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "hospitality", "fast_food", "healthcare", "hotel", "manufacturing", "warehouse"] },
      { fact: "employer.total_employees_global", op: ">=", value: 100 },
      { fact: "shift.hours_since_last_shift_end", op: "<", value: 10 },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "clopening_premium",
    formula: "$100 per occurrence or 1.25x rate for hours within the rest period (whichever is greater)",
  },

  citations: [
    {
      source: "Chicago Municipal Code §1-25-055 (Fair Workweek Ordinance)",
      url: "https://www.chicago.gov/city/en/depts/bacp/supp_info/fairworkweek.html",
      section: "Chi. Mun. Code §1-25-055",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════════
// LOS ANGELES — Fair Work Week Ordinance (LAMC §187.00)
// Retail employers with 300+ employees globally
// ═══════════════════════════════════════════════════════════════════════

export const losAngelesAdvanceNotice: Rule = createRule({
  id: "la-advance-notice-14day",
  title: "Los Angeles — 14-Day Advance Notice Required (Retail)",
  jurisdiction: "Los Angeles",
  topic: "predictive_scheduling",
  effectiveFrom: "2023-04-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "Los Angeles" },
      { fact: "employer.industry_tag", op: "=", value: "retail" },
      { fact: "employer.total_employees_global", op: ">=", value: 300 },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "1 hour of pay per affected shift (predictability pay for schedule posted with less than 14 days notice)",
  },

  citations: [
    {
      source: "Los Angeles Municipal Code §187.04 (Fair Work Week Ordinance)",
      url: "https://wagesla.lacity.org/fair-work-week",
      section: "LAMC §187.04",
    },
  ],
});

export const losAngelesClopening: Rule = createRule({
  id: "la-clopening-10hr",
  title: "Los Angeles — 10-Hour Rest Period (Retail)",
  jurisdiction: "Los Angeles",
  topic: "predictive_scheduling",
  effectiveFrom: "2023-04-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "Los Angeles" },
      { fact: "employer.industry_tag", op: "=", value: "retail" },
      { fact: "employer.total_employees_global", op: ">=", value: 300 },
      { fact: "shift.hours_since_last_shift_end", op: "<", value: 10 },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "clopening_premium",
    formula: "1.5x pay rate for hours worked within the 10-hour rest period",
  },

  citations: [
    {
      source: "Los Angeles Municipal Code §187.06 (Fair Work Week Ordinance)",
      url: "https://wagesla.lacity.org/fair-work-week",
      section: "LAMC §187.06",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════════
// SEATTLE — Secure Scheduling (SMC 14.22)
// Retail/food service with 500+ employees globally
// ═══════════════════════════════════════════════════════════════════════

export const seattleAdvanceNotice: Rule = createRule({
  id: "sea-advance-notice-14day",
  title: "Seattle — 14-Day Advance Notice Required",
  jurisdiction: "Seattle",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "Seattle" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "fast_food"] },
      { fact: "employer.total_employees_global", op: ">=", value: 500 },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "1 hour of pay per shift for schedule posted with less than 14 days notice",
  },

  citations: [
    {
      source: "Seattle Municipal Code Ch. 14.22 (Secure Scheduling)",
      url: "https://www.seattle.gov/laborstandards/ordinances/secure-scheduling",
      section: "SMC 14.22.045",
    },
  ],
});

export const seattleChangeUnder14Subtracted: Rule = createRule({
  id: "sea-change-under14-subtracted",
  title: "Seattle — Schedule Change Premium (hours subtracted with <14 days notice)",
  jurisdiction: "Seattle",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "Seattle" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "fast_food"] },
      { fact: "employer.total_employees_global", op: ">=", value: 500 },
      { fact: "schedule.was_changed", op: "=", value: true },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
      { fact: "schedule.change_type", op: "in", value: ["hours_reduced", "shift_cancelled"] },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "50% of pay for subtracted/cancelled hours (predictability pay)",
  },

  citations: [
    {
      source: "Seattle Municipal Code Ch. 14.22 (Secure Scheduling)",
      url: "https://www.seattle.gov/laborstandards/ordinances/secure-scheduling",
      section: "SMC 14.22.045",
    },
  ],
});

export const seattleClopening: Rule = createRule({
  id: "sea-clopening-10hr",
  title: "Seattle — 10-Hour Rest Period",
  jurisdiction: "Seattle",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "Seattle" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant", "fast_food"] },
      { fact: "employer.total_employees_global", op: ">=", value: 500 },
      { fact: "shift.hours_since_last_shift_end", op: "<", value: 10 },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "clopening_premium",
    formula: "1.5x pay rate for hours worked within the 10-hour rest period",
  },

  citations: [
    {
      source: "Seattle Municipal Code Ch. 14.22 (Secure Scheduling)",
      url: "https://www.seattle.gov/laborstandards/ordinances/secure-scheduling",
      section: "SMC 14.22.050",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════════
// Export all
// ═══════════════════════════════════════════════════════════════════════

export const ALL_FAIR_WORKWEEK_RULES: readonly Rule[] = [
  // NYC Fast Food
  nycFastFoodAdvanceNotice,
  nycFastFoodChange7to13,
  nycFastFoodChangeUnder7Added,
  nycFastFoodChangeUnder7Subtracted,
  nycFastFoodClopening,
  // NYC Retail
  nycRetailAdvanceNotice,
  nycRetailOnCallBan,
  // San Francisco
  sfAdvanceNotice,
  sfClopening,
  // Oregon
  oregonAdvanceNotice,
  oregonChangeUnder7Added,
  oregonChangeUnder7Subtracted,
  oregonClopening,
  // Philadelphia
  philadelphiaAdvanceNotice,
  philadelphiaClopening,
  // Chicago
  chicagoAdvanceNotice,
  chicagoChangeUnder14Subtracted,
  chicagoClopening,
  // Los Angeles
  losAngelesAdvanceNotice,
  losAngelesClopening,
  // Seattle
  seattleAdvanceNotice,
  seattleChangeUnder14Subtracted,
  seattleClopening,
];
