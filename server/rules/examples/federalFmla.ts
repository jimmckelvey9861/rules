/**
 * Federal FMLA — 29 U.S.C. §2612
 *
 * Eligible employees at covered employers may take up to 12 weeks
 * of unpaid, job-protected leave per year for qualifying reasons.
 *
 * Eligibility: 12+ months employed, 1,250+ hours in prior 12 months.
 * Employer coverage: 50+ employees within 75 miles.
 *
 * This rule checks whether FMLA applies to a given scenario.
 * When conditions are met and leave is denied, it's a violation.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

export const federalFmla: Rule = createRule({
  id: "federal-fmla-eligibility",
  title: "Federal FMLA — Employee Eligibility",
  jurisdiction: "Federal",
  topic: "family_medical_leave",
  effectiveFrom: "1993-08-05",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.country", op: "=", value: "US" },
      { fact: "employer.total_employees", op: ">=", value: 50 },
      { fact: "employee.tenure_months", op: ">=", value: 12 },
      { fact: "employee.hours_worked_last_12_months", op: ">=", value: 1250 },
      { fact: "leave.type", op: "in", value: ["family", "medical", "parental"] },
    ],
  },

  result: {
    type: "warning",
    message: "Employee is FMLA-eligible: entitled to up to 12 weeks unpaid job-protected leave",
  },

  citations: [
    {
      source: "Family and Medical Leave Act, 29 U.S.C. §2612",
      url: "https://www.law.cornell.edu/uscode/text/29/2612",
      section: "29 U.S.C. §2612",
    },
  ],
});
