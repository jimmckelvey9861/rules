/**
 * Local (City/County) Paid Sick Leave Ordinances — 9 jurisdictions
 *
 * These are city-level sick leave laws that either predate or supplement
 * their state's paid sick leave mandate.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

function localSickLeaveRule(opts: {
  city: string;
  accrualRate: string;
  capHours: number;
  employeeThreshold: number;
  effectiveFrom: string;
  source: string;
  url: string;
  section?: string;
}): Rule {
  return createRule({
    id: `${opts.city.toLowerCase().replace(/[^a-z]+/g, "-")}-sick-leave`,
    title: `${opts.city} Paid Sick Leave (${opts.accrualRate}, up to ${opts.capHours} hrs)`,
    jurisdiction: opts.city,
    topic: "sick_leave",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: {
      all: [
        { fact: "location.city", op: "=", value: opts.city },
        { fact: "employer.total_employees", op: ">=", value: opts.employeeThreshold },
      ],
    },
    result: {
      type: "minimum_required_value",
      targetFact: "leave.sick_hours_accrued",
      minimum: opts.capHours,
      unit: `hours/year (accrued at ${opts.accrualRate})`,
    },
    citations: [{ source: opts.source, url: opts.url, section: opts.section }],
  });
}

export const sanFranciscoSickLeave = localSickLeaveRule({
  city: "San Francisco",
  accrualRate: "1 hr per 30 hrs worked",
  capHours: 72,
  employeeThreshold: 1,
  effectiveFrom: "2007-02-05",
  source: "San Francisco Paid Sick Leave Ordinance",
  url: "https://sfgov.org/olse/paid-sick-leave-ordinance-pslo",
  section: "SF Admin Code Ch. 12W",
});

export const seattleSickLeave = localSickLeaveRule({
  city: "Seattle",
  accrualRate: "1 hr per 30 hrs worked",
  capHours: 72,
  employeeThreshold: 1,
  effectiveFrom: "2012-09-01",
  source: "Seattle Paid Sick & Safe Time Ordinance",
  url: "https://www.seattle.gov/laborstandards/ordinances/paid-sick-and-safe-time",
  section: "SMC 14.16",
});

export const newYorkCitySickLeave = localSickLeaveRule({
  city: "New York City",
  accrualRate: "1 hr per 30 hrs worked",
  capHours: 56,
  employeeThreshold: 1,
  effectiveFrom: "2020-09-30",
  source: "NYC Earned Safe & Sick Time Act (expanded 2020)",
  url: "https://www.nyc.gov/site/dca/about/paid-sick-leave-law.page",
  section: "NYC Admin Code §20-911 et seq.",
});

export const losAngelesSickLeave = localSickLeaveRule({
  city: "Los Angeles",
  accrualRate: "1 hr per 30 hrs worked",
  capHours: 48,
  employeeThreshold: 1,
  effectiveFrom: "2016-07-01",
  source: "Los Angeles Paid Sick Leave Ordinance",
  url: "https://wagesla.lacity.org/",
  section: "LAMC §187.00 et seq.",
});

export const chicagoSickLeave = localSickLeaveRule({
  city: "Chicago",
  accrualRate: "1 hr per 40 hrs worked",
  capHours: 40,
  employeeThreshold: 1,
  effectiveFrom: "2024-01-01",
  source: "Chicago Paid Leave & Paid Sick Leave Ordinance",
  url: "https://www.chicago.gov/city/en/depts/bacp/supp_info/paid-leave-702.html",
  section: "MCC §1-24-045",
});

export const philadelphiaSickLeave = localSickLeaveRule({
  city: "Philadelphia",
  accrualRate: "1 hr per 40 hrs worked",
  capHours: 40,
  employeeThreshold: 10,
  effectiveFrom: "2015-05-13",
  source: "Promoting Healthy Families & Workplaces Ordinance",
  url: "https://www.phila.gov/departments/department-of-labor/worker-protections/paid-sick-leave/",
  section: "Phila. Code §9-4100 et seq.",
});

export const minneapolisSickLeave = localSickLeaveRule({
  city: "Minneapolis",
  accrualRate: "1 hr per 30 hrs worked",
  capHours: 48,
  employeeThreshold: 1,
  effectiveFrom: "2017-07-01",
  source: "Minneapolis Sick & Safe Time Ordinance",
  url: "https://www.minneapolismn.gov/government/government-data/datasource/sick-safe-time/",
  section: "MCO §40.220",
});

export const montgomeryCountySickLeave = localSickLeaveRule({
  city: "Montgomery County",
  accrualRate: "1 hr per 30 hrs worked",
  capHours: 56,
  employeeThreshold: 1,
  effectiveFrom: "2016-10-01",
  source: "Montgomery County Earned Sick & Safe Leave Law",
  url: "https://www.montgomerycountymd.gov/humanrights/Resources/Files/EarnedSickandSafeLeave_EmployeeNotice.pdf",
  section: "MCC §27-76 et seq.",
});

export const denverSickLeave = localSickLeaveRule({
  city: "Denver",
  accrualRate: "1 hr per 30 hrs worked",
  capHours: 48,
  employeeThreshold: 1,
  effectiveFrom: "2022-01-01",
  source: "Denver Paid Sick & Safe Leave (HFWA local enforcement)",
  url: "https://www.denvergov.org/Government/Agencies-Departments-Offices/Auditors-Office/Denver-Workplace-Rights-and-Protections",
  section: "Denver DRMC §58-11 et seq.",
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_LOCAL_SICK_LEAVE_RULES: readonly Rule[] = [
  sanFranciscoSickLeave,
  seattleSickLeave,
  newYorkCitySickLeave,
  losAngelesSickLeave,
  chicagoSickLeave,
  philadelphiaSickLeave,
  minneapolisSickLeave,
  montgomeryCountySickLeave,
  denverSickLeave,
];
