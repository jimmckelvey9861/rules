/**
 * Scheduler Data Types
 *
 * These represent the structured inputs that come from the scheduling UI
 * or backend database. The Scenario Builder translates these into the flat
 * fact map that the rule engine evaluates.
 */

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  date: string;         // YYYY-MM-DD
  startTime: string;    // HH:MM (24-hour)
  endTime: string;      // HH:MM (24-hour)
}

export interface EmployeeProfile {
  id: string;
  name: string;
  age: number;
  exemptStatus: "exempt" | "non_exempt";
  hourlyRate: number;
  tippedStatus: "not_tipped" | "tipped" | "service_charge";
  cashWage?: number;            // tipped employees only
  jobCategory: string;          // food_service, retail, healthcare, etc.
  isSchoolEnrolled?: boolean;   // for minors
  unionMember?: boolean;
  tenureMonths: number;
  hoursWorkedLast12Months?: number;
}

export interface StoreLocation {
  id: string;
  name: string;
  state: string;
  city: string;
  county?: string;
  country: string;
}

export interface EmployerProfile {
  totalEmployees: number;
  totalEmployeesAtLocation?: number;
  industryTag: string;
  annualGrossSales?: number;
}

/**
 * Context for the current week — all other shifts for the same employee.
 * Used to compute derived facts like weekly hours, consecutive days, etc.
 */
export interface WeekContext {
  /** All shifts for this employee in the same workweek (excluding the one being evaluated) */
  otherShiftsThisWeek: ShiftAssignment[];
  /** Shifts from the prior week (for consecutive-day calculation) */
  priorWeekShifts: ShiftAssignment[];
}
