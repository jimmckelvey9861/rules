/**
 * Washington State Weekly Overtime — RCW 49.46.130
 *
 * Non-exempt employees in Washington must receive overtime pay at 1.5x
 * their regular rate for all hours worked over 40 in a workweek.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

export const washingtonWeeklyOvertime: Rule = createRule({
  id: "wa-weekly-overtime-40",
  title: "Washington State Weekly Overtime (RCW 49.46.130)",
  jurisdiction: "WA",
  topic: "overtime",
  effectiveFrom: "1961-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "WA" },
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
      source: "RCW 49.46.130",
      url: "https://app.leg.wa.gov/rcw/default.aspx?cite=49.46.130",
      section: "RCW 49.46.130",
    },
  ],
});
