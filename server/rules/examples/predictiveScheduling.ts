/**
 * Predictive Scheduling Rules
 *
 * These rules require employers to provide advance notice of schedules
 * and pay premiums for last-minute changes. Each jurisdiction has different
 * industry coverage, employer size thresholds, and notice periods.
 *
 * Note: Predictive scheduling laws are complex (tiered penalties, multiple
 * industries, clopening restrictions). We model the core advance-notice
 * violation as the primary rule. Supplementary rules (clopening, on-call ban)
 * can be added as separate rule objects later.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── Seattle Secure Scheduling ─────────────────────────────────────

export const seattleSecureScheduling: Rule = createRule({
  id: "seattle-secure-scheduling-14day",
  title: "Seattle Secure Scheduling — 14-Day Advance Notice",
  jurisdiction: "Seattle",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "Seattle" },
      { fact: "employer.industry_tag", op: "in", value: ["retail", "restaurant"] },
      { fact: "employer.total_employees_global", op: ">=", value: 500 },
      { fact: "schedule.was_changed", op: "=", value: true },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "1 hour of pay per changed shift",
  },

  citations: [
    {
      source: "Seattle Municipal Code Ch. 14.22 (Secure Scheduling)",
      url: "https://www.seattle.gov/laborstandards/ordinances/secure-scheduling",
      section: "SMC 14.22",
    },
  ],
});

// ─── NYC Fair Workweek — Fast Food ─────────────────────────────────

export const nycFairWorkweekFastFood: Rule = createRule({
  id: "nyc-fair-workweek-fast-food-14day",
  title: "NYC Fair Workweek — Fast Food 14-Day Advance Notice",
  jurisdiction: "New York City",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-11-26",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employer.industry_tag", op: "=", value: "fast_food" },
      { fact: "schedule.was_changed", op: "=", value: true },
      { fact: "schedule.advance_notice_days", op: "<", value: 14 },
      { fact: "schedule.employee_consented", op: "=", value: false },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "schedule_change_premium",
    formula: "$100 per schedule change without 14 days notice",
  },

  citations: [
    {
      source: "NYC Administrative Code Title 20 Ch. 12 (Fair Workweek)",
      url: "https://www.nyc.gov/site/dca/workers/workersrights/fair-work-week-702.page",
      section: "NYC Admin Code §20-1221 et seq.",
    },
  ],
});

// ─── NYC Fair Workweek — Retail ────────────────────────────────────

export const nycFairWorkweekRetail: Rule = createRule({
  id: "nyc-fair-workweek-retail-72hr",
  title: "NYC Fair Workweek — Retail 72-Hour Advance Notice",
  jurisdiction: "New York City",
  topic: "predictive_scheduling",
  effectiveFrom: "2017-11-26",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employer.industry_tag", op: "=", value: "retail" },
      { fact: "employer.total_employees_global", op: ">=", value: 20 },
      { fact: "schedule.was_changed", op: "=", value: true },
      { fact: "schedule.advance_notice_days", op: "<", value: 3 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling retail employees with less than 72 hours advance notice without consent",
  },

  citations: [
    {
      source: "NYC Administrative Code Title 20 Ch. 12 (Fair Workweek)",
      url: "https://www.nyc.gov/site/dca/workers/workersrights/fair-work-week-702.page",
      section: "NYC Admin Code §20-1241 et seq.",
    },
  ],
});

// ─── NYC Clopening Restriction ─────────────────────────────────────

export const nycClopeningRestriction: Rule = createRule({
  id: "nyc-clopening-fast-food",
  title: "NYC Fair Workweek — Fast Food Clopening Restriction",
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
    formula: "$100 premium for scheduling closing and opening shifts less than 11 hours apart",
  },

  citations: [
    {
      source: "NYC Administrative Code Title 20 Ch. 12 (Fair Workweek)",
      url: "https://www.nyc.gov/site/dca/workers/workersrights/fair-work-week-702.page",
      section: "NYC Admin Code §20-1231",
    },
  ],
});

// ─── All predictive scheduling rules ───────────────────────────────

export const ALL_PREDICTIVE_SCHEDULING: readonly Rule[] = [
  seattleSecureScheduling,
  nycFairWorkweekFastFood,
  nycFairWorkweekRetail,
  nycClopeningRestriction,
];
