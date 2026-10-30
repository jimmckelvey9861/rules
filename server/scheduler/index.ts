/**
 * Scheduler API — Express router
 *
 * Endpoints:
 * - GET  /api/scheduler/stores       — list all stores
 * - GET  /api/scheduler/employees/:storeId — employees for a store
 * - POST /api/scheduler/check-shift  — evaluate a shift assignment
 */

import { Router } from "express";
import { STORES, EMPLOYER, EMPLOYEES } from "./dummyData.js";
import { buildScenario } from "./buildScenario.js";
import { evaluateRules, RULES } from "../rules/index.js";
import { topicCodeOf } from "../reference/taxonomy.js";

/**
 * Topics relevant to shift scheduling. Entitlement topics (sick leave, FMLA,
 * WARN act) are excluded — they're for leave/termination evaluation, not
 * shift compliance.
 */
const SCHEDULING_TOPICS = new Set([
  "pay.minimum_wage",
  "pay.tipped",
  "pay.overtime",
  "pay.premium",
  "sched.meal_break",
  "sched.rest_break",
  "sched.predictive",
  "sched.shift_structure",
  "minor.labor",
]);

const SCHEDULING_RULES = RULES.filter(r => SCHEDULING_TOPICS.has(topicCodeOf(r.topic) ?? ""));
import type { ShiftAssignment, WeekContext } from "./types.js";

export const schedulerRouter = Router();

// GET /api/scheduler/stores
schedulerRouter.get("/stores", (_req, res) => {
  res.json(STORES);
});

// GET /api/scheduler/employees/:storeId
schedulerRouter.get("/employees/:storeId", (req, res) => {
  const employees = EMPLOYEES[req.params.storeId];
  if (!employees) {
    res.status(404).json({ error: `Store "${req.params.storeId}" not found` });
    return;
  }
  res.json(employees);
});

// POST /api/scheduler/check-shift
schedulerRouter.post("/check-shift", (req, res) => {
  const { shift, employeeId, storeId, weekContext, publishedDate, employeeOverrides } = req.body as {
    shift: ShiftAssignment;
    employeeId: string;
    storeId: string;
    weekContext?: WeekContext;
    publishedDate?: string | null;
    employeeOverrides?: Partial<import("./types.js").EmployeeProfile>;
  };

  // Validate inputs
  if (!shift || !employeeId || !storeId) {
    res.status(400).json({ error: "Required: shift, employeeId, storeId" });
    return;
  }

  // Look up store
  const store = STORES.find(s => s.id === storeId);
  if (!store) {
    res.status(404).json({ error: `Store "${storeId}" not found` });
    return;
  }

  // Look up employee
  const storeEmployees = EMPLOYEES[storeId];
  if (!storeEmployees) {
    res.status(404).json({ error: `No employees for store "${storeId}"` });
    return;
  }
  const employee = storeEmployees.find(e => e.id === employeeId);
  if (!employee) {
    res.status(404).json({ error: `Employee "${employeeId}" not found in store "${storeId}"` });
    return;
  }

  // Build week context (default to empty if not provided)
  const ctx: WeekContext = weekContext || {
    otherShiftsThisWeek: [],
    priorWeekShifts: [],
  };

  // Apply overrides (client-side edits to employee attributes)
  const effectiveEmployee = employeeOverrides
    ? { ...employee, ...employeeOverrides }
    : employee;

  // Build scenario and evaluate (scheduling-relevant rules only)
  const scenario = buildScenario(shift, effectiveEmployee, store, EMPLOYER, ctx, publishedDate);
  const result = evaluateRules(SCHEDULING_RULES, scenario);

  res.json({
    shift,
    employee: { id: employee.id, name: employee.name },
    store: { id: store.id, name: store.name, state: store.state },
    scenario,
    summary: {
      violations: result.violations.length,
      warnings: result.warnings.length,
      passed: result.passed.length,
    },
    violations: result.violations,
    warnings: result.warnings,
  });
});
