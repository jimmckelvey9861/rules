/**
 * Minimum Wage Evaluator
 *
 * Given a normalized MinimumWageRule and a set of facts about the
 * employee/employer/business, returns the applicable wage rate.
 */

import type { MinimumWageRule } from "../normalizer/canonical-schemas.js";

export interface MinimumWageInput {
  jurisdiction?: string;
  employer?: {
    total_employees?: number;
    industry_tags?: string[];
  };
  employee?: {
    category?: string;   // "tipped", "fast_food_worker", etc.
    age?: number;
  };
  business?: {
    industry_tags?: string[];
  };
}

export interface MinimumWageResult {
  applicableRate: string;
  matchedCondition: string | null;
  conditionDetail: string | null;
  ruleId?: string;
}

/**
 * Evaluate a minimum wage rule against input facts.
 * Returns the most specific applicable rate.
 */
export function evaluateMinimumWage(
  rule: MinimumWageRule,
  input: MinimumWageInput,
): MinimumWageResult {
  // If only one rate (no conditions), return it
  if (!rule.multiRate || rule.rates.length <= 1) {
    const rate = rule.rates[0];
    return {
      applicableRate: rate?.amount || rule.defaultRate,
      matchedCondition: null,
      conditionDetail: null,
    };
  }

  // Try to match a conditioned rate
  for (const rate of rule.rates) {
    if (!rate.condition) continue;

    if (matchesCondition(rate.condition, input)) {
      return {
        applicableRate: rate.amount,
        matchedCondition: rate.condition,
        conditionDetail: rate.conditionDetail,
      };
    }
  }

  // No condition matched — return the default (general) rate
  return {
    applicableRate: rule.defaultRate,
    matchedCondition: null,
    conditionDetail: null,
  };
}

/**
 * Check if the input facts match a rate condition.
 */
function matchesCondition(condition: string, input: MinimumWageInput): boolean {
  const employeeCategory = input.employee?.category?.toLowerCase() || "";
  const industryTags = [
    ...(input.employer?.industry_tags || []),
    ...(input.business?.industry_tags || []),
  ].map(t => t.toLowerCase());
  const employeeCount = input.employer?.total_employees;

  switch (condition) {
    case "large_employer":
      return employeeCount != null && employeeCount >= 26;

    case "small_employer":
      return employeeCount != null && employeeCount <= 25;

    case "tipped_employee":
      return employeeCategory === "tipped" || employeeCategory === "tipped_employee";

    case "fast_food_worker":
      return (
        employeeCategory === "fast_food" ||
        employeeCategory === "fast_food_worker" ||
        industryTags.includes("fast_food")
      );

    case "healthcare_worker":
      return (
        employeeCategory === "healthcare" ||
        employeeCategory === "healthcare_worker" ||
        industryTags.includes("healthcare")
      );

    case "hotel_worker":
      return (
        employeeCategory === "hotel" ||
        employeeCategory === "hotel_worker" ||
        industryTags.includes("hotel")
      );

    case "government_supported":
    case "government_supported_employees":
      return employeeCategory === "government_supported";

    case "nonprofit_employer":
      return industryTags.includes("nonprofit");

    default:
      // Generic match: check if condition keyword appears in employee category or industry
      return (
        employeeCategory.includes(condition.replace(/_/g, " ")) ||
        industryTags.some(t => t.includes(condition.replace(/_/g, " ")))
      );
  }
}
