/**
 * Fact Registry
 *
 * Defines all allowed facts with their types.
 * The evaluator and createRule() use this to validate rule definitions.
 */

import type { FactDefinition, FactType } from "./types.js";

const FACTS: FactDefinition[] = [
  // Location
  { path: "location.state", type: "string", description: "Two-letter state code (e.g. CA, NY)" },
  { path: "location.city", type: "string", description: "City name" },

  // Employer
  { path: "employer.employee_count", type: "number", description: "Total number of employees" },
  { path: "employer.industry", type: "string", description: "Employer industry classification" },

  // Employee
  { path: "employee.exempt_status", type: "enum", description: "FLSA exemption status", enumValues: ["exempt", "non_exempt"] },
  { path: "employee.tipped_status", type: "enum", description: "Whether employee receives tips", enumValues: ["tipped", "non_tipped"] },
  { path: "employee.age", type: "number", description: "Employee age in years" },
  { path: "employee.hourly_rate", type: "money", description: "Employee hourly pay rate in dollars" },

  // Shift
  { path: "shift.date", type: "date", description: "Shift date (ISO YYYY-MM-DD)" },
  { path: "shift.hours_worked_today", type: "number", description: "Hours worked in the current day" },
  { path: "shift.hours_worked_this_week", type: "number", description: "Hours worked in the current workweek" },
  { path: "shift.shift_length_hours", type: "number", description: "Length of the current shift in hours" },

  // Schedule
  { path: "schedule.split_shift", type: "boolean", description: "Whether this is a split shift" },
  { path: "schedule.was_changed", type: "boolean", description: "Whether the schedule was changed after posting" },
  { path: "schedule.posted_days_in_advance", type: "number", description: "Days in advance the schedule was posted" },
  { path: "schedule.employee_consented", type: "boolean", description: "Whether the employee consented to the change" },
];

/** Map from fact path to definition for O(1) lookup */
const FACT_MAP = new Map<string, FactDefinition>(
  FACTS.map(f => [f.path, f])
);

/**
 * Get a fact definition by path. Returns undefined if unknown.
 */
export function getFact(path: string): FactDefinition | undefined {
  return FACT_MAP.get(path);
}

/**
 * Check if a fact path is registered.
 */
export function isKnownFact(path: string): boolean {
  return FACT_MAP.has(path);
}

/**
 * Get the type of a registered fact.
 */
export function getFactType(path: string): FactType | undefined {
  return FACT_MAP.get(path)?.type;
}

/**
 * Get all registered fact definitions.
 */
export function getAllFacts(): readonly FactDefinition[] {
  return FACTS;
}

/**
 * Get enum values for a fact (if it's an enum type).
 */
export function getEnumValues(path: string): string[] | undefined {
  const fact = FACT_MAP.get(path);
  if (fact?.type === "enum") return fact.enumValues;
  return undefined;
}
