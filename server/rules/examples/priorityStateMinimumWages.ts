/**
 * Minimum Wage Rules — Priority States
 *
 * States: NY, DC, VA, MD, NJ, CT, NV
 * (CA already covered in stateMinimumWages.ts)
 *
 * Source: U.S. DOL Wage and Hour Division
 * https://www.dol.gov/agencies/whd/minimum-wage/state
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── New York ──────────────────────────────────────────────────────

// NY has regional rates: NYC/Nassau/Suffolk/Westchester = $17.00, rest of state = $16.00

export const newYorkMinimumWageDownstate: Rule = createRule({
  id: "ny-minimum-wage-downstate-2025",
  title: "New York Minimum Wage (NYC, Nassau, Suffolk, Westchester)",
  jurisdiction: "NY",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "location.city", op: "in", value: ["New York City", "Nassau County", "Suffolk County", "Westchester County"] },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 17.00,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "New York Labor Law §652",
      url: "https://dol.ny.gov/minimum-wage",
      section: "NY Lab. Law §652",
    },
  ],
});

export const newYorkMinimumWageUpstate: Rule = createRule({
  id: "ny-minimum-wage-upstate-2025",
  title: "New York Minimum Wage (Remainder of State)",
  jurisdiction: "NY",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "location.city", op: "not_in", value: ["New York City", "Nassau County", "Suffolk County", "Westchester County"] },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 16.00,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "New York Labor Law §652",
      url: "https://dol.ny.gov/minimum-wage",
      section: "NY Lab. Law §652",
    },
  ],
});

// ─── District of Columbia ──────────────────────────────────────────

export const dcMinimumWage: Rule = createRule({
  id: "dc-minimum-wage-2025",
  title: "District of Columbia Minimum Wage",
  jurisdiction: "DC",
  topic: "minimum_wage",
  effectiveFrom: "2025-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "DC" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 17.95,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "DC Code §32-1003",
      url: "https://does.dc.gov/service/office-wage-hour-compliance",
      section: "DC Code §32-1003",
    },
  ],
});

// ─── Virginia ──────────────────────────────────────────────────────

export const virginiaMinimumWage: Rule = createRule({
  id: "va-minimum-wage-2025",
  title: "Virginia Minimum Wage",
  jurisdiction: "VA",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "VA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 12.77,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "Virginia Minimum Wage Act, Code of Virginia §40.1-28.10",
      url: "https://law.lis.virginia.gov/vacode/title40.1/chapter3/section40.1-28.10/",
      section: "Va. Code §40.1-28.10",
    },
  ],
});

// ─── Maryland ──────────────────────────────────────────────────────

export const marylandMinimumWage: Rule = createRule({
  id: "md-minimum-wage-2025",
  title: "Maryland Minimum Wage",
  jurisdiction: "MD",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MD" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 15.00,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "Maryland Wage and Hour Law, Md. Code Lab. & Empl. §3-413",
      url: "https://www.dllr.state.md.us/labor/wages/minimumwagelawtext.shtml",
      section: "Md. Code Lab. & Empl. §3-413",
    },
  ],
});

// Montgomery County MD has a higher rate
export const montgomeryCountyMdMinimumWage: Rule = createRule({
  id: "montgomery-county-md-mw-2025",
  title: "Montgomery County, MD Minimum Wage",
  jurisdiction: "Montgomery County",
  topic: "minimum_wage",
  effectiveFrom: "2025-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MD" },
      { fact: "location.county", op: "=", value: "Montgomery County" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 17.15,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "Montgomery County Code Ch. 27, Art. XI",
      url: "https://www.montgomerycountymd.gov/humanrights/Resources/Files/MinWageLaw.pdf",
      section: "Montgomery County Code §27-68",
    },
  ],
});

// ─── New Jersey ────────────────────────────────────────────────────

export const newJerseyMinimumWage: Rule = createRule({
  id: "nj-minimum-wage-2025",
  title: "New Jersey Minimum Wage",
  jurisdiction: "NJ",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NJ" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 15.92,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "New Jersey Wage and Hour Law, N.J.S.A. 34:11-56a4",
      url: "https://www.nj.gov/labor/wageandhour/tools-resources/minimumwage/",
      section: "N.J.S.A. 34:11-56a4",
    },
  ],
});

// NJ small employer rate (fewer than 6 employees)
export const newJerseyMinimumWageSmall: Rule = createRule({
  id: "nj-minimum-wage-small-2025",
  title: "New Jersey Minimum Wage (Small Employer, <6 employees)",
  jurisdiction: "NJ",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NJ" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employer.total_employees", op: "<", value: 6 },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 15.23,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "New Jersey Wage and Hour Law, N.J.S.A. 34:11-56a4",
      url: "https://www.nj.gov/labor/wageandhour/tools-resources/minimumwage/",
      section: "N.J.S.A. 34:11-56a4 (small employer)",
    },
  ],
});

// ─── Connecticut ───────────────────────────────────────────────────

export const connecticutMinimumWage: Rule = createRule({
  id: "ct-minimum-wage-2025",
  title: "Connecticut Minimum Wage",
  jurisdiction: "CT",
  topic: "minimum_wage",
  effectiveFrom: "2025-06-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CT" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 16.94,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "Connecticut General Statutes §31-58",
      url: "https://www.ctdol.state.ct.us/wgwkstnd/wage-hour/minimum-wage.htm",
      section: "Conn. Gen. Stat. §31-58",
    },
  ],
});

// ─── Nevada ────────────────────────────────────────────────────────

// Nevada eliminated the two-tier system in 2024. Single rate now.
export const nevadaMinimumWage: Rule = createRule({
  id: "nv-minimum-wage-2024",
  title: "Nevada Minimum Wage",
  jurisdiction: "NV",
  topic: "minimum_wage",
  effectiveFrom: "2024-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NV" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 12.00,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "Nevada Revised Statutes §608.250",
      url: "https://www.leg.state.nv.us/nrs/nrs-608.html#NRS608Sec250",
      section: "NRS §608.250",
    },
  ],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_PRIORITY_STATE_MINIMUM_WAGES: readonly Rule[] = [
  newYorkMinimumWageDownstate,
  newYorkMinimumWageUpstate,
  dcMinimumWage,
  virginiaMinimumWage,
  marylandMinimumWage,
  montgomeryCountyMdMinimumWage,
  newJerseyMinimumWage,
  newJerseyMinimumWageSmall,
  connecticutMinimumWage,
  nevadaMinimumWage,
];
