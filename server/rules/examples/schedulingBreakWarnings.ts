/**
 * Scheduling-Time Break Warnings
 *
 * These rules fire based on shift length alone — they don't require
 * knowing whether a break was actually provided. They're designed to
 * warn at scheduling time: "this shift requires a meal/rest break."
 *
 * The existing meal/rest break rules (californiaMealBreak.ts, mealRestBreaks.ts,
 * allStateMealBreaks.ts) are compliance-verification rules that check whether
 * a break was actually given. These scheduling warnings are complementary.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── Meal Break Scheduling Warnings ────────────────────────────────

function mealBreakWarning(opts: {
  state: string;
  stateName: string;
  hoursThreshold: number;
  breakMinutes: number;
  effectiveFrom: string;
  source: string;
  url: string;
  section?: string;
}): Rule {
  return createRule({
    id: `${opts.state.toLowerCase()}-meal-break-scheduling-warning`,
    title: `${opts.stateName} — Meal Break Required (shifts > ${opts.hoursThreshold} hrs)`,
    jurisdiction: opts.state,
    topic: "meal_break",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: {
      all: [
        { fact: "location.state", op: "=", value: opts.state },
        { fact: "shift.shift_length_hours", op: ">", value: opts.hoursThreshold },
        { fact: "shift.meal_break_provided", op: "=", value: false },
      ],
    },
    result: {
      type: "warning",
      message: `${opts.stateName} requires a ${opts.breakMinutes}-minute meal break for shifts over ${opts.hoursThreshold} hours. Ensure a break is scheduled.`,
    },
    citations: [{ source: opts.source, url: opts.url, section: opts.section }],
  });
}

// States with meal break laws (from DOL.gov, Jan 2023)
// Threshold and duration per state statute

export const caMealWarning = mealBreakWarning({
  state: "CA", stateName: "California",
  hoursThreshold: 5, breakMinutes: 30,
  effectiveFrom: "2001-01-01",
  source: "California Labor Code §512(a)",
  url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=512.&lawCode=LAB",
  section: "Cal. Lab. Code §512(a)",
});

export const coMealWarning = mealBreakWarning({
  state: "CO", stateName: "Colorado",
  hoursThreshold: 5, breakMinutes: 30,
  effectiveFrom: "2020-01-01",
  source: "Colorado COMPS Order #39",
  url: "https://cdle.colorado.gov/comps-order",
  section: "7 CCR 1103-1 Rule 5.2",
});

export const ctMealWarning = mealBreakWarning({
  state: "CT", stateName: "Connecticut",
  hoursThreshold: 7.5, breakMinutes: 30,
  effectiveFrom: "1990-07-01",
  source: "Conn. Gen. Stat. §31-51ii",
  url: "https://www.cga.ct.gov/current/pub/chap_557.htm",
  section: "§31-51ii",
});

export const deMealWarning = mealBreakWarning({
  state: "DE", stateName: "Delaware",
  hoursThreshold: 7.5, breakMinutes: 30,
  effectiveFrom: "1993-01-01",
  source: "19 Del. C. §707",
  url: "https://delcode.delaware.gov/title19/c007/index.html",
  section: "19 Del. C. §707",
});

export const ilMealWarning = mealBreakWarning({
  state: "IL", stateName: "Illinois",
  hoursThreshold: 7.5, breakMinutes: 20,
  effectiveFrom: "2010-01-01",
  source: "820 ILCS 140/3",
  url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=1505",
  section: "820 ILCS 140/3",
});

export const kyMealWarning = mealBreakWarning({
  state: "KY", stateName: "Kentucky",
  hoursThreshold: 5, breakMinutes: 30,
  effectiveFrom: "1974-01-01",
  source: "KRS §337.355",
  url: "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=32207",
  section: "KRS §337.355",
});

export const maMealWarning = mealBreakWarning({
  state: "MA", stateName: "Massachusetts",
  hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "1994-01-01",
  source: "MGL c.149 §100",
  url: "https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXXI/Chapter149/Section100",
  section: "MGL c.149 §100",
});

export const mdMealWarning = mealBreakWarning({
  state: "MD", stateName: "Maryland",
  hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "2012-01-01",
  source: "Md. Code Lab. & Empl. §3-710",
  url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gle&section=3-710",
  section: "§3-710",
});

export const meMealWarning = mealBreakWarning({
  state: "ME", stateName: "Maine",
  hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "2007-01-01",
  source: "26 MRSA §601",
  url: "https://legislature.maine.gov/statutes/26/title26sec601.html",
  section: "26 MRSA §601",
});

export const mnMealWarning = mealBreakWarning({
  state: "MN", stateName: "Minnesota",
  hoursThreshold: 8, breakMinutes: 30,
  effectiveFrom: "1988-01-01",
  source: "Minn. Stat. §177.254",
  url: "https://www.revisor.mn.gov/statutes/cite/177.254",
  section: "Minn. Stat. §177.254",
});

export const ndMealWarning = mealBreakWarning({
  state: "ND", stateName: "North Dakota",
  hoursThreshold: 5, breakMinutes: 30,
  effectiveFrom: "1990-01-01",
  source: "ND Admin Code §46-02-07-02",
  url: "https://www.nd.gov/labor/wage-and-hour",
  section: "NDAC §46-02-07-02",
});

export const neMealWarning = mealBreakWarning({
  state: "NE", stateName: "Nebraska",
  hoursThreshold: 8, breakMinutes: 30,
  effectiveFrom: "1988-01-01",
  source: "Neb. Rev. Stat. §48-212",
  url: "https://nebraskalegislature.gov/laws/statutes.php?statute=48-212",
  section: "Neb. Rev. Stat. §48-212",
});

export const nhMealWarning = mealBreakWarning({
  state: "NH", stateName: "New Hampshire",
  hoursThreshold: 5, breakMinutes: 30,
  effectiveFrom: "1988-01-01",
  source: "RSA §275:30-a",
  url: "https://www.gencourt.state.nh.us/rsa/html/XXIII/275/275-30-a.htm",
  section: "RSA §275:30-a",
});

export const nvMealWarning = mealBreakWarning({
  state: "NV", stateName: "Nevada",
  hoursThreshold: 8, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "NRS §608.019",
  url: "https://www.leg.state.nv.us/nrs/nrs-608.html#NRS608Sec019",
  section: "NRS §608.019",
});

export const nyMealWarning = mealBreakWarning({
  state: "NY", stateName: "New York",
  hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "2010-01-01",
  source: "NY Labor Law §162",
  url: "https://www.nysenate.gov/legislation/laws/LAB/162",
  section: "NY Lab. Law §162",
});

export const orMealWarning = mealBreakWarning({
  state: "OR", stateName: "Oregon",
  hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "2007-01-01",
  source: "OAR 839-020-0050",
  url: "https://www.oregon.gov/boli/workers/pages/meals-and-breaks.aspx",
  section: "OAR 839-020-0050",
});

export const riMealWarning = mealBreakWarning({
  state: "RI", stateName: "Rhode Island",
  hoursThreshold: 6, breakMinutes: 20,
  effectiveFrom: "2012-01-01",
  source: "R.I. Gen. Laws §28-3-14",
  url: "https://law.justia.com/codes/rhode-island/title-28/chapter-28-3/section-28-3-14/",
  section: "R.I. Gen. Laws §28-3-14",
});

export const tnMealWarning = mealBreakWarning({
  state: "TN", stateName: "Tennessee",
  hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "2005-01-01",
  source: "Tenn. Code §50-2-103(h)",
  url: "https://law.justia.com/codes/tennessee/title-50/chapter-2/part-1/section-50-2-103/",
  section: "Tenn. Code §50-2-103(h)",
});

export const vtMealWarning = mealBreakWarning({
  state: "VT", stateName: "Vermont",
  hoursThreshold: 6, breakMinutes: 30,
  effectiveFrom: "1970-01-01",
  source: "21 V.S.A. §304",
  url: "https://legislature.vermont.gov/statutes/section/21/005/00304",
  section: "21 V.S.A. §304",
});

export const waMealWarning = mealBreakWarning({
  state: "WA", stateName: "Washington",
  hoursThreshold: 5, breakMinutes: 30,
  effectiveFrom: "2005-01-01",
  source: "WAC 296-126-092",
  url: "https://lni.wa.gov/workers-rights/workplace-policies/rest-breaks",
  section: "WAC 296-126-092",
});

export const wvMealWarning = mealBreakWarning({
  state: "WV", stateName: "West Virginia",
  hoursThreshold: 6, breakMinutes: 20,
  effectiveFrom: "2013-01-01",
  source: "W. Va. Code §21-3-10a",
  url: "https://www.wvlegislature.gov/wvcode/code.cfm?chap=21&art=3",
  section: "W. Va. Code §21-3-10a",
});

// ─── Rest Break Scheduling Warnings ────────────────────────────────

function restBreakWarning(opts: {
  state: string;
  stateName: string;
  hoursThreshold: number;
  breakMinutes: number;
  effectiveFrom: string;
  source: string;
  url: string;
  section?: string;
}): Rule {
  return createRule({
    id: `${opts.state.toLowerCase()}-rest-break-scheduling-warning`,
    title: `${opts.stateName} — Rest Break Required (per ${opts.hoursThreshold} hrs worked)`,
    jurisdiction: opts.state,
    topic: "rest_break",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: {
      all: [
        { fact: "location.state", op: "=", value: opts.state },
        { fact: "shift.shift_length_hours", op: ">=", value: opts.hoursThreshold },
        { fact: "shift.rest_break_provided", op: "=", value: false },
      ],
    },
    result: {
      type: "warning",
      message: `${opts.stateName} requires a paid ${opts.breakMinutes}-minute rest break for every ${opts.hoursThreshold} hours worked. Ensure rest breaks are scheduled.`,
    },
    citations: [{ source: opts.source, url: opts.url, section: opts.section }],
  });
}

// States with mandatory paid rest breaks (DOL.gov, Jan 2023)

export const caRestWarning = restBreakWarning({
  state: "CA", stateName: "California",
  hoursThreshold: 4, breakMinutes: 10,
  effectiveFrom: "2001-01-01",
  source: "IWC Orders / Cal. Lab. Code §226.7",
  url: "https://www.dir.ca.gov/dlse/faq_restperiods.htm",
  section: "IWC Orders §11-12",
});

export const coRestWarning = restBreakWarning({
  state: "CO", stateName: "Colorado",
  hoursThreshold: 4, breakMinutes: 10,
  effectiveFrom: "2020-01-01",
  source: "Colorado COMPS Order #39",
  url: "https://cdle.colorado.gov/comps-order",
  section: "7 CCR 1103-1 Rule 5.1",
});

export const kyRestWarning = restBreakWarning({
  state: "KY", stateName: "Kentucky",
  hoursThreshold: 4, breakMinutes: 10,
  effectiveFrom: "1974-01-01",
  source: "KRS §337.365",
  url: "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=32209",
  section: "KRS §337.365",
});

export const mnRestWarning = restBreakWarning({
  state: "MN", stateName: "Minnesota",
  hoursThreshold: 4, breakMinutes: 10,
  effectiveFrom: "1988-01-01",
  source: "Minn. Stat. §177.254",
  url: "https://www.revisor.mn.gov/statutes/cite/177.254",
  section: "Minn. Stat. §177.254",
});

export const nvRestWarning = restBreakWarning({
  state: "NV", stateName: "Nevada",
  hoursThreshold: 4, breakMinutes: 10,
  effectiveFrom: "2010-01-01",
  source: "NRS §608.019",
  url: "https://www.leg.state.nv.us/nrs/nrs-608.html#NRS608Sec019",
  section: "NRS §608.019",
});

export const orRestWarning = restBreakWarning({
  state: "OR", stateName: "Oregon",
  hoursThreshold: 4, breakMinutes: 10,
  effectiveFrom: "2007-01-01",
  source: "OAR 839-020-0045",
  url: "https://www.oregon.gov/boli/workers/pages/meals-and-breaks.aspx",
  section: "OAR 839-020-0045",
});

export const waRestWarning = restBreakWarning({
  state: "WA", stateName: "Washington",
  hoursThreshold: 4, breakMinutes: 10,
  effectiveFrom: "2005-01-01",
  source: "WAC 296-126-092",
  url: "https://lni.wa.gov/workers-rights/workplace-policies/rest-breaks",
  section: "WAC 296-126-092",
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_SCHEDULING_BREAK_WARNINGS: readonly Rule[] = [
  // Meal break warnings (21 states)
  caMealWarning, coMealWarning, ctMealWarning, deMealWarning,
  ilMealWarning, kyMealWarning, maMealWarning, mdMealWarning,
  meMealWarning, mnMealWarning, ndMealWarning, neMealWarning,
  nhMealWarning, nvMealWarning, nyMealWarning, orMealWarning,
  riMealWarning, tnMealWarning, vtMealWarning, waMealWarning,
  wvMealWarning,
  // Rest break warnings (7 states)
  caRestWarning, coRestWarning, kyRestWarning, mnRestWarning,
  nvRestWarning, orRestWarning, waRestWarning,
];
