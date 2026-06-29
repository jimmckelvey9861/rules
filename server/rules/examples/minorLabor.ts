/**
 * Minor Labor Hour Limits — Federal + Priority States
 *
 * These are hard prohibitions that fire at schedule-creation time.
 * "You cannot schedule this minor for more than X hours" or
 * "You cannot schedule this minor past Y time."
 *
 * Federal: FLSA child labor provisions (29 USC §203(l), 29 CFR §570)
 * NY: Labor Law §§130-135, 12 NYCRR Part 180
 * CA: Labor Code §§1290-1312, Ed. Code §49116
 * CT: Gen. Stat. §§31-12 to 31-23
 * NV: NRS §609.240
 * NJ: NJSA §34:2-21
 * MD: Labor & Empl. §3-211 to §3-215
 * DC: DC Code §32-201 to §32-224
 * VA: Code §40.1-78 to §40.1-116
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ═══════════════════════════════════════════════════════════════════
// FEDERAL — FLSA (14-15 year olds)
// 29 CFR §570.35
// ═══════════════════════════════════════════════════════════════════

export const federalMinor14_15_SchoolDayHours: Rule = createRule({
  id: "federal-minor-14-15-school-day-hours",
  title: "Federal: Minors 14-15 — Max 3 hours on a school day",
  jurisdiction: "Federal",
  topic: "minor_labor",
  effectiveFrom: "2008-02-12",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 14 },
      { fact: "employee.age", op: "<=", value: 15 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.shift_length_hours", op: ">", value: 3 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 14-15 year old for more than 3 hours on a school day",
  },

  citations: [
    {
      source: "29 CFR §570.35(a)(2)",
      url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570/subpart-C/section-570.35",
      section: "§570.35(a)(2)",
    },
  ],
});

export const federalMinor14_15_NonSchoolDayHours: Rule = createRule({
  id: "federal-minor-14-15-nonschool-day-hours",
  title: "Federal: Minors 14-15 — Max 8 hours on a non-school day",
  jurisdiction: "Federal",
  topic: "minor_labor",
  effectiveFrom: "2008-02-12",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 14 },
      { fact: "employee.age", op: "<=", value: 15 },
      { fact: "shift.is_school_day", op: "=", value: false },
      { fact: "shift.shift_length_hours", op: ">", value: 8 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 14-15 year old for more than 8 hours on a non-school day",
  },

  citations: [
    {
      source: "29 CFR §570.35(a)(3)",
      url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570/subpart-C/section-570.35",
      section: "§570.35(a)(3)",
    },
  ],
});

export const federalMinor14_15_SchoolWeekHours: Rule = createRule({
  id: "federal-minor-14-15-school-week-hours",
  title: "Federal: Minors 14-15 — Max 18 hours in a school week",
  jurisdiction: "Federal",
  topic: "minor_labor",
  effectiveFrom: "2008-02-12",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 14 },
      { fact: "employee.age", op: "<=", value: 15 },
      { fact: "shift.school_in_session", op: "=", value: true },
      { fact: "shift.hours_worked_this_week", op: ">", value: 18 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 14-15 year old for more than 18 hours in a school week",
  },

  citations: [
    {
      source: "29 CFR §570.35(a)(4)",
      url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570/subpart-C/section-570.35",
      section: "§570.35(a)(4)",
    },
  ],
});

export const federalMinor14_15_NonSchoolWeekHours: Rule = createRule({
  id: "federal-minor-14-15-nonschool-week-hours",
  title: "Federal: Minors 14-15 — Max 40 hours in a non-school week",
  jurisdiction: "Federal",
  topic: "minor_labor",
  effectiveFrom: "2008-02-12",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 14 },
      { fact: "employee.age", op: "<=", value: 15 },
      { fact: "shift.school_in_session", op: "=", value: false },
      { fact: "shift.hours_worked_this_week", op: ">", value: 40 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 14-15 year old for more than 40 hours in a non-school week",
  },

  citations: [
    {
      source: "29 CFR §570.35(a)(5)",
      url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570/subpart-C/section-570.35",
      section: "§570.35(a)(5)",
    },
  ],
});

export const federalMinor14_15_Curfew: Rule = createRule({
  id: "federal-minor-14-15-curfew",
  title: "Federal: Minors 14-15 — Cannot work past 7pm (9pm Jun 1–Labor Day)",
  jurisdiction: "Federal",
  topic: "minor_labor",
  effectiveFrom: "2008-02-12",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 14 },
      { fact: "employee.age", op: "<=", value: 15 },
      { fact: "shift.school_in_session", op: "=", value: true },
      { fact: "shift.end_hour", op: ">=", value: 19 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 14-15 year old to work past 7:00 PM during the school year",
  },

  citations: [
    {
      source: "29 CFR §570.35(a)(6)",
      url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570/subpart-C/section-570.35",
      section: "§570.35(a)(6)",
    },
  ],
});

export const federalMinor14_15_CurfewSummer: Rule = createRule({
  id: "federal-minor-14-15-curfew-summer",
  title: "Federal: Minors 14-15 — Cannot work past 9pm (Jun 1–Labor Day)",
  jurisdiction: "Federal",
  topic: "minor_labor",
  effectiveFrom: "2008-02-12",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 14 },
      { fact: "employee.age", op: "<=", value: 15 },
      { fact: "shift.school_in_session", op: "=", value: false },
      { fact: "shift.end_hour", op: ">=", value: 21 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 14-15 year old to work past 9:00 PM (summer/non-school period)",
  },

  citations: [
    {
      source: "29 CFR §570.35(a)(7)",
      url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570/subpart-C/section-570.35",
      section: "§570.35(a)(7)",
    },
  ],
});

export const federalMinor14_15_EarlyStart: Rule = createRule({
  id: "federal-minor-14-15-early-start",
  title: "Federal: Minors 14-15 — Cannot work before 7am",
  jurisdiction: "Federal",
  topic: "minor_labor",
  effectiveFrom: "2008-02-12",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 14 },
      { fact: "employee.age", op: "<=", value: 15 },
      { fact: "shift.start_hour", op: "<", value: 7 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 14-15 year old to work before 7:00 AM",
  },

  citations: [
    {
      source: "29 CFR §570.35(a)(1)",
      url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570/subpart-C/section-570.35",
      section: "§570.35(a)(1)",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// NEW YORK — 16-17 year olds (stricter than federal for this age group)
// 12 NYCRR Part 180
// ═══════════════════════════════════════════════════════════════════

export const nyMinor16_17_SchoolDayHours: Rule = createRule({
  id: "ny-minor-16-17-school-day-hours",
  title: "NY: Minors 16-17 — Max 4 hours on a school day",
  jurisdiction: "NY",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.shift_length_hours", op: ">", value: 4 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 4 hours on a school day in NY",
  },

  citations: [
    {
      source: "NY Labor Law §133; 12 NYCRR §180-1.6",
      url: "https://www.nysenate.gov/legislation/laws/LAB/133",
      section: "§133",
    },
  ],
});

export const nyMinor16_17_SchoolWeekHours: Rule = createRule({
  id: "ny-minor-16-17-school-week-hours",
  title: "NY: Minors 16-17 — Max 28 hours in a school week",
  jurisdiction: "NY",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.school_in_session", op: "=", value: true },
      { fact: "shift.hours_worked_this_week", op: ">", value: 28 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 28 hours in a school week in NY",
  },

  citations: [
    {
      source: "NY Labor Law §133; 12 NYCRR §180-1.6",
      url: "https://www.nysenate.gov/legislation/laws/LAB/133",
      section: "§133",
    },
  ],
});

export const nyMinor16_17_NonSchoolDayHours: Rule = createRule({
  id: "ny-minor-16-17-nonschool-day-hours",
  title: "NY: Minors 16-17 — Max 8 hours on a non-school day",
  jurisdiction: "NY",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: false },
      { fact: "shift.shift_length_hours", op: ">", value: 8 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 8 hours on a non-school day in NY",
  },

  citations: [
    {
      source: "NY Labor Law §133; 12 NYCRR §180-1.6",
      url: "https://www.nysenate.gov/legislation/laws/LAB/133",
      section: "§133",
    },
  ],
});

export const nyMinor16_17_NonSchoolWeekHours: Rule = createRule({
  id: "ny-minor-16-17-nonschool-week-hours",
  title: "NY: Minors 16-17 — Max 48 hours in a non-school week",
  jurisdiction: "NY",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.school_in_session", op: "=", value: false },
      { fact: "shift.hours_worked_this_week", op: ">", value: 48 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 48 hours in a non-school week in NY",
  },

  citations: [
    {
      source: "NY Labor Law §133; 12 NYCRR §180-1.6",
      url: "https://www.nysenate.gov/legislation/laws/LAB/133",
      section: "§133",
    },
  ],
});

export const nyMinor16_17_Curfew: Rule = createRule({
  id: "ny-minor-16-17-curfew",
  title: "NY: Minors 16-17 — Cannot work past 10pm (school night)",
  jurisdiction: "NY",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.end_hour", op: ">=", value: 22 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old to work past 10:00 PM on a school night in NY",
  },

  citations: [
    {
      source: "NY Labor Law §133; 12 NYCRR §180-1.6",
      url: "https://www.nysenate.gov/legislation/laws/LAB/133",
      section: "§133",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// CALIFORNIA — 16-17 year olds
// Labor Code §1391, Ed. Code §49116
// ═══════════════════════════════════════════════════════════════════

export const caMinor16_17_SchoolDayHours: Rule = createRule({
  id: "ca-minor-16-17-school-day-hours",
  title: "CA: Minors 16-17 — Max 4 hours on a school day",
  jurisdiction: "CA",
  topic: "minor_labor",
  effectiveFrom: "2001-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.shift_length_hours", op: ">", value: 4 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 4 hours on a school day in CA",
  },

  citations: [
    {
      source: "CA Education Code §49116",
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=49116.&lawCode=EDC",
      section: "Ed. Code §49116",
    },
  ],
});

export const caMinor16_17_NonSchoolDayHours: Rule = createRule({
  id: "ca-minor-16-17-nonschool-day-hours",
  title: "CA: Minors 16-17 — Max 8 hours on a non-school day",
  jurisdiction: "CA",
  topic: "minor_labor",
  effectiveFrom: "2001-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: false },
      { fact: "shift.shift_length_hours", op: ">", value: 8 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 8 hours on a non-school day in CA",
  },

  citations: [
    {
      source: "CA Labor Code §1391",
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1391.&lawCode=LAB",
      section: "Lab. Code §1391",
    },
  ],
});

export const caMinor16_17_WeekHours: Rule = createRule({
  id: "ca-minor-16-17-week-hours",
  title: "CA: Minors 16-17 — Max 48 hours per week",
  jurisdiction: "CA",
  topic: "minor_labor",
  effectiveFrom: "2001-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.hours_worked_this_week", op: ">", value: 48 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 48 hours in a week in CA",
  },

  citations: [
    {
      source: "CA Labor Code §1391",
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1391.&lawCode=LAB",
      section: "Lab. Code §1391",
    },
  ],
});

export const caMinor16_17_Curfew: Rule = createRule({
  id: "ca-minor-16-17-curfew-school",
  title: "CA: Minors 16-17 — Cannot work past 10pm on a school night",
  jurisdiction: "CA",
  topic: "minor_labor",
  effectiveFrom: "2001-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.end_hour", op: ">=", value: 22 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old to work past 10:00 PM on a school night in CA",
  },

  citations: [
    {
      source: "CA Education Code §49116",
      url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=49116.&lawCode=EDC",
      section: "Ed. Code §49116",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// CONNECTICUT — 16-17 year olds
// Gen. Stat. §31-18
// ═══════════════════════════════════════════════════════════════════

export const ctMinor16_17_SchoolDayHours: Rule = createRule({
  id: "ct-minor-16-17-school-day-hours",
  title: "CT: Minors 16-17 — Max 6 hours on a school day",
  jurisdiction: "CT",
  topic: "minor_labor",
  effectiveFrom: "2003-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CT" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.shift_length_hours", op: ">", value: 6 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 6 hours on a school day in CT",
  },

  citations: [
    {
      source: "CT Gen. Stat. §31-18",
      url: "https://www.cga.ct.gov/current/pub/chap_557.htm#sec_31-18",
      section: "§31-18",
    },
  ],
});

export const ctMinor16_17_WeekHours: Rule = createRule({
  id: "ct-minor-16-17-school-week-hours",
  title: "CT: Minors 16-17 — Max 32 hours in a school week",
  jurisdiction: "CT",
  topic: "minor_labor",
  effectiveFrom: "2003-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CT" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.school_in_session", op: "=", value: true },
      { fact: "shift.hours_worked_this_week", op: ">", value: 32 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 32 hours in a school week in CT",
  },

  citations: [
    {
      source: "CT Gen. Stat. §31-18",
      url: "https://www.cga.ct.gov/current/pub/chap_557.htm#sec_31-18",
      section: "§31-18",
    },
  ],
});

export const ctMinor16_17_Curfew: Rule = createRule({
  id: "ct-minor-16-17-curfew",
  title: "CT: Minors 16-17 — Cannot work past 10pm (school night)",
  jurisdiction: "CT",
  topic: "minor_labor",
  effectiveFrom: "2003-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CT" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.end_hour", op: ">=", value: 22 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old to work past 10:00 PM on a school night in CT",
  },

  citations: [
    {
      source: "CT Gen. Stat. §31-18",
      url: "https://www.cga.ct.gov/current/pub/chap_557.htm#sec_31-18",
      section: "§31-18",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// NEVADA — 16-17 year olds
// NRS §609.240
// ═══════════════════════════════════════════════════════════════════

export const nvMinor16_17_SchoolDayHours: Rule = createRule({
  id: "nv-minor-16-17-school-day-hours",
  title: "NV: Minors 16-17 — Max 4 hours on a school day",
  jurisdiction: "NV",
  topic: "minor_labor",
  effectiveFrom: "2007-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NV" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.shift_length_hours", op: ">", value: 4 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 4 hours on a school day in NV",
  },

  citations: [
    {
      source: "NRS §609.240",
      url: "https://www.leg.state.nv.us/nrs/nrs-609.html#NRS609Sec240",
      section: "NRS §609.240",
    },
  ],
});

export const nvMinor16_17_NonSchoolDayHours: Rule = createRule({
  id: "nv-minor-16-17-nonschool-day-hours",
  title: "NV: Minors 16-17 — Max 8 hours on a non-school day",
  jurisdiction: "NV",
  topic: "minor_labor",
  effectiveFrom: "2007-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NV" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: false },
      { fact: "shift.shift_length_hours", op: ">", value: 8 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 8 hours on a non-school day in NV",
  },

  citations: [
    {
      source: "NRS §609.240",
      url: "https://www.leg.state.nv.us/nrs/nrs-609.html#NRS609Sec240",
      section: "NRS §609.240",
    },
  ],
});

export const nvMinor16_17_Curfew: Rule = createRule({
  id: "nv-minor-16-17-curfew",
  title: "NV: Minors 16-17 — Cannot work past 10pm when school next day",
  jurisdiction: "NV",
  topic: "minor_labor",
  effectiveFrom: "2007-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NV" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.end_hour", op: ">=", value: 22 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old to work past 10:00 PM when school is the next day in NV",
  },

  citations: [
    {
      source: "NRS §609.240",
      url: "https://www.leg.state.nv.us/nrs/nrs-609.html#NRS609Sec240",
      section: "NRS §609.240",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// NEW JERSEY — 16-17 year olds
// NJSA §34:2-21.3
// ═══════════════════════════════════════════════════════════════════

export const njMinor16_17_SchoolDayHours: Rule = createRule({
  id: "nj-minor-16-17-school-day-hours",
  title: "NJ: Minors 16-17 — Max 4 hours on a school day",
  jurisdiction: "NJ",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NJ" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.shift_length_hours", op: ">", value: 4 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 4 hours on a school day in NJ",
  },

  citations: [
    {
      source: "NJSA §34:2-21.3",
      url: "https://www.nj.gov/labor/wageandhour/tools-resources/laws/childlaborlaw.shtml",
      section: "§34:2-21.3",
    },
  ],
});

export const njMinor16_17_NonSchoolDayHours: Rule = createRule({
  id: "nj-minor-16-17-nonschool-day-hours",
  title: "NJ: Minors 16-17 — Max 8 hours on a non-school day",
  jurisdiction: "NJ",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NJ" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: false },
      { fact: "shift.shift_length_hours", op: ">", value: 8 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 8 hours on a non-school day in NJ",
  },

  citations: [
    {
      source: "NJSA §34:2-21.3",
      url: "https://www.nj.gov/labor/wageandhour/tools-resources/laws/childlaborlaw.shtml",
      section: "§34:2-21.3",
    },
  ],
});

export const njMinor16_17_WeekHours: Rule = createRule({
  id: "nj-minor-16-17-school-week-hours",
  title: "NJ: Minors 16-17 — Max 40 hours in a school week",
  jurisdiction: "NJ",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NJ" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.school_in_session", op: "=", value: true },
      { fact: "shift.hours_worked_this_week", op: ">", value: 40 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 40 hours in a school week in NJ",
  },

  citations: [
    {
      source: "NJSA §34:2-21.3",
      url: "https://www.nj.gov/labor/wageandhour/tools-resources/laws/childlaborlaw.shtml",
      section: "§34:2-21.3",
    },
  ],
});

export const njMinor16_17_Curfew: Rule = createRule({
  id: "nj-minor-16-17-curfew",
  title: "NJ: Minors 16-17 — Cannot work past 11pm (school night)",
  jurisdiction: "NJ",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NJ" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.end_hour", op: ">=", value: 23 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old to work past 11:00 PM on a school night in NJ",
  },

  citations: [
    {
      source: "NJSA §34:2-21.3",
      url: "https://www.nj.gov/labor/wageandhour/tools-resources/laws/childlaborlaw.shtml",
      section: "§34:2-21.3",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// MARYLAND — 16-17 year olds
// Labor & Employment §3-211 to §3-215
// ═══════════════════════════════════════════════════════════════════

export const mdMinor16_17_SchoolDayHours: Rule = createRule({
  id: "md-minor-16-17-school-day-hours",
  title: "MD: Minors 16-17 — Max 4 hours on a school day",
  jurisdiction: "MD",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MD" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.shift_length_hours", op: ">", value: 4 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 4 hours on a school day in MD",
  },

  citations: [
    {
      source: "MD Code, Labor & Employment §3-211",
      url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gle&section=3-211",
      section: "§3-211",
    },
  ],
});

export const mdMinor16_17_Curfew: Rule = createRule({
  id: "md-minor-16-17-curfew",
  title: "MD: Minors 16-17 — Cannot work past 11pm (school night)",
  jurisdiction: "MD",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MD" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.end_hour", op: ">=", value: 23 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old to work past 11:00 PM on a school night in MD",
  },

  citations: [
    {
      source: "MD Code, Labor & Employment §3-211",
      url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gle&section=3-211",
      section: "§3-211",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// DC — 16-17 year olds
// DC Code §32-219
// ═══════════════════════════════════════════════════════════════════

export const dcMinor16_17_SchoolDayHours: Rule = createRule({
  id: "dc-minor-16-17-school-day-hours",
  title: "DC: Minors 16-17 — Max 4 hours on a school day",
  jurisdiction: "DC",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "DC" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.shift_length_hours", op: ">", value: 4 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 4 hours on a school day in DC",
  },

  citations: [
    {
      source: "DC Code §32-219",
      url: "https://code.dccouncil.gov/us/dc/council/code/sections/32-219",
      section: "§32-219",
    },
  ],
});

export const dcMinor16_17_NonSchoolDayHours: Rule = createRule({
  id: "dc-minor-16-17-nonschool-day-hours",
  title: "DC: Minors 16-17 — Max 8 hours on a non-school day",
  jurisdiction: "DC",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "DC" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: false },
      { fact: "shift.shift_length_hours", op: ">", value: 8 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 8 hours on a non-school day in DC",
  },

  citations: [
    {
      source: "DC Code §32-219",
      url: "https://code.dccouncil.gov/us/dc/council/code/sections/32-219",
      section: "§32-219",
    },
  ],
});

export const dcMinor16_17_Curfew: Rule = createRule({
  id: "dc-minor-16-17-curfew",
  title: "DC: Minors 16-17 — Cannot work past 10pm (school night)",
  jurisdiction: "DC",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "DC" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.end_hour", op: ">=", value: 22 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old to work past 10:00 PM on a school night in DC",
  },

  citations: [
    {
      source: "DC Code §32-219",
      url: "https://code.dccouncil.gov/us/dc/council/code/sections/32-219",
      section: "§32-219",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// VIRGINIA — 16-17 year olds
// VA Code §40.1-100
// ═══════════════════════════════════════════════════════════════════

export const vaMinor16_17_SchoolDayHours: Rule = createRule({
  id: "va-minor-16-17-school-day-hours",
  title: "VA: Minors 16-17 — Max 4 hours on a school day",
  jurisdiction: "VA",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "VA" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.shift_length_hours", op: ">", value: 4 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old for more than 4 hours on a school day in VA",
  },

  citations: [
    {
      source: "VA Code §40.1-100",
      url: "https://law.lis.virginia.gov/vacode/title40.1/chapter5/section40.1-100/",
      section: "§40.1-100",
    },
  ],
});

export const vaMinor16_17_Curfew: Rule = createRule({
  id: "va-minor-16-17-curfew",
  title: "VA: Minors 16-17 — Cannot work past 11pm (school night)",
  jurisdiction: "VA",
  topic: "minor_labor",
  effectiveFrom: "2010-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "VA" },
      { fact: "employee.is_minor", op: "=", value: true },
      { fact: "employee.age", op: ">=", value: 16 },
      { fact: "employee.age", op: "<=", value: 17 },
      { fact: "shift.is_school_day", op: "=", value: true },
      { fact: "shift.end_hour", op: ">=", value: 23 },
    ],
  },

  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling a 16-17 year old to work past 11:00 PM on a school night in VA",
  },

  citations: [
    {
      source: "VA Code §40.1-100",
      url: "https://law.lis.virginia.gov/vacode/title40.1/chapter5/section40.1-100/",
      section: "§40.1-100",
    },
  ],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_MINOR_LABOR_RULES: readonly Rule[] = [
  // Federal baseline (14-15)
  federalMinor14_15_SchoolDayHours,
  federalMinor14_15_NonSchoolDayHours,
  federalMinor14_15_SchoolWeekHours,
  federalMinor14_15_NonSchoolWeekHours,
  federalMinor14_15_Curfew,
  federalMinor14_15_CurfewSummer,
  federalMinor14_15_EarlyStart,
  // NY 16-17
  nyMinor16_17_SchoolDayHours,
  nyMinor16_17_SchoolWeekHours,
  nyMinor16_17_NonSchoolDayHours,
  nyMinor16_17_NonSchoolWeekHours,
  nyMinor16_17_Curfew,
  // CA 16-17
  caMinor16_17_SchoolDayHours,
  caMinor16_17_NonSchoolDayHours,
  caMinor16_17_WeekHours,
  caMinor16_17_Curfew,
  // CT 16-17
  ctMinor16_17_SchoolDayHours,
  ctMinor16_17_WeekHours,
  ctMinor16_17_Curfew,
  // NV 16-17
  nvMinor16_17_SchoolDayHours,
  nvMinor16_17_NonSchoolDayHours,
  nvMinor16_17_Curfew,
  // NJ 16-17
  njMinor16_17_SchoolDayHours,
  njMinor16_17_NonSchoolDayHours,
  njMinor16_17_WeekHours,
  njMinor16_17_Curfew,
  // MD 16-17
  mdMinor16_17_SchoolDayHours,
  mdMinor16_17_Curfew,
  // DC 16-17
  dcMinor16_17_SchoolDayHours,
  dcMinor16_17_NonSchoolDayHours,
  dcMinor16_17_Curfew,
  // VA 16-17
  vaMinor16_17_SchoolDayHours,
  vaMinor16_17_Curfew,
];
