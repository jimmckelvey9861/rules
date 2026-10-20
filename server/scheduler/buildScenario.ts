/**
 * Scenario Builder
 *
 * Translates structured scheduling data into a flat Scenario (fact map)
 * that the rule engine can evaluate. Pure function — no side effects.
 */

import type { Scenario } from "../rules/types.js";
import type {
  ShiftAssignment,
  EmployeeProfile,
  StoreLocation,
  EmployerProfile,
  WeekContext,
} from "./types.js";

/**
 * Build a complete Scenario from structured scheduling inputs.
 */
export function buildScenario(
  shift: ShiftAssignment,
  employee: EmployeeProfile,
  store: StoreLocation,
  employer: EmployerProfile,
  weekContext: WeekContext,
  publishedDate?: string | null,
): Scenario {
  const scenario: Scenario = {};

  // ─── Location facts ────────────────────────────────────────────
  scenario["location.country"] = store.country;
  scenario["location.state"] = store.state;
  scenario["location.city"] = store.city;
  if (store.county) scenario["location.county"] = store.county;

  // ─── Employer facts ────────────────────────────────────────────
  scenario["employer.total_employees"] = employer.totalEmployees;
  if (employer.totalEmployeesAtLocation !== undefined) {
    scenario["employer.total_employees_at_location"] = employer.totalEmployeesAtLocation;
  }
  scenario["employer.industry_tag"] = employer.industryTag;
  if (employer.annualGrossSales !== undefined) {
    scenario["employer.annual_gross_sales"] = employer.annualGrossSales;
  }

  // ─── Employee facts ────────────────────────────────────────────
  scenario["employee.exempt_status"] = employee.exemptStatus;
  scenario["employee.regular_hourly_rate"] = employee.hourlyRate;
  scenario["employee.age"] = employee.age;
  scenario["employee.is_minor"] = employee.age < 18;
  scenario["employee.tipped_status"] = employee.tippedStatus;
  if (employee.cashWage !== undefined) {
    scenario["employee.cash_wage"] = employee.cashWage;
  }
  scenario["employee.job_category"] = employee.jobCategory;
  scenario["employee.tenure_months"] = employee.tenureMonths;
  if (employee.hoursWorkedLast12Months !== undefined) {
    scenario["employee.hours_worked_last_12_months"] = employee.hoursWorkedLast12Months;
  }
  if (employee.isSchoolEnrolled !== undefined) {
    scenario["employee.is_school_enrolled"] = employee.isSchoolEnrolled;
  }
  if (employee.unionMember !== undefined) {
    scenario["employee.union_member"] = employee.unionMember;
  }

  // ─── Shift facts (direct) ─────────────────────────────────────
  scenario["shift.date"] = shift.date;
  scenario["shift.start_time"] = shift.startTime;
  scenario["shift.end_time"] = shift.endTime;

  // ─── Shift facts (derived) ────────────────────────────────────
  const shiftHours = computeShiftLength(shift.startTime, shift.endTime);
  scenario["shift.shift_length_hours"] = shiftHours;
  scenario["shift.start_hour"] = parseHour(shift.startTime);
  scenario["shift.end_hour"] = parseHour(shift.endTime);

  // Hours worked today (sum of all shifts on same date)
  const sameDayShifts = weekContext.otherShiftsThisWeek.filter(s => s.date === shift.date);
  const otherHoursToday = sameDayShifts.reduce(
    (sum, s) => sum + computeShiftLength(s.startTime, s.endTime), 0
  );
  scenario["shift.hours_worked_today"] = otherHoursToday + shiftHours;

  // Hours worked this week (sum of all shifts in the week + this one)
  const otherHoursThisWeek = weekContext.otherShiftsThisWeek.reduce(
    (sum, s) => sum + computeShiftLength(s.startTime, s.endTime), 0
  );
  scenario["shift.hours_worked_this_week"] = otherHoursThisWeek + shiftHours;

  // Consecutive days worked
  const consecutiveDays = computeConsecutiveDays(
    shift.date,
    weekContext.otherShiftsThisWeek,
    weekContext.priorWeekShifts,
  );
  scenario["shift.consecutive_days_worked"] = consecutiveDays;
  scenario["shift.is_seventh_consecutive_day"] = consecutiveDays >= 7;

  // Spread of hours (first clock-in to last clock-out on same day)
  const spreadHours = computeSpreadOfHours(shift, sameDayShifts);
  scenario["shift.spread_of_hours"] = spreadHours;

  // Split shift detection
  const isSplit = sameDayShifts.length > 0 && hasGapBetweenShifts(shift, sameDayShifts);
  scenario["shift.is_split_shift"] = isSplit;
  if (isSplit) {
    scenario["shift.split_shift_gap_minutes"] = computeSplitGap(shift, sameDayShifts);
  }

  // School day / school in session (simplified: weekday = school day during school year)
  const isSchoolDay = computeIsSchoolDay(shift.date);
  const schoolInSession = computeSchoolInSession(shift.date);
  scenario["shift.is_school_day"] = isSchoolDay;
  scenario["shift.school_in_session"] = schoolInSession;

  // Meal/rest breaks — derived from shift.breaks array
  const mealBreaks = (shift.breaks || []).filter(b => b.type === "meal");
  const restBreaks = (shift.breaks || []).filter(b => b.type === "rest");
  scenario["shift.meal_break_provided"] = mealBreaks.length > 0;
  scenario["shift.rest_break_provided"] = restBreaks.length > 0;
  if (mealBreaks.length > 0) {
    scenario["shift.meal_break_minutes"] = mealBreaks.reduce((sum, b) => sum + b.durationMinutes, 0);
  }
  if (restBreaks.length > 0) {
    scenario["shift.rest_break_minutes"] = restBreaks.reduce((sum, b) => sum + b.durationMinutes, 0);
  }
  // Waiver: meal break is considered waived only if shift ≤ 6 hrs and no meal break
  scenario["shift.meal_break_waived"] = shiftHours <= 6 && mealBreaks.length === 0;

  // ─── Schedule / Fair Workweek facts ────────────────────────────
  // Uses per-shift publishedDate (when THIS shift was first communicated)
  const effectivePublishDate = shift.publishedDate || publishedDate;
  if (effectivePublishDate) {
    const shiftDate = new Date(shift.date + "T00:00:00");
    const pubDate = new Date(effectivePublishDate + "T00:00:00");
    const advanceNoticeDays = Math.floor((shiftDate.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24));
    scenario["schedule.advance_notice_days"] = advanceNoticeDays;

    if (shift.original) {
      // This shift was amended after publishing
      scenario["schedule.was_changed"] = true;
      scenario["schedule.employer_initiated"] = true;
      scenario["schedule.employee_consented"] = false;

      // Advance notice for the CHANGE is based on amendedDate
      if (shift.amendedDate) {
        const amendDate = new Date(shift.amendedDate + "T00:00:00");
        const changeNoticeDays = Math.floor((shiftDate.getTime() - amendDate.getTime()) / (1000 * 60 * 60 * 24));
        scenario["schedule.advance_notice_days"] = changeNoticeDays;
      }

      // Derive change type from the diff
      const originalHours = computeShiftLength(shift.original.startTime, shift.original.endTime);
      const currentHours = shiftHours;

      if (currentHours > originalHours) {
        scenario["schedule.change_type"] = "hours_added";
        scenario["schedule.hours_added"] = Math.round((currentHours - originalHours) * 10) / 10;
      } else if (currentHours < originalHours) {
        scenario["schedule.change_type"] = "hours_reduced";
        scenario["schedule.hours_reduced"] = Math.round((originalHours - currentHours) * 10) / 10;
      } else {
        // Same duration but different times
        scenario["schedule.change_type"] = "time_changed";
      }
    } else {
      scenario["schedule.was_changed"] = false;
    }
  }

  return scenario;
}

