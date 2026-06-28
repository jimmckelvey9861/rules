/**
 * Federal WARN Act — 29 U.S.C. §2102
 *
 * Employers with 100+ employees must provide 60 calendar days advance
 * written notice before a plant closing or mass layoff.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

export const federalWarnAct: Rule = createRule({
  id: "federal-warn-act-60day",
  title: "Federal WARN Act — 60-Day Notice Requirement",
  jurisdiction: "Federal",
  topic: "warn_act",
  effectiveFrom: "1989-02-04",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.country", op: "=", value: "US" },
      { fact: "employer.total_employees_at_location", op: ">=", value: 100 },
      { fact: "termination.is_mass_layoff", op: "=", value: true },
      { fact: "termination.notice_days_given", op: "<", value: 60 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Mass layoff or plant closing without 60 calendar days advance written notice to affected employees",
  },

  citations: [
    {
      source: "Worker Adjustment and Retraining Notification Act, 29 U.S.C. §2102",
      url: "https://www.law.cornell.edu/uscode/text/29/2102",
      section: "29 U.S.C. §2102",
    },
  ],
});
