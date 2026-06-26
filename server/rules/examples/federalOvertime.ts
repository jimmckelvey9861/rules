/**
 * Federal Overtime Rule — FLSA §207(a)(1)
 *
 * Non-exempt employees must receive overtime pay at 1.5x their regular rate
 * for all hours worked over 40 in a workweek.
 *
 * This is the first rule migrated from the JSON representation
 * to the deterministic TypeScript rule system.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

export const federalOvertime: Rule = createRule({
  id: "federal-overtime-weekly-40",
  title: "Federal Weekly Overtime (FLSA)",
  jurisdiction: "Federal",
  topic: "overtime",
  effectiveFrom: "1940-10-24",
  status: "active",

  appliesWhen: {
    all: [
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
      source: "Fair Labor Standards Act §207(a)(1)",
      url: "https://www.law.cornell.edu/uscode/text/29/207",
      section: "29 U.S.C. §207(a)(1)",
    },
  ],
});
