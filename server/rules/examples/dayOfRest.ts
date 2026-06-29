/**
 * Day of Rest — New York Labor Law §161
 *
 * NY requires that most employees receive at least 24 consecutive hours
 * of rest in each calendar week. Certain industries (factories, hotels,
 * restaurants) have specific day-of-rest requirements.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

/**
 * NY §161(1): Every employee must receive at least 24 consecutive hours
 * of rest in each calendar week. Working on the 7th consecutive day
 * without a day off is a violation.
 */
export const nyDayOfRest: Rule = createRule({
  id: "ny-day-of-rest",
  title: "New York Day of Rest (24 consecutive hours off per calendar week)",
  jurisdiction: "NY",
  topic: "day_of_rest",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.is_seventh_consecutive_day", op: "=", value: true },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling employee to work 7 consecutive days without 24 consecutive hours of rest",
  },

  citations: [
    {
      source: "NY Labor Law §161",
      url: "https://www.nysenate.gov/legislation/laws/LAB/161",
      section: "§161(1)",
    },
  ],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_DAY_OF_REST_RULES: readonly Rule[] = [
  nyDayOfRest,
];