// ─── Helper Functions ──────────────────────────────────────────────

/** Parse "HH:MM" to total minutes since midnight */
function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Parse "HH:MM" to hour (0-23) */
function parseHour(time: string): number {
  return parseInt(time.split(":")[0], 10);
}

/** Compute shift length in hours from start/end times. Handles overnight shifts. */
export function computeShiftLength(startTime: string, endTime: string): number {
  let startMin = parseMinutes(startTime);
  let endMin = parseMinutes(endTime);
  if (endMin <= startMin) endMin += 24 * 60; // overnight
  return (endMin - startMin) / 60;
}

/** Count consecutive days worked ending on the given date */
function computeConsecutiveDays(
  date: string,
  otherShiftsThisWeek: ShiftAssignment[],
  priorWeekShifts: ShiftAssignment[],
): number {
  // Collect all dates with shifts (including the current one)
  const allShifts = [...priorWeekShifts, ...otherShiftsThisWeek];
  const datesWorked = new Set(allShifts.map(s => s.date));
  datesWorked.add(date);

  // Count backward from date
  let count = 1;
  let current = new Date(date + "T00:00:00");
  while (true) {
    current.setDate(current.getDate() - 1);
    const prev = current.toISOString().slice(0, 10);
    if (datesWorked.has(prev)) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/** Compute spread of hours (first start to last end on same day) */
function computeSpreadOfHours(shift: ShiftAssignment, sameDayShifts: ShiftAssignment[]): number {
  const allShifts = [shift, ...sameDayShifts];
  const starts = allShifts.map(s => parseMinutes(s.startTime));
  const ends = allShifts.map(s => {
    let e = parseMinutes(s.endTime);
    if (e <= parseMinutes(s.startTime)) e += 24 * 60;
    return e;
  });
  const earliest = Math.min(...starts);
  const latest = Math.max(...ends);
  return (latest - earliest) / 60;
}

/** Check if there's a gap > 60 min between any two shifts on the same day */
function hasGapBetweenShifts(shift: ShiftAssignment, sameDayShifts: ShiftAssignment[]): boolean {
  return computeSplitGap(shift, sameDayShifts) > 60;
}

/** Compute the gap in minutes between shifts on the same day */
function computeSplitGap(shift: ShiftAssignment, sameDayShifts: ShiftAssignment[]): number {
  const allShifts = [shift, ...sameDayShifts];
  // Sort by start time
  const sorted = allShifts
    .map(s => ({ start: parseMinutes(s.startTime), end: parseMinutes(s.endTime) }))
    .sort((a, b) => a.start - b.start);

  let maxGap = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    let end = sorted[i].end;
    if (end <= sorted[i].start) end += 24 * 60;
    const gap = sorted[i + 1].start - end;
    if (gap > maxGap) maxGap = gap;
  }
  return maxGap;
}

/** Simplified school day check: weekday during school year */
function computeIsSchoolDay(date: string): boolean {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  return computeSchoolInSession(date);
}

/**
 * Simplified school-in-session check.
 * School year: Sept 1 – June 15 (approximate).
 * Summer: June 16 – Aug 31.
 */
function computeSchoolInSession(date: string): boolean {
  const d = new Date(date + "T00:00:00");
  const month = d.getMonth(); // 0-indexed
  const day = d.getDate();

  // Summer break: June 16 – Aug 31
  if (month === 5 && day >= 16) return false; // June 16+
  if (month === 6 || month === 7) return false; // July, August
  return true;
}
