/**
 * California Daily Overtime Rule — Labor Code §510
 *
 * Non-exempt employees in California must receive overtime pay at 1.5x
 * their regular rate for all hours worked over 8 in a workday.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

export const californiaDailyOvertime: Rule = createRule({
  id: "ca-daily-overtime-8",
  title: "California Daily Overtime (Labor Code §510)",
  jurisdiction: "CA",
  topic: "overtime",
  effectiveFrom: "2000-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
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
      source: "California Labor Code §510",
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=510.&lawCode=LAB",
      section: "Cal. Lab. Code §510",
    },
  ],
});
