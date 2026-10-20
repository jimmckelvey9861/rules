/**
 * Remaining Gap Rules — fills the last 11 cells in the coverage matrix.
 *
 * - minor_labor: AL, MS, SC (3)
 * - overtime: HI, MN (2)
 * - reporting_time_pay: DC, NJ (2)
 * - rest_break: IL, VT (2)
 * - sick_leave: DC (1)
 * - split_shift_premium: NY (1)
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ═══════════════════════════════════════════════════════════════════
// MINOR LABOR — AL, MS, SC
// ═══════════════════════════════════════════════════════════════════

export const alabamaMinorLabor: Rule = createRule({
  id: "al-minor-labor",
  title: "Alabama Child Labor Law (14-17 year olds)",
  jurisdiction: "AL",
  topic: "minor_labor",
  effectiveFrom: "2024-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "AL" },
      { fact: "employee.age", op: "<", value: 18 },
    ],
  },
  result: {
    type: "prohibition",
    prohibitedAction: "Employing minors in violation of Alabama child labor law. Minors under 18 may not work in hazardous occupations. Minors 14-15: max 8 hrs/day, 40 hrs/week during non-school weeks; 3 hrs/school day, 18 hrs/school week. May not work before 7am or after 7pm (9pm June-Labor Day). Employment certificate required.",
  },
  citations: [{ source: "Ala. Code §25-8-1 et seq.", url: "https://law.justia.com/codes/alabama/title-25/chapter-8/", section: "§25-8-30 to §25-8-60" }],
});

export const mississippiMinorLabor: Rule = createRule({
  id: "ms-minor-labor",
  title: "Mississippi Child Labor Law (under 18)",
  jurisdiction: "MS",
  topic: "minor_labor",
  effectiveFrom: "2000-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MS" },
      { fact: "employee.age", op: "<", value: 18 },
    ],
  },
  result: {
    type: "prohibition",
    prohibitedAction: "Employing minors in violation of Mississippi child labor law. Minors under 16 may not work during school hours. Minors under 16: max 8 hrs/day, 44 hrs/week (non-school); 3 hrs/school day, 18 hrs/school week. May not work before 7am or after 7pm (9pm June-Labor Day). No minor under 14 may be employed except in agriculture or domestic service.",
  },
  citations: [{ source: "Miss. Code §71-1-17 et seq.", url: "https://law.justia.com/codes/mississippi/title-71/chapter-1/", section: "§71-1-17 to §71-1-29" }],
});

export const southCarolinaMinorLabor: Rule = createRule({
  id: "sc-minor-labor",
  title: "South Carolina Child Labor Law (under 18)",
  jurisdiction: "SC",
  topic: "minor_labor",
  effectiveFrom: "2000-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "SC" },
      { fact: "employee.age", op: "<", value: 18 },
    ],
  },
  result: {
    type: "prohibition",
    prohibitedAction: "Employing minors in violation of South Carolina child labor law. Minors 14-15: max 8 hrs/day, 40 hrs/week (non-school); 3 hrs/school day, 18 hrs/school week. Not before 7am or after 7pm (9pm June-Labor Day). Minors under 16 may not work in manufacturing or hazardous occupations. Employment certificate required.",
  },
  citations: [{ source: "S.C. Code §41-13-5 et seq.", url: "https://www.scstatehouse.gov/code/t41c013.php", section: "§41-13-5 to §41-13-25" }],
});

// ═══════════════════════════════════════════════════════════════════
// OVERTIME — HI, MN
// ═══════════════════════════════════════════════════════════════════

export const hawaiiOvertime: Rule = createRule({
  id: "hi-overtime",
  title: "Hawaii Overtime (1.5x after 40 hrs/week, state-enforced)",
  jurisdiction: "HI",
  topic: "overtime",
  effectiveFrom: "1963-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "HI" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_this_week", op: ">", value: 40 },
    ],
  },
  result: {
    type: "premium_required",
    premiumType: "overtime",
    formula: "1.5 × regular rate for hours over 40/week. State-enforced with different exemption standards than federal FLSA (domestic workers covered, salary threshold differs).",
  },
  citations: [{ source: "HRS §387-3", url: "https://www.capitol.hawaii.gov/hrscurrent/Vol07_Ch0346-0398/HRS0387/HRS_0387-0003.htm", section: "§387-3" }],
});

export const minnesotaOvertime: Rule = createRule({
  id: "mn-overtime",
  title: "Minnesota Overtime (1.5x after 48 hrs/week)",
  jurisdiction: "MN",
  topic: "overtime",
  effectiveFrom: "1977-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MN" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.hours_worked_this_week", op: ">", value: 48 },
    ],
  },
  result: {
    type: "premium_required",
    premiumType: "overtime",
    formula: "1.5 × regular rate for hours over 48/week. MN state threshold is 48 hours (higher than federal 40). Federal FLSA still applies at 40 hours for covered employers.",
  },
  citations: [{ source: "Minn. Stat. §177.25", url: "https://www.revisor.mn.gov/statutes/cite/177.25", section: "§177.25" }],
});

// ═══════════════════════════════════════════════════════════════════
// REPORTING TIME PAY — DC, NJ
// ═══════════════════════════════════════════════════════════════════

export const dcReportingTimePay: Rule = createRule({
  id: "dc-reporting-time-pay",
  title: "DC Reporting Time Pay (4 hours minimum)",
  jurisdiction: "DC",
  topic: "reporting_time_pay",
  effectiveFrom: "1993-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "DC" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.sent_home_early", op: "=", value: true },
    ],
  },
  result: {
    type: "minimum_required_value",
    targetFact: "shift.paid_hours",
    minimum: 4,
    unit: "hours at minimum wage when employee reports but is sent home",
  },
  citations: [{ source: "DC Mun. Regs. 7-907", url: "https://www.dol.dc.gov/page/office-wage-hour-compliance", section: "7 DCMR §907" }],
});

export const newJerseyReportingTimePay: Rule = createRule({
  id: "nj-reporting-time-pay",
  title: "New Jersey Reporting Time Pay (1 hour minimum)",
  jurisdiction: "NJ",
  topic: "reporting_time_pay",
  effectiveFrom: "1966-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NJ" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.sent_home_early", op: "=", value: true },
    ],
  },
  result: {
    type: "minimum_required_value",
    targetFact: "shift.paid_hours",
    minimum: 1,
    unit: "hours at minimum wage when employee reports but is sent home",
  },
  citations: [{ source: "N.J.A.C. 12:56-5.5", url: "https://www.nj.gov/labor/wageandhour/tools-resources/laws/wageandhourlaws.shtml", section: "N.J.A.C. 12:56-5.5" }],
});

// ═══════════════════════════════════════════════════════════════════
// REST BREAKS — IL, VT
// ═══════════════════════════════════════════════════════════════════

export const illinoisRestBreak: Rule = createRule({
  id: "il-rest-break",
  title: "Illinois Rest Break (hotel room attendants — 2×15 min per 7+ hr shift)",
  jurisdiction: "IL",
  topic: "rest_break",
  effectiveFrom: "2010-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "IL" },
      { fact: "shift.hours_worked_today", op: ">=", value: 7 },
      { fact: "employee.job_category", op: "=", value: "hotel" },
    ],
  },
  result: {
    type: "required_break",
    breakType: "paid rest break (15 min × 2 per shift of 7+ hours, hotel room attendants in Cook County)",
    minimumMinutes: 15,
  },
  citations: [{ source: "820 ILCS 140/3.1 (Hotel Room Attendant provisions)", url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=1505", section: "820 ILCS 140/3.1" }],
});

export const vermontRestBreak: Rule = createRule({
  id: "vt-rest-break",
  title: "Vermont Rest Break (reasonable opportunities to eat and use restroom)",
  jurisdiction: "VT",
  topic: "rest_break",
  effectiveFrom: "1970-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "VT" },
      { fact: "shift.hours_worked_today", op: ">", value: 0 },
    ],
  },
  result: {
    type: "required_break",
    breakType: "reasonable opportunities during work periods to eat and use toilet facilities (no specific duration mandated)",
    minimumMinutes: 1,
  },
  citations: [{ source: "21 V.S.A. §304", url: "https://legislature.vermont.gov/statutes/section/21/005/00304", section: "21 V.S.A. §304" }],
});

// ═══════════════════════════════════════════════════════════════════
// SICK LEAVE — DC
// ═══════════════════════════════════════════════════════════════════

export const dcSickLeave: Rule = createRule({
  id: "dc-sick-leave",
  title: "DC Accrued Sick and Safe Leave (1 hr per 37 hrs, up to 7 days/yr)",
  jurisdiction: "DC",
  topic: "sick_leave",
  effectiveFrom: "2008-11-13",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "DC" },
      { fact: "employer.total_employees", op: ">=", value: 100 },
    ],
  },
  result: {
    type: "minimum_required_value",
    targetFact: "leave.sick_hours_accrued",
    minimum: 56,
    unit: "hours per year (accrued at 1 hr per 37 hrs worked; 100+ employees = 7 days; 25-99 = 5 days; 1-24 = 3 days)",
  },
  citations: [{ source: "DC Accrued Sick and Safe Leave Act", url: "https://does.dc.gov/service/accrued-sick-and-safe-leave-act", section: "DC Code §32-531.01 et seq." }],
});

// ═══════════════════════════════════════════════════════════════════
// SPLIT SHIFT PREMIUM — NY
// ═══════════════════════════════════════════════════════════════════

export const newYorkSplitShiftPremium: Rule = createRule({
  id: "ny-split-shift-premium",
  title: "New York Split Shift / Spread-of-Hours Premium (extra hour at min wage)",
  jurisdiction: "NY",
  topic: "split_shift_premium",
  effectiveFrom: "2011-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.spread_of_hours", op: ">", value: 10 },
    ],
  },
  result: {
    type: "premium_required",
    premiumType: "split_shift_spread_of_hours",
    formula: "1 additional hour at basic minimum hourly wage when interval between start and end of workday exceeds 10 hours. Applies to all industries covered by NY wage orders.",
  },
  citations: [{ source: "12 NYCRR §142-2.4 (Hospitality), §146-1.6 (Misc.)", url: "https://dol.ny.gov/system/files/documents/2021/03/cr142.pdf", section: "12 NYCRR §142-2.4" }],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_REMAINING_GAP_RULES: readonly Rule[] = [
  alabamaMinorLabor,
  mississippiMinorLabor,
  southCarolinaMinorLabor,
  hawaiiOvertime,
  minnesotaOvertime,
  dcReportingTimePay,
  newJerseyReportingTimePay,
  illinoisRestBreak,
  vermontRestBreak,
  dcSickLeave,
  newYorkSplitShiftPremium,
];
