/**
 * California Meal Break Rules — Labor Code §512
 *
 * Employers must provide a 30-minute meal break for shifts over 5 hours.
 * A second 30-minute meal break is required for shifts over 10 hours.
 * The first break may be waived by mutual consent if the shift is ≤ 6 hours.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── First Meal Break (>5 hours) ───────────────────────────────────

export const californiaMealBreakFirst: Rule = createRule({
  id: "ca-meal-break-first-5hr",
  title: "California First Meal Break (>5 hours)",
  jurisdiction: "CA",
  topic: "meal_break",
  effectiveFrom: "2001-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">", value: 5 },
      { fact: "shift.meal_break_provided", op: "=", value: false },
      { fact: "shift.meal_break_waived", op: "=", value: false },
    ],
  },

  result: {
    type: "required_break",
    breakType: "meal",
    minimumMinutes: 30,
  },

  citations: [
    {
      source: "California Labor Code §512(a)",
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=512.&lawCode=LAB",
      section: "Cal. Lab. Code §512(a)",
    },
  ],
});

// ─── Second Meal Break (>10 hours) ─────────────────────────────────

export const californiaMealBreakSecond: Rule = createRule({
  id: "ca-meal-break-second-10hr",
  title: "California Second Meal Break (>10 hours)",
  jurisdiction: "CA",
  topic: "meal_break",
  effectiveFrom: "2001-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.shift_length_hours", op: ">", value: 10 },
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
      source: "California Labor Code §512(a)",
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=512.&lawCode=LAB",
      section: "Cal. Lab. Code §512(a)",
    },
  ],
});

export const ALL_MEAL_BREAK_RULES: readonly Rule[] = [
  californiaMealBreakFirst,
  californiaMealBreakSecond,
];
