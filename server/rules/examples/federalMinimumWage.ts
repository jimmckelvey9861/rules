/**
 * Federal Minimum Wage Rule — FLSA §206(a)(1)
 *
 * Non-exempt employees must be paid at least $7.25/hour.
 * This rate has been in effect since July 24, 2009.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

export const federalMinimumWage: Rule = createRule({
  id: "federal-minimum-wage-7.25",
  title: "Federal Minimum Wage (FLSA)",
  jurisdiction: "Federal",
  topic: "minimum_wage",
  effectiveFrom: "2009-07-24",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.country", op: "=", value: "US" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 7.25,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "Fair Labor Standards Act §206(a)(1)",
      url: "https://www.law.cornell.edu/uscode/text/29/206",
      section: "29 U.S.C. §206(a)(1)",
    },
  ],
});
