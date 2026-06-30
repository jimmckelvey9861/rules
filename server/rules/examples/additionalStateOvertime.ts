/**
 * Additional State Overtime Rules
 *
 * States with overtime rules that DIFFER from the federal standard
 * (time-and-a-half after 40 hrs/week). Most states simply follow
 * federal FLSA, which is already covered by federalOvertime.ts.
 *
 * These states have daily overtime or different thresholds:
 * - AK: Daily OT after 8 hrs (AS §23.10.060)
 * - CO: Daily OT after 12 hrs (COMPS Order #40, Rule 4.1.1)
 * - OR: Manufacturing — daily OT after 10 hrs (ORS §652.020)
 *
 * CA and WA daily overtime are already in separate files.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ═══════════════════════════════════════════════════════════════════
// ALASKA — AS §23.10.060 (Daily OT after 8 hours)
// ═══════════════════════════════════════════════════════════════════

export const alaskaDailyOvertime: Rule = createRule({
  id: "ak-daily-overtime-8hr",
  title: "Alaska Daily Overtime (>8 hours in a day = 1.5x)",
  jurisdiction: "AK",
  topic: "overtime",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "AK" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_today", op: ">", value: 8 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
    formula: "Time-and-a-half for all hours worked beyond 8 in a single workday",
  },

  citations: [
    {
      source: "AS §23.10.060",
      url: "https://www.akleg.gov/basis/statutes.asp#23.10.060",
      section: "AS §23.10.060",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// COLORADO — COMPS Order #40, Rule 4.1.1 (Daily OT after 12 hours)
// ═══════════════════════════════════════════════════════════════════

export const coloradoDailyOvertime: Rule = createRule({
  id: "co-daily-overtime-12hr",
  title: "Colorado Daily Overtime (>12 hours in a day = 1.5x)",
  jurisdiction: "CO",
  topic: "overtime",
  effectiveFrom: "2020-03-16",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CO" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_today", op: ">", value: 12 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
    formula: "Time-and-a-half for all hours worked beyond 12 in a single workday",
  },

  citations: [
    {
      source: "COMPS Order #40, Rule 4.1.1",
      url: "https://cdle.colorado.gov/wage-and-hour-law/overtime",
      section: "Rule 4.1.1",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// OREGON — ORS §652.020 (Manufacturing: daily OT after 10 hours)
// ═══════════════════════════════════════════════════════════════════

export const oregonManufacturingDailyOvertime: Rule = createRule({
  id: "or-manufacturing-daily-overtime-10hr",
  title: "Oregon Manufacturing Daily Overtime (>10 hours = 1.5x)",
  jurisdiction: "OR",
  topic: "overtime",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "OR" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employer.industry_tag", op: "=", value: "manufacturing" },
      { fact: "shift.hours_worked_today", op: ">", value: 10 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "overtime",
    amount: 1.5,
    formula: "Time-and-a-half for all hours worked beyond 10 in a single workday (manufacturing only)",
  },

  citations: [
    {
      source: "ORS §652.020",
      url: "https://www.oregonlegislature.gov/bills_laws/ors/ors652.html",
      section: "ORS §652.020",
    },
  ],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_ADDITIONAL_STATE_OVERTIME: readonly Rule[] = [
  alaskaDailyOvertime,
  coloradoDailyOvertime,
  oregonManufacturingDailyOvertime,
];
