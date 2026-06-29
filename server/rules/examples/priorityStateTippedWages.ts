/**
 * Tipped & Industry-Specific Minimum Wage Rules — Priority States
 *
 * These rules define the minimum cash wage for tipped employees
 * and industry-specific rates (e.g., NYC fast food).
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── NYC Fast Food Minimum Wage ────────────────────────────────────

export const nycFastFoodMinimumWage: Rule = createRule({
  id: "nyc-fast-food-mw-2025",
  title: "NYC Fast Food Minimum Wage ($20.00)",
  jurisdiction: "New York City",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employer.industry_tag", op: "=", value: "fast_food" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 20.00,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "New York Labor Law §652, NYC Fast Food Worker Wage",
      url: "https://dol.ny.gov/minimum-wage",
      section: "NY Lab. Law §652 (fast food)",
    },
  ],
});

// ─── NYC Tipped Workers ────────────────────────────────────────────

export const nycTippedFoodServiceWage: Rule = createRule({
  id: "nyc-tipped-food-service-mw-2025",
  title: "NYC Tipped Food Service Worker Cash Wage ($12.50)",
  jurisdiction: "New York City",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employee.tipped_status", op: "=", value: "tipped" },
      { fact: "employee.job_category", op: "=", value: "food_service" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.cash_wage",
    minimum: 12.50,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "New York Labor Law §652, 12 NYCRR §146-1.3",
      url: "https://dol.ny.gov/minimum-wage",
      section: "12 NYCRR §146-1.3 (food service tip credit)",
    },
  ],
});

export const nycTippedServiceWage: Rule = createRule({
  id: "nyc-tipped-service-mw-2025",
  title: "NYC Tipped Service Worker Cash Wage ($14.50)",
  jurisdiction: "New York City",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.city", op: "=", value: "New York City" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employee.tipped_status", op: "=", value: "tipped" },
      { fact: "employee.job_category", op: "in", value: ["hotel", "retail", "other"] },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.cash_wage",
    minimum: 14.50,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "New York Labor Law §652, 12 NYCRR §146-1.3",
      url: "https://dol.ny.gov/minimum-wage",
      section: "12 NYCRR §146-1.3 (service tip credit)",
    },
  ],
});

// ─── DC Tipped Workers ─────────────────────────────────────────────

export const dcTippedWage: Rule = createRule({
  id: "dc-tipped-mw-2025",
  title: "DC Tipped Employee Cash Wage ($10.00)",
  jurisdiction: "DC",
  topic: "minimum_wage",
  effectiveFrom: "2025-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "DC" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employee.tipped_status", op: "=", value: "tipped" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.cash_wage",
    minimum: 10.00,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "DC Code §32-1003(f)",
      url: "https://does.dc.gov/service/office-wage-hour-compliance",
      section: "DC Code §32-1003(f)",
    },
  ],
});

// ─── NJ Tipped Workers ─────────────────────────────────────────────

export const njTippedWage: Rule = createRule({
  id: "nj-tipped-mw-2025",
  title: "New Jersey Tipped Employee Cash Wage ($5.62)",
  jurisdiction: "NJ",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NJ" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employee.tipped_status", op: "=", value: "tipped" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.cash_wage",
    minimum: 5.62,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "New Jersey Wage and Hour Law, N.J.S.A. 34:11-56a4",
      url: "https://www.nj.gov/labor/wageandhour/tools-resources/minimumwage/",
      section: "N.J.S.A. 34:11-56a4 (tipped employees)",
    },
  ],
});

// ─── CT Tipped Workers ─────────────────────────────────────────────

export const ctTippedHotelRestaurant: Rule = createRule({
  id: "ct-tipped-hotel-restaurant-mw-2025",
  title: "Connecticut Tipped Hotel/Restaurant Worker Cash Wage ($6.38)",
  jurisdiction: "CT",
  topic: "minimum_wage",
  effectiveFrom: "2025-06-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CT" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employee.tipped_status", op: "=", value: "tipped" },
      { fact: "employee.job_category", op: "in", value: ["food_service", "hotel"] },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.cash_wage",
    minimum: 6.38,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "Connecticut General Statutes §31-62",
      url: "https://www.ctdol.state.ct.us/wgwkstnd/wage-hour/minimum-wage.htm",
      section: "Conn. Gen. Stat. §31-62 (tipped employees)",
    },
  ],
});

// ─── NY State Tipped Workers (outside NYC) ─────────────────────────

export const nyStateTippedFoodServiceWage: Rule = createRule({
  id: "ny-state-tipped-food-service-mw-2025",
  title: "New York State Tipped Food Service Cash Wage ($10.65)",
  jurisdiction: "NY",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "location.city", op: "not_in", value: ["New York City", "Nassau County", "Suffolk County", "Westchester County"] },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "employee.tipped_status", op: "=", value: "tipped" },
      { fact: "employee.job_category", op: "=", value: "food_service" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.cash_wage",
    minimum: 10.65,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "New York Labor Law §652, 12 NYCRR §146-1.3",
      url: "https://dol.ny.gov/minimum-wage",
      section: "12 NYCRR §146-1.3 (upstate food service tip credit)",
    },
  ],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_PRIORITY_TIPPED_WAGES: readonly Rule[] = [
  nycFastFoodMinimumWage,
  nycTippedFoodServiceWage,
  nycTippedServiceWage,
  dcTippedWage,
  njTippedWage,
  ctTippedHotelRestaurant,
  nyStateTippedFoodServiceWage,
];
