/**
 * Tests for the Scenario Builder
 */

import { buildScenario, computeShiftLength } from "./buildScenario.js";
import type {
  ShiftAssignment,
  EmployeeProfile,
  StoreLocation,
  EmployerProfile,
  WeekContext,
} from "./types.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
  }
}

// ─── Test Data ───────────────────────────────────────────────────────

const testEmployee: EmployeeProfile = {
  id: "emp-1",
  name: "Maria Garcia",
  age: 17,
  exemptStatus: "non_exempt",
  hourlyRate: 16.50,
  tippedStatus: "not_tipped",
  jobCategory: "food_service",
  isSchoolEnrolled: true,
  tenureMonths: 6,
};

const testStore: StoreLocation = {
  id: "store-nyc-1",
  name: "NYC Times Square",
  state: "NY",
  city: "New York",
  county: "New York",
  country: "US",
};

const testEmployer: EmployerProfile = {
  totalEmployees: 2000,
  totalEmployeesAtLocation: 25,
  industryTag: "fast_food",
};

const emptyWeekContext: WeekContext = {
  otherShiftsThisWeek: [],
  priorWeekShifts: [],
};

// ─── Tests ───────────────────────────────────────────────────────────

function testShiftLength() {
  console.log("\n── computeShiftLength ──────────────────────────────────\n");
  assert(computeShiftLength("09:00", "17:00") === 8, "9am-5pm = 8 hours");
  assert(computeShiftLength("06:00", "14:30") === 8.5, "6am-2:30pm = 8.5 hours");
  assert(computeShiftLength("22:00", "06:00") === 8, "10pm-6am (overnight) = 8 hours");
  assert(computeShiftLength("08:00", "08:00") === 24, "8am-8am (full day) = 24 hours");
  assert(computeShiftLength("12:00", "12:30") === 0.5, "12pm-12:30pm = 0.5 hours");
}

function testBasicScenario() {
  console.log("\n── buildScenario: basic facts ──────────────────────────\n");

  const shift: ShiftAssignment = {
    id: "shift-1",
    employeeId: "emp-1",
    date: "2025-03-10", // Monday in March (school in session)
    startTime: "16:00",
    endTime: "21:00",
  };

  const scenario = buildScenario(shift, testEmployee, testStore, testEmployer, emptyWeekContext);

  // Location
  assert(scenario["location.state"] === "NY", "location.state = NY");
  assert(scenario["location.city"] === "New York", "location.city = New York");
  assert(scenario["location.country"] === "US", "location.country = US");

  // Employer
  assert(scenario["employer.total_employees"] === 2000, "employer.total_employees = 2000");
  assert(scenario["employer.industry_tag"] === "fast_food", "employer.industry_tag = fast_food");

  // Employee
  assert(scenario["employee.exempt_status"] === "non_exempt", "employee.exempt_status = non_exempt");
  assert(scenario["employee.regular_hourly_rate"] === 16.50, "employee.regular_hourly_rate = 16.50");
  assert(scenario["employee.age"] === 17, "employee.age = 17");
  assert(scenario["employee.is_minor"] === true, "employee.is_minor = true");

  // Shift derived
  assert(scenario["shift.shift_length_hours"] === 5, "shift_length_hours = 5");
  assert(scenario["shift.start_hour"] === 16, "start_hour = 16");
  assert(scenario["shift.end_hour"] === 21, "end_hour = 21");
  assert(scenario["shift.hours_worked_today"] === 5, "hours_worked_today = 5 (only shift)");
  assert(scenario["shift.hours_worked_this_week"] === 5, "hours_worked_this_week = 5 (only shift)");
  assert(scenario["shift.consecutive_days_worked"] === 1, "consecutive_days = 1");
  assert(scenario["shift.is_seventh_consecutive_day"] === false, "not 7th day");

  // School
  assert(scenario["shift.is_school_day"] === true, "March Monday = school day");
  assert(scenario["shift.school_in_session"] === true, "March = school in session");
}

