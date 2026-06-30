/**
 * Sick Leave Accrual — All Remaining States
 *
 * States already covered in sickLeave.ts: NY, NJ, CT, MD, NV
 * This file adds the other 13 states with mandatory paid sick leave.
 *
 * States with NO mandatory paid sick leave (as of 2025):
 * AL, AK, AR, DE, FL, GA, HI, ID, IN, IA, KS, KY, LA, MS, MO, MT,
 * NE, NH, NC, ND, OH, OK, PA, SC, SD, TN, TX, UT, VA, WV, WI, WY
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── Helper ────────────────────────────────────────────────────────

function sickLeaveRule(opts: {
  state: string;
  stateName: string;
  accrualRate: string; // e.g. "1 hr per 30 hrs worked"
  capHours: number;
  minEmployees?: number;
  effectiveFrom: string;
  source: string;
  url: string;
  section?: string;
}): Rule {
  const conditions: any[] = [
    { fact: "location.state", op: "=", value: opts.state },
  ];
  if (opts.minEmployees) {
    conditions.push({ fact: "employer.total_employees", op: ">=", value: opts.minEmployees });
  }

  return createRule({
    id: `${opts.state.toLowerCase()}-sick-leave`,
    title: `${opts.stateName} Paid Sick Leave (${opts.accrualRate}, up to ${opts.capHours} hrs/yr)`,
    jurisdiction: opts.state,
    topic: "sick_leave",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: { all: conditions },
    result: {
      type: "minimum_required_value",
      targetFact: "leave.hours_accrued",
      minimum: opts.capHours,
      unit: `hours per year (accrued at ${opts.accrualRate})`,
    },
    citations: [{ source: opts.source, url: opts.url, section: opts.section }],
  });
}

// ═══════════════════════════════════════════════════════════════════

export const arizonaSickLeave = sickLeaveRule({
  state: "AZ", stateName: "Arizona",
  accrualRate: "1 hr per 30 hrs worked", capHours: 40, minEmployees: 15,
  effectiveFrom: "2017-07-01",
  source: "ARS §23-372 (Prop 206)",
  url: "https://www.azleg.gov/ars/23/00372.htm",
});

export const arizonaSickLeaveSmall: Rule = createRule({
  id: "az-sick-leave-small",
  title: "Arizona Paid Sick Leave — <15 employees (1 hr per 30 hrs, up to 24 hrs/yr)",
  jurisdiction: "AZ",
  topic: "sick_leave",
  effectiveFrom: "2017-07-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "AZ" },
      { fact: "employer.total_employees", op: "<", value: 15 },
    ],
  },
  result: {
    type: "minimum_required_value",
    targetFact: "leave.hours_accrued",
    minimum: 24,
    unit: "hours per year (accrued at 1 hr per 30 hrs worked)",
  },
  citations: [{ source: "ARS §23-372 (Prop 206)", url: "https://www.azleg.gov/ars/23/00372.htm" }],
});

export const californiaSickLeave = sickLeaveRule({
  state: "CA", stateName: "California",
  accrualRate: "1 hr per 30 hrs worked", capHours: 40,
  effectiveFrom: "2024-01-01",
  source: "Cal. Lab. Code §246",
  url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=246.&lawCode=LAB",
  section: "Lab. Code §246",
});

export const coloradoSickLeave = sickLeaveRule({
  state: "CO", stateName: "Colorado",
  accrualRate: "1 hr per 30 hrs worked", capHours: 48,
  effectiveFrom: "2021-01-01",
  source: "CO HFWA §8-13.3-403",
  url: "https://cdle.colorado.gov/paid-leave",
  section: "§8-13.3-403",
});

export const illinoisSickLeave = sickLeaveRule({
  state: "IL", stateName: "Illinois",
  accrualRate: "1 hr per 40 hrs worked", capHours: 40,
  effectiveFrom: "2024-01-01",
  source: "820 ILCS 192 (PSLAA)",
  url: "https://labor.illinois.gov/laws-rules/conmed/paid-leave-for-all-workers-act.html",
});

export const massachusettsSickLeave = sickLeaveRule({
  state: "MA", stateName: "Massachusetts",
  accrualRate: "1 hr per 30 hrs worked", capHours: 40,
  effectiveFrom: "2015-07-01",
  source: "MGL c.149 §148C",
  url: "https://www.mass.gov/info-details/earned-sick-time",
  section: "c.149 §148C",
});

export const maineSickLeave = sickLeaveRule({
  state: "ME", stateName: "Maine",
  accrualRate: "1 hr per 40 hrs worked", capHours: 40, minEmployees: 11,
  effectiveFrom: "2021-01-01",
  source: "26 MRSA §637",
  url: "https://www.maine.gov/labor/labor_laws/earned_paid_leave.html",
});

export const michiganSickLeave = sickLeaveRule({
  state: "MI", stateName: "Michigan",
  accrualRate: "1 hr per 35 hrs worked", capHours: 40,
  effectiveFrom: "2019-03-29",
  source: "MCL §408.963 (IWOWA)",
  url: "https://www.michigan.gov/leo/bureaus-agencies/ber/wage-hour/paid-medical-leave",
});

export const minnesotaSickLeave = sickLeaveRule({
  state: "MN", stateName: "Minnesota",
  accrualRate: "1 hr per 30 hrs worked", capHours: 48,
  effectiveFrom: "2024-01-01",
  source: "Minn. Stat. §181.9447",
  url: "https://www.dli.mn.gov/sick-and-safe-time",
});

export const newMexicoSickLeave = sickLeaveRule({
  state: "NM", stateName: "New Mexico",
  accrualRate: "1 hr per 30 hrs worked", capHours: 64,
  effectiveFrom: "2022-07-01",
  source: "NMSA §50-17-1 (HWA)",
  url: "https://www.dws.state.nm.us/healthyworkplaces",
});

export const oregonSickLeave = sickLeaveRule({
  state: "OR", stateName: "Oregon",
  accrualRate: "1 hr per 30 hrs worked", capHours: 40,
  effectiveFrom: "2016-01-01",
  source: "ORS §653.601",
  url: "https://www.oregon.gov/boli/workers/pages/sick-time.aspx",
});

export const rhodeIslandSickLeave = sickLeaveRule({
  state: "RI", stateName: "Rhode Island",
  accrualRate: "1 hr per 35 hrs worked", capHours: 40,
  effectiveFrom: "2018-07-01",
  source: "RI Gen. Laws §28-57-4",
  url: "https://dlt.ri.gov/individuals/workplace-protections/healthy-and-safe-families-and-workplaces-act",
});

export const vermontSickLeave = sickLeaveRule({
  state: "VT", stateName: "Vermont",
  accrualRate: "1 hr per 52 hrs worked", capHours: 40,
  effectiveFrom: "2017-01-01",
  source: "21 VSA §483",
  url: "https://labor.vermont.gov/document/earned-sick-time-faqs",
});

export const washingtonSickLeave = sickLeaveRule({
  state: "WA", stateName: "Washington",
  accrualRate: "1 hr per 40 hrs worked", capHours: 40,
  effectiveFrom: "2018-01-01",
  source: "RCW §49.46.210 (I-1433)",
  url: "https://lni.wa.gov/workers-rights/leave/paid-sick-leave",
  section: "RCW §49.46.210",
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_REMAINING_SICK_LEAVE_RULES: readonly Rule[] = [
  arizonaSickLeave,
  arizonaSickLeaveSmall,
  californiaSickLeave,
  coloradoSickLeave,
  illinoisSickLeave,
  massachusettsSickLeave,
  maineSickLeave,
  michiganSickLeave,
  minnesotaSickLeave,
  newMexicoSickLeave,
  oregonSickLeave,
  rhodeIslandSickLeave,
  vermontSickLeave,
  washingtonSickLeave,
];
