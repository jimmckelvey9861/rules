/**
 * California Double Time Rule — Labor Code §510
 *
 * Non-exempt employees in California must receive double time (2.0x)
 * for all hours worked over 12 in a workday.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

export const californiaDoubleTime: Rule = createRule({
  id: "ca-double-time-12",
  title: "California Double Time (Labor Code §510)",
  jurisdiction: "CA",
  topic: "overtime",
  effectiveFrom: "2000-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_today", op: ">", value: 12 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "double_time",
    amount: 2.0,
  },

  citations: [
    {
      source: "California Labor Code §510",
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=510.&lawCode=LAB",
      section: "Cal. Lab. Code §510",
    },
  ],
});