function testWeeklyHoursAccumulation() {
  console.log("\n── buildScenario: weekly hours accumulation ────────────\n");

  const shift: ShiftAssignment = {
    id: "shift-fri",
    employeeId: "emp-1",
    date: "2025-03-14", // Friday
    startTime: "09:00",
    endTime: "17:00",
  };

  const weekContext: WeekContext = {
    otherShiftsThisWeek: [
      { id: "s1", employeeId: "emp-1", date: "2025-03-10", startTime: "09:00", endTime: "17:00" }, // Mon 8h
      { id: "s2", employeeId: "emp-1", date: "2025-03-11", startTime: "09:00", endTime: "17:00" }, // Tue 8h
      { id: "s3", employeeId: "emp-1", date: "2025-03-12", startTime: "09:00", endTime: "17:00" }, // Wed 8h
      { id: "s4", employeeId: "emp-1", date: "2025-03-13", startTime: "09:00", endTime: "17:00" }, // Thu 8h
    ],
    priorWeekShifts: [],
  };

  const scenario = buildScenario(shift, testEmployee, testStore, testEmployer, weekContext);

  assert(scenario["shift.shift_length_hours"] === 8, "Friday shift = 8 hours");
  assert(scenario["shift.hours_worked_this_week"] === 40, "Mon-Fri = 40 hours total");
  assert(scenario["shift.consecutive_days_worked"] === 5, "5 consecutive days");
}

function testConsecutiveDaysAcrossWeeks() {
  console.log("\n── buildScenario: consecutive days across weeks ────────\n");

  const shift: ShiftAssignment = {
    id: "shift-mon",
    employeeId: "emp-1",
    date: "2025-03-10", // Monday
    startTime: "09:00",
    endTime: "17:00",
  };

  const weekContext: WeekContext = {
    otherShiftsThisWeek: [],
    priorWeekShifts: [
      { id: "p1", employeeId: "emp-1", date: "2025-03-04", startTime: "09:00", endTime: "17:00" }, // Tue
      { id: "p2", employeeId: "emp-1", date: "2025-03-05", startTime: "09:00", endTime: "17:00" }, // Wed
      { id: "p3", employeeId: "emp-1", date: "2025-03-06", startTime: "09:00", endTime: "17:00" }, // Thu
      { id: "p4", employeeId: "emp-1", date: "2025-03-07", startTime: "09:00", endTime: "17:00" }, // Fri
      { id: "p5", employeeId: "emp-1", date: "2025-03-08", startTime: "09:00", endTime: "17:00" }, // Sat
      { id: "p6", employeeId: "emp-1", date: "2025-03-09", startTime: "09:00", endTime: "17:00" }, // Sun
    ],
  };

  const scenario = buildScenario(shift, testEmployee, testStore, testEmployer, weekContext);

  assert(scenario["shift.consecutive_days_worked"] === 7, "7 consecutive days (Tue-Mon)");
  assert(scenario["shift.is_seventh_consecutive_day"] === true, "is_seventh_consecutive_day = true");
}

function testSplitShiftDetection() {
  console.log("\n── buildScenario: split shift detection ────────────────\n");

  const shift: ShiftAssignment = {
    id: "shift-evening",
    employeeId: "emp-1",
    date: "2025-03-10",
    startTime: "17:00",
    endTime: "21:00",
  };

  const weekContext: WeekContext = {
    otherShiftsThisWeek: [
      // Morning shift on same day with >60 min gap
      { id: "shift-morning", employeeId: "emp-1", date: "2025-03-10", startTime: "08:00", endTime: "12:00" },
    ],
    priorWeekShifts: [],
  };

  const scenario = buildScenario(shift, testEmployee, testStore, testEmployer, weekContext);

  assert(scenario["shift.is_split_shift"] === true, "Two shifts with 5hr gap = split shift");
  assert(scenario["shift.spread_of_hours"] === 13, "8am-9pm = 13 hour spread");
  assert(scenario["shift.hours_worked_today"] === 8, "4 + 4 = 8 hours today");
}

function testSummerNotSchoolDay() {
  console.log("\n── buildScenario: summer = not school day ──────────────\n");

  const shift: ShiftAssignment = {
    id: "shift-summer",
    employeeId: "emp-1",
    date: "2025-07-14", // Monday in July
    startTime: "09:00",
    endTime: "17:00",
  };

  const scenario = buildScenario(shift, testEmployee, testStore, testEmployer, emptyWeekContext);

  assert(scenario["shift.is_school_day"] === false, "July Monday = not school day");
  assert(scenario["shift.school_in_session"] === false, "July = school not in session");
}

// ─── Run ─────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("  Scenario Builder — Tests");
console.log("═══════════════════════════════════════════════════════════");

testShiftLength();
testBasicScenario();
testWeeklyHoursAccumulation();
testConsecutiveDaysAcrossWeeks();
testSplitShiftDetection();
testSummerNotSchoolDay();

console.log("\n═══════════════════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════════════════════════\n");

process.exit(failed > 0 ? 1 : 0);
