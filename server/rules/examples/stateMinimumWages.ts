/**
 * State Minimum Wage Rules
 *
 * Each state with a minimum wage above the federal floor gets its own rule.
 * States that default to the federal rate (e.g., Alabama, Georgia) are covered
 * by the federal minimum wage rule and are not duplicated here.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── Alaska ────────────────────────────────────────────────────────

export const alaskaMinimumWage: Rule = createRule({
  id: "ak-minimum-wage-2025",
  title: "Alaska Minimum Wage",
  jurisdiction: "AK",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "AK" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 13.00,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "Alaska Wage and Hour Act, AS 23.10.065",
      url: "https://www.akleg.gov/basis/statutes.asp#23.10.065",
      section: "AS 23.10.065",
    },
  ],
});

// ─── California ────────────────────────────────────────────────────

export const californiaMinimumWage: Rule = createRule({
  id: "ca-minimum-wage-2025",
  title: "California Minimum Wage",
  jurisdiction: "CA",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 16.50,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "California Labor Code §1182.12",
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1182.12.&lawCode=LAB",
      section: "Cal. Lab. Code §1182.12",
    },
  ],
});

// ─── California Fast Food ──────────────────────────────────────────

export const californiaFastFoodMinimumWage: Rule = createRule({
  id: "ca-fast-food-minimum-wage-2025",
  title: "California Fast Food Minimum Wage (AB 1228)",
  jurisdiction: "CA",
  topic: "minimum_wage",
  effectiveFrom: "2024-04-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
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
      source: "California AB 1228 (Fast Food Minimum Wage)",
      url: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB1228",
      section: "Cal. Lab. Code §1474",
    },
  ],
});

// ─── Hawaii ────────────────────────────────────────────────────────

export const hawaiiMinimumWage: Rule = createRule({
  id: "hi-minimum-wage-2026",
  title: "Hawaii Minimum Wage",
  jurisdiction: "HI",
  topic: "minimum_wage",
  effectiveFrom: "2026-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "HI" },
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
      source: "Hawaii Revised Statutes §387-2",
      url: "https://www.capitol.hawaii.gov/hrscurrent/Vol07_Ch0346-0398/HRS0387/HRS_0387-0002.htm",
      section: "HRS §387-2",
    },
  ],
});

// ─── New Mexico ────────────────────────────────────────────────────

export const newMexicoMinimumWage: Rule = createRule({
  id: "nm-minimum-wage-2023",
  title: "New Mexico Minimum Wage",
  jurisdiction: "NM",
  topic: "minimum_wage",
  effectiveFrom: "2023-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NM" },
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
      source: "New Mexico Minimum Wage Act, NMSA §50-4-22",
      url: "https://nmonesource.com/nmos/nmsa/en/item/4383/index.do#!fragment/zoupio-_Toc140503771",
      section: "NMSA §50-4-22",
    },
  ],
});

// ─── Washington ────────────────────────────────────────────────────

export const washingtonMinimumWage: Rule = createRule({
  id: "wa-minimum-wage-2025",
  title: "Washington State Minimum Wage",
  jurisdiction: "WA",
  topic: "minimum_wage",
  effectiveFrom: "2025-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "WA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    ],
  },

  result: {
    type: "minimum_required_value",
    targetFact: "employee.regular_hourly_rate",
    minimum: 16.66,
    unit: "USD/hour",
  },

  citations: [
    {
      source: "RCW 49.46.020",
      url: "https://app.leg.wa.gov/rcw/default.aspx?cite=49.46.020",
      section: "RCW 49.46.020",
    },
  ],
});
