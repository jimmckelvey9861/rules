/**
 * Derived facts — the facts buildScenario computes from shift data rather
 * than reading from a record. A scheduler that evaluates a rule pack locally
 * has to compute these the same way, so the recipes ship inside the pack.
 */

export const DERIVED_FACTS: Record<string, string> = {
  "employee.is_minor": "employee.age < 18",
  "shift.shift_length_hours": "(end time - start time) in hours; an end time at or before the start time means the shift crosses midnight",
  "shift.start_hour": "hour component of the shift start time (0-23)",
  "shift.end_hour": "hour component of the shift end time (0-23)",
  "shift.hours_worked_today": "this shift's length plus the length of every other shift for the employee on the same date",
  "shift.hours_worked_this_week": "this shift's length plus the length of every other shift for the employee in the same workweek",
  "shift.consecutive_days_worked": "count of consecutive calendar days with a shift, ending on this shift's date, looking back through the prior week",
  "shift.is_seventh_consecutive_day": "shift.consecutive_days_worked >= 7",
  "shift.spread_of_hours": "hours from the earliest start to the latest end across all of the employee's shifts on the same date",
  "shift.is_split_shift": "another shift on the same date with a gap of more than 60 minutes between them",
  "shift.split_shift_gap_minutes": "largest gap in minutes between the employee's shifts on the same date (only when shift.is_split_shift)",
  "shift.is_school_day": "weekday during the school year (simplified: Monday to Friday, September to mid-June)",
  "shift.school_in_session": "date falls in the school year (simplified: September to mid-June)",
  "shift.meal_break_provided": "the shift has at least one break of type meal",
  "shift.rest_break_provided": "the shift has at least one break of type rest",
  "shift.meal_break_minutes": "sum of the durations of the shift's meal breaks",
  "shift.rest_break_minutes": "sum of the durations of the shift's rest breaks",
  "shift.meal_break_waived": "shift length is 6 hours or less and no meal break is scheduled",
  "schedule.advance_notice_days": "whole days from the date the shift (or its latest amendment) was communicated to the employee to the shift date",
  "schedule.was_changed": "the shift was amended after it was published",
  "schedule.employer_initiated": "true for an amended shift unless the scheduler records the employee asked for it",
  "schedule.employee_consented": "false for an amended shift unless the scheduler records written consent",
  "schedule.change_type": "hours_added when the amended shift is longer, hours_reduced when shorter, time_changed when the same length at different times",
  "schedule.hours_added": "amended length minus original length, when positive, to one decimal",
  "schedule.hours_reduced": "original length minus amended length, when positive, to one decimal",
};
