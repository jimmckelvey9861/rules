/**
 * State Family & Medical Leave Laws — 13 States + DC
 *
 * These are state-level FMLA equivalents or expansions that provide
 * job-protected and/or paid family/medical leave beyond the federal FMLA.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

function stateFamilyLeaveRule(opts: {
  state: string;
  stateName: string;
  weeksDuration: number;
  employeeThreshold: number;
  paid: boolean;
  effectiveFrom: string;
  source: string;
  url: string;
  section?: string;
}): Rule {
  return createRule({
    id: `${opts.state.toLowerCase()}-family-medical-leave`,
    title: `${opts.stateName} Family & Medical Leave (${opts.weeksDuration} weeks${opts.paid ? ", paid" : ""})`,
    jurisdiction: opts.state,
    topic: "family_medical_leave",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: {
      all: [
        { fact: "location.state", op: "=", value: opts.state },
        { fact: "employer.total_employees", op: ">=", value: opts.employeeThreshold },
        { fact: "employee.tenure_months", op: ">=", value: 12 },
      ],
    },
    result: {
      type: "minimum_required_value",
      targetFact: "leave.family_medical_weeks_available",
      minimum: opts.weeksDuration,
      unit: `weeks (${opts.paid ? "paid" : "unpaid"})`,
    },
    citations: [{ source: opts.source, url: opts.url, section: opts.section }],
  });
}

export const californiaFamilyLeave = stateFamilyLeaveRule({
  state: "CA", stateName: "California",
  weeksDuration: 12, employeeThreshold: 5, paid: true,
  effectiveFrom: "2021-01-01",
  source: "California Family Rights Act (CFRA) + CA PFL",
  url: "https://www.dfeh.ca.gov/family-medical-pregnancy-leave/",
  section: "Gov. Code §12945.2",
});

export const coloradoFamilyLeave = stateFamilyLeaveRule({
  state: "CO", stateName: "Colorado",
  weeksDuration: 12, employeeThreshold: 1, paid: true,
  effectiveFrom: "2024-01-01",
  source: "Colorado FAMLI Act",
  url: "https://famli.colorado.gov/",
  section: "C.R.S. §8-13.3-501 et seq.",
});

export const connecticutFamilyLeave = stateFamilyLeaveRule({
  state: "CT", stateName: "Connecticut",
  weeksDuration: 12, employeeThreshold: 1, paid: true,
  effectiveFrom: "2022-01-01",
  source: "CT Paid Leave Act",
  url: "https://ctpaidleave.org/",
  section: "Conn. Gen. Stat. §31-49e et seq.",
});

export const dcFamilyLeave = stateFamilyLeaveRule({
  state: "DC", stateName: "District of Columbia",
  weeksDuration: 12, employeeThreshold: 1, paid: true,
  effectiveFrom: "2020-07-01",
  source: "DC Universal Paid Leave Act",
  url: "https://does.dc.gov/page/dc-paid-family-leave",
  section: "DC Code §32-541.01 et seq.",
});

export const delawareFamilyLeave = stateFamilyLeaveRule({
  state: "DE", stateName: "Delaware",
  weeksDuration: 12, employeeThreshold: 10, paid: true,
  effectiveFrom: "2026-01-01",
  source: "Healthy Delaware Families Act",
  url: "https://dol.delaware.gov/paid-leave/",
  section: "19 Del. C. §37 et seq.",
});

export const massachusettsFamilyLeave = stateFamilyLeaveRule({
  state: "MA", stateName: "Massachusetts",
  weeksDuration: 26, employeeThreshold: 1, paid: true,
  effectiveFrom: "2021-01-01",
  source: "MA Paid Family and Medical Leave (PFML)",
  url: "https://www.mass.gov/info-details/paid-family-and-medical-leave-pfml-overview",
  section: "MGL c.175M",
});

export const marylandFamilyLeave = stateFamilyLeaveRule({
  state: "MD", stateName: "Maryland",
  weeksDuration: 12, employeeThreshold: 1, paid: true,
  effectiveFrom: "2026-07-01",
  source: "Maryland FAMLI Act (Time to Care Act)",
  url: "https://www.dllr.state.md.us/employment/famli.shtml",
  section: "Md. Code Lab. & Empl. §8.3-101 et seq.",
});

export const minnesotaFamilyLeave = stateFamilyLeaveRule({
  state: "MN", stateName: "Minnesota",
  weeksDuration: 20, employeeThreshold: 1, paid: true,
  effectiveFrom: "2026-01-01",
  source: "Minnesota Paid Leave",
  url: "https://mn.gov/deed/paidleave/",
  section: "Minn. Stat. §268B",
});

export const newJerseyFamilyLeave = stateFamilyLeaveRule({
  state: "NJ", stateName: "New Jersey",
  weeksDuration: 12, employeeThreshold: 30, paid: true,
  effectiveFrom: "2009-07-01",
  source: "NJ Family Leave Act + NJ FLI",
  url: "https://myleavebenefits.nj.gov/worker/fli/",
  section: "N.J.S.A. 43:21-39.1 et seq.",
});

export const newYorkFamilyLeave = stateFamilyLeaveRule({
  state: "NY", stateName: "New York",
  weeksDuration: 12, employeeThreshold: 1, paid: true,
  effectiveFrom: "2018-01-01",
  source: "NY Paid Family Leave (PFL)",
  url: "https://paidfamilyleave.ny.gov/",
  section: "Workers' Comp. Law Art. 9 §200 et seq.",
});

export const oregonFamilyLeave = stateFamilyLeaveRule({
  state: "OR", stateName: "Oregon",
  weeksDuration: 16, employeeThreshold: 1, paid: true,
  effectiveFrom: "2023-09-03",
  source: "Oregon Paid Leave",
  url: "https://paidleave.oregon.gov/",
  section: "ORS §657B",
});

export const rhodeIslandFamilyLeave = stateFamilyLeaveRule({
  state: "RI", stateName: "Rhode Island",
  weeksDuration: 6, employeeThreshold: 1, paid: true,
  effectiveFrom: "2014-01-01",
  source: "RI Temporary Caregiver Insurance (TCI)",
  url: "https://dlt.ri.gov/individuals/temporary-disability-caregiver-insurance",
  section: "R.I. Gen. Laws §28-41-34 et seq.",
});

export const washingtonFamilyLeave = stateFamilyLeaveRule({
  state: "WA", stateName: "Washington",
  weeksDuration: 16, employeeThreshold: 1, paid: true,
  effectiveFrom: "2020-01-01",
  source: "WA Paid Family & Medical Leave (PFML)",
  url: "https://paidleave.wa.gov/",
  section: "RCW §50A",
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_STATE_FAMILY_LEAVE_RULES: readonly Rule[] = [
  californiaFamilyLeave,
  coloradoFamilyLeave,
  connecticutFamilyLeave,
  dcFamilyLeave,
  delawareFamilyLeave,
  massachusettsFamilyLeave,
  marylandFamilyLeave,
  minnesotaFamilyLeave,
  newJerseyFamilyLeave,
  newYorkFamilyLeave,
  oregonFamilyLeave,
  rhodeIslandFamilyLeave,
  washingtonFamilyLeave,
];
