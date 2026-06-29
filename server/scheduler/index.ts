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
  const { shift, employeeId, storeId, weekContext } = req.body as {
    shift: ShiftAssignment;
    employeeId: string;
    storeId: string;
    weekContext?: WeekContext;
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

  // Build scenario and evaluate
  const scenario = buildScenario(shift, employee, store, EMPLOYER, ctx);
  const result = evaluateRules(RULES, scenario);

  res.json({
    shift,
    employee: { id: employee.id, name: employee.name },
    store: { id: store.id, name: store.name, state: store.state },
    scenario,
    summary: {
      violations: result.violations.length,
      warnings: result.warnings.length,
    },
    violations: result.violations,
    warnings: result.warnings,
  });
});
