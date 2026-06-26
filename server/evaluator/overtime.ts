/**
 * Overtime Evaluator
 *
 * Given a normalized OvertimeRule and a set of facts about the
 * employee's hours and rate, returns overtime calculation.
 */

import type { OvertimeRule } from "../normalizer/canonical-schemas.js";

export interface OvertimeInput {
  hours_worked_in_workweek?: number;
  hours_worked_in_workday?: number;
  regular_rate: number;
  employee: {
    exemption_status: string;  // "non_exempt", "exempt", etc.
  };
}

export interface OvertimeResult {
  applies: boolean;
  overtimeHours: number;
  overtimePay: number;
  regularPay: number;
  totalPay: number;
  reason?: string;
  doubleTimeHours?: number;
  doubleTimePay?: number;
}

/**
 * Evaluate an overtime rule against input facts.
 */
export function evaluateOvertime(
  rule: OvertimeRule,
  input: OvertimeInput,
): OvertimeResult {
  // Check exemption status
  const requiredStatus = rule.appliesTo["employee.exemption_status"] as string | undefined;
  if (requiredStatus && input.employee.exemption_status !== requiredStatus) {
    const hoursWorked = input.hours_worked_in_workweek || input.hours_worked_in_workday || 0;
    return {
      applies: false,
      overtimeHours: 0,
      overtimePay: 0,
      regularPay: hoursWorked * input.regular_rate,
      totalPay: hoursWorked * input.regular_rate,
      reason: `Employee is "${input.employee.exemption_status}" — overtime does not apply (requires "${requiredStatus}")`,
    };
  }

  // Determine hours worked based on rule basis
  let hoursWorked: number;
  if (rule.basis === "weekly_hours" || rule.basis === "both") {
    hoursWorked = input.hours_worked_in_workweek || 0;
  } else {
    hoursWorked = input.hours_worked_in_workday || 0;
  }

  const threshold = rule.threshold.hours;

  // Calculate overtime hours
  const overtimeHours = Math.max(0, hoursWorked - threshold);

  // Calculate double time (if applicable, e.g., California)
  let doubleTimeHours = 0;
  let doubleTimePay = 0;
  let effectiveOvertimeHours = overtimeHours;

  if (rule.doubleTimeRate && rule.doubleTimeThreshold) {
    const dtThreshold = rule.doubleTimeThreshold.hours;
    if (hoursWorked > dtThreshold) {
      doubleTimeHours = hoursWorked - dtThreshold;
      effectiveOvertimeHours = overtimeHours - doubleTimeHours;
      doubleTimePay = doubleTimeHours * input.regular_rate * rule.doubleTimeRate;
    }
  }

  // Calculate overtime pay
  const overtimePay = effectiveOvertimeHours * input.regular_rate * rule.premiumRate;
  const regularHours = Math.min(hoursWorked, threshold);
  const regularPay = regularHours * input.regular_rate;
  const totalPay = regularPay + overtimePay + doubleTimePay;

  return {
    applies: overtimeHours > 0,
    overtimeHours: effectiveOvertimeHours + doubleTimeHours,
    overtimePay: overtimePay + doubleTimePay,
    regularPay,
    totalPay,
    ...(doubleTimeHours > 0 ? { doubleTimeHours, doubleTimePay } : {}),
  };
}
