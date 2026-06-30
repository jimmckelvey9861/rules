/**
 * Minor Labor Hour Limits — All Remaining States
 *
 * States already covered in minorLabor.ts:
 * Federal (14-15), NY, CA, CT, NV, NJ, MD, DC, VA (all 16-17)
 *
 * This file adds 16-17 year old rules for the remaining states that have
 * child labor laws with scheduling restrictions.
 *
 * States with NO separate state child labor scheduling law beyond federal:
 * AL, MS, SC (rely entirely on FLSA for 14-15; no 16-17 restrictions)
 *
 * Pattern: Most states restrict 16-17 year olds on school days/nights.
 * Non-school days typically allow 8-10 hrs with later curfews.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── Helper ────────────────────────────────────────────────────────

interface MinorRuleOpts {
  state: string;
  stateName: string;
  schoolDayMaxHours: number;
  nonSchoolDayMaxHours: number;
  schoolWeekMaxHours: number;
  nonSchoolWeekMaxHours?: number;
  schoolNightCurfew: number; // hour (0-23)
  nonSchoolNightCurfew?: number;
  effectiveFrom: string;
  source: string;
  url: string;
}

function minorRulesForState(opts: MinorRuleOpts): Rule[] {
  const rules: Rule[] = [];
  const prefix = opts.state.toLowerCase();

  // School day hours
  rules.push(createRule({
    id: `${prefix}-minor-16-17-school-day-hours`,
    title: `${opts.stateName}: Minors 16-17 — Max ${opts.schoolDayMaxHours} hours on a school day`,
    jurisdiction: opts.state,
    topic: "minor_labor",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: {
      all: [
        { fact: "location.state", op: "=", value: opts.state },
        { fact: "employee.is_minor", op: "=", value: true },
        { fact: "employee.age", op: ">=", value: 16 },
        { fact: "employee.age", op: "<=", value: 17 },
        { fact: "shift.is_school_day", op: "=", value: true },
        { fact: "shift.shift_length_hours", op: ">", value: opts.schoolDayMaxHours },
      ],
    },
    result: {
      type: "prohibition",
      prohibitedAction: `Scheduling a 16-17 year old for more than ${opts.schoolDayMaxHours} hours on a school day in ${opts.state}`,
    },
    citations: [{ source: opts.source, url: opts.url }],
  }));

  // Non-school day hours
  rules.push(createRule({
    id: `${prefix}-minor-16-17-nonschool-day-hours`,
    title: `${opts.stateName}: Minors 16-17 — Max ${opts.nonSchoolDayMaxHours} hours on a non-school day`,
    jurisdiction: opts.state,
    topic: "minor_labor",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: {
      all: [
        { fact: "location.state", op: "=", value: opts.state },
        { fact: "employee.is_minor", op: "=", value: true },
        { fact: "employee.age", op: ">=", value: 16 },
        { fact: "employee.age", op: "<=", value: 17 },
        { fact: "shift.is_school_day", op: "=", value: false },
        { fact: "shift.shift_length_hours", op: ">", value: opts.nonSchoolDayMaxHours },
      ],
    },
    result: {
      type: "prohibition",
      prohibitedAction: `Scheduling a 16-17 year old for more than ${opts.nonSchoolDayMaxHours} hours on a non-school day in ${opts.state}`,
    },
    citations: [{ source: opts.source, url: opts.url }],
  }));

  // School week hours
  rules.push(createRule({
    id: `${prefix}-minor-16-17-school-week-hours`,
    title: `${opts.stateName}: Minors 16-17 — Max ${opts.schoolWeekMaxHours} hours in a school week`,
    jurisdiction: opts.state,
    topic: "minor_labor",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: {
      all: [
        { fact: "location.state", op: "=", value: opts.state },
        { fact: "employee.is_minor", op: "=", value: true },
        { fact: "employee.age", op: ">=", value: 16 },
        { fact: "employee.age", op: "<=", value: 17 },
        { fact: "shift.school_in_session", op: "=", value: true },
        { fact: "shift.hours_worked_this_week", op: ">", value: opts.schoolWeekMaxHours },
      ],
    },
    result: {
      type: "prohibition",
      prohibitedAction: `Scheduling a 16-17 year old for more than ${opts.schoolWeekMaxHours} hours in a school week in ${opts.state}`,
    },
    citations: [{ source: opts.source, url: opts.url }],
  }));

  // School night curfew
  rules.push(createRule({
    id: `${prefix}-minor-16-17-curfew`,
    title: `${opts.stateName}: Minors 16-17 — Cannot work past ${opts.schoolNightCurfew}:00 (school night)`,
    jurisdiction: opts.state,
    topic: "minor_labor",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: {
      all: [
        { fact: "location.state", op: "=", value: opts.state },
        { fact: "employee.is_minor", op: "=", value: true },
        { fact: "employee.age", op: ">=", value: 16 },
        { fact: "employee.age", op: "<=", value: 17 },
        { fact: "shift.is_school_day", op: "=", value: true },
        { fact: "shift.end_hour", op: ">=", value: opts.schoolNightCurfew },
      ],
    },
    result: {
      type: "prohibition",
      prohibitedAction: `Scheduling a 16-17 year old to work past ${opts.schoolNightCurfew}:00 on a school night in ${opts.state}`,
    },
    citations: [{ source: opts.source, url: opts.url }],
  }));

  return rules;
}

// ═══════════════════════════════════════════════════════════════════
// ALL REMAINING STATES
// ═══════════════════════════════════════════════════════════════════

const stateConfigs: MinorRuleOpts[] = [
  {
    state: "AK", stateName: "Alaska",
    schoolDayMaxHours: 6, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 24,
    schoolNightCurfew: 21, effectiveFrom: "2010-01-01",
    source: "AS §23.10.332", url: "https://www.akleg.gov/basis/statutes.asp#23.10.332",
  },
  {
    state: "AZ", stateName: "Arizona",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "ARS §23-233", url: "https://www.azleg.gov/ars/23/00233.htm",
  },
  {
    state: "AR", stateName: "Arkansas",
    schoolDayMaxHours: 6, nonSchoolDayMaxHours: 10, schoolWeekMaxHours: 48,
    schoolNightCurfew: 23, effectiveFrom: "2010-01-01",
    source: "Ark. Code §11-6-107", url: "https://www.dol.gov/agencies/whd/state/child-labor#ar",
  },
  {
    state: "CO", stateName: "Colorado",
    schoolDayMaxHours: 6, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 30,
    schoolNightCurfew: 21, effectiveFrom: "2010-01-01",
    source: "CYEPA, 8-12-105 C.R.S.", url: "https://cdle.colorado.gov/youth-employment",
  },
  {
    state: "DE", stateName: "Delaware",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "19 Del. C. §508", url: "https://dia.delawareworks.com/labor-law/child-labor.php",
  },
  {
    state: "FL", stateName: "Florida",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 30,
    schoolNightCurfew: 23, effectiveFrom: "2010-01-01",
    source: "FL Stat. §450.081", url: "https://floridajobs.org/business-growth-and-partnerships/for-employers/child-labor-law",
  },
  {
    state: "GA", stateName: "Georgia",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 40,
    schoolNightCurfew: 21, effectiveFrom: "2010-01-01",
    source: "O.C.G.A. §39-2-2", url: "https://dol.georgia.gov/child-labor",
  },
  {
    state: "HI", stateName: "Hawaii",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "HRS §390-2", url: "https://labor.hawaii.gov/wsd/child-labor/",
  },
  {
    state: "ID", stateName: "Idaho",
    schoolDayMaxHours: 6, nonSchoolDayMaxHours: 9, schoolWeekMaxHours: 54,
    schoolNightCurfew: 21, effectiveFrom: "2010-01-01",
    source: "Idaho Code §44-1301", url: "https://www.labor.idaho.gov/dnn/Businesses/Wage-and-Hour-Resources/Child-Labor",
  },
  {
    state: "IL", stateName: "Illinois",
    schoolDayMaxHours: 3, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 24,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "820 ILCS 205/7", url: "https://labor.illinois.gov/laws-rules/conmed/child-labor-law.html",
  },
  {
    state: "IN", stateName: "Indiana",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 9, schoolWeekMaxHours: 30,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "IC §20-33-3-32", url: "https://www.in.gov/dol/youth-employment/",
  },
  {
    state: "IA", stateName: "Iowa",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 28,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "Iowa Code §92.7", url: "https://www.iowadivisionoflabor.gov/child-labor",
  },
  {
    state: "KS", stateName: "Kansas",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "K.S.A. §38-601", url: "https://www.dol.ks.gov/laws/child-labor",
  },
  {
    state: "KY", stateName: "Kentucky",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 30,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "KRS §339.230", url: "https://labor.ky.gov/standards/Pages/Child-Labor.aspx",
  },
  {
    state: "LA", stateName: "Louisiana",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "La. R.S. §23:214", url: "https://www.laworks.net/Youth_Services/YS_ChildLaborLaw.asp",
  },
  {
    state: "ME", stateName: "Maine",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 20,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "26 MRSA §773", url: "https://www.maine.gov/labor/labor_laws/child_labor.html",
  },
  {
    state: "MA", stateName: "Massachusetts",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 9, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "MGL c.149 §§66-67", url: "https://www.mass.gov/info-details/child-labor-laws",
  },
  {
    state: "MI", stateName: "Michigan",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 24,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "MCL §409.103", url: "https://www.michigan.gov/leo/bureaus-agencies/ber/wage-hour/youth-employment",
  },
  {
    state: "MN", stateName: "Minnesota",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 23, effectiveFrom: "2010-01-01",
    source: "Minn. Stat. §181A.04", url: "https://www.dli.mn.gov/business/employment-practices/child-labor",
  },
  {
    state: "MO", stateName: "Missouri",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "RSMo §294.021", url: "https://labor.mo.gov/dls/child-labor",
  },
  {
    state: "MT", stateName: "Montana",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "MCA §41-2-110", url: "https://erd.dli.mt.gov/labor-standards/child-labor",
  },
  {
    state: "NE", stateName: "Nebraska",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 48,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "Neb. Rev. Stat. §48-312", url: "https://dol.nebraska.gov/ChildLabor",
  },
  {
    state: "NH", stateName: "New Hampshire",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 30,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "NH RSA §276-A:4", url: "https://www.nh.gov/labor/inspection/youth-employment.htm",
  },
  {
    state: "NM", stateName: "New Mexico",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 40,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "NMSA §50-6-2", url: "https://www.dws.state.nm.us/Labor-Relations/Labor-Information/Child-Labor",
  },
  {
    state: "NC", stateName: "North Carolina",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 23, effectiveFrom: "2010-01-01",
    source: "NCGS §95-25.5", url: "https://www.labor.nc.gov/workplace-rights/youth-employment-rules",
  },
  {
    state: "ND", stateName: "North Dakota",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "NDCC §34-07-15", url: "https://www.nd.gov/labor/child-labor",
  },
  {
    state: "OH", stateName: "Ohio",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 23, effectiveFrom: "2010-01-01",
    source: "ORC §4109.07", url: "https://com.ohio.gov/divisions-and-programs/industrial-compliance/minor-labor",
  },
  {
    state: "OK", stateName: "Oklahoma",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "40 O.S. §75", url: "https://oklahoma.gov/omes/services/risk-management/child-labor.html",
  },
  {
    state: "OR", stateName: "Oregon",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "ORS §653.315", url: "https://www.oregon.gov/boli/workers/pages/minor-workers.aspx",
  },
  {
    state: "PA", stateName: "Pennsylvania",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 28,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "43 P.S. §40.3", url: "https://www.dli.pa.gov/Individuals/Labor-Management-Relations/llc/child-labor/Pages/default.aspx",
  },
  {
    state: "RI", stateName: "Rhode Island",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 24,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "RI Gen. Laws §28-3-11", url: "https://dlt.ri.gov/individuals/workplace-protections/youth-employment",
  },
  {
    state: "SD", stateName: "South Dakota",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 20,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "SDCL §60-12-3", url: "https://dlr.sd.gov/employment_laws/child_labor.aspx",
  },
  {
    state: "TN", stateName: "Tennessee",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "Tenn. Code §50-5-105", url: "https://www.tn.gov/workforce/employees/labor-laws/labor-laws-redirect/child-labor.html",
  },
  {
    state: "TX", stateName: "Texas",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "Tex. Lab. Code §51.013", url: "https://www.twc.texas.gov/businesses/child-labor-law-texas",
  },
  {
    state: "UT", stateName: "Utah",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 21, effectiveFrom: "2010-01-01",
    source: "Utah Code §34-23-203", url: "https://laborcommission.utah.gov/divisions/antidiscrimination-and-labor/child-labor/",
  },
  {
    state: "VT", stateName: "Vermont",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "21 VSA §434", url: "https://labor.vermont.gov/document/child-labor-fact-sheet",
  },
  {
    state: "WA", stateName: "Washington",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 20,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "WAC §296-125-028", url: "https://lni.wa.gov/workers-rights/youth-employment/hours-of-work",
  },
  {
    state: "WI", stateName: "Wisconsin",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 23, effectiveFrom: "2010-01-01",
    source: "Wis. Stat. §103.68", url: "https://dwd.wisconsin.gov/er/laborstandards/minors.htm",
  },
  {
    state: "WV", stateName: "West Virginia",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "W. Va. Code §21-6-6", url: "https://labor.wv.gov/Pages/Child-Labor.aspx",
  },
  {
    state: "WY", stateName: "Wyoming",
    schoolDayMaxHours: 4, nonSchoolDayMaxHours: 8, schoolWeekMaxHours: 18,
    schoolNightCurfew: 22, effectiveFrom: "2010-01-01",
    source: "Wyo. Stat. §27-6-108", url: "https://dws.wyo.gov/dws-division/labor-standards/child-labor/",
  },
];

// ═══════════════════════════════════════════════════════════════════
// Generate all rules
// ═══════════════════════════════════════════════════════════════════

export const ALL_REMAINING_MINOR_LABOR_RULES: readonly Rule[] =
  stateConfigs.flatMap(minorRulesForState);
