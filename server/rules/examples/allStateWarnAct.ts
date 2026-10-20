/**
 * State Mini-WARN Acts — 21 States
 *
 * These are state-level plant closing/mass layoff notification laws
 * that supplement or expand the federal WARN Act (60-day notice for
 * 100+ employee sites).
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

function stateWarnRule(opts: {
  state: string;
  stateName: string;
  noticeDays: number;
  employeeThreshold: number;
  effectiveFrom: string;
  source: string;
  url: string;
  section?: string;
  note?: string;
}): Rule {
  const desc = `${opts.stateName} requires ${opts.noticeDays} days advance written notice before plant closing or mass layoff affecting ${opts.employeeThreshold}+ employees.${opts.note ? " " + opts.note : ""}`;
  return createRule({
    id: `${opts.state.toLowerCase()}-warn-act`,
    title: `${opts.stateName} Mini-WARN Act (${opts.noticeDays}-day notice, ${opts.employeeThreshold}+ employees)`,
    jurisdiction: opts.state,
    topic: "warn_act",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: {
      all: [
        { fact: "location.state", op: "=", value: opts.state },
        { fact: "employer.total_employees", op: ">=", value: opts.employeeThreshold },
        { fact: "termination.is_mass_layoff", op: "=", value: true },
      ],
    },
    result: {
      type: "prohibition",
      prohibitedAction: desc,
    },
    citations: [{ source: opts.source, url: opts.url, section: opts.section }],
  });
}

export const californiaWarn = stateWarnRule({
  state: "CA", stateName: "California",
  noticeDays: 60, employeeThreshold: 75,
  effectiveFrom: "2003-01-01",
  source: "Cal-WARN Act",
  url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=LAB&division=2.&title=&part=4.&chapter=4.&article=",
  section: "Cal. Labor Code §1400-1408",
});

export const connecticutWarn = stateWarnRule({
  state: "CT", stateName: "Connecticut",
  noticeDays: 90, employeeThreshold: 100,
  effectiveFrom: "1985-01-01",
  source: "Conn. Gen. Stat. §31-51n",
  url: "https://www.cga.ct.gov/current/pub/chap_557.htm",
  section: "§31-51n",
  note: "Requires continuation of group health insurance for 120 days.",
});

export const georgiaWarn = stateWarnRule({
  state: "GA", stateName: "Georgia",
  noticeDays: 60, employeeThreshold: 100,
  effectiveFrom: "1993-01-01",
  source: "Ga. Code §34-6-1",
  url: "https://law.justia.com/codes/georgia/title-34/chapter-6/",
  section: "§34-6-1 et seq.",
  note: "Requires filing with GA DOL Commissioner.",
});

export const hawaiiWarn = stateWarnRule({
  state: "HI", stateName: "Hawaii",
  noticeDays: 60, employeeThreshold: 50,
  effectiveFrom: "1987-01-01",
  source: "HRS §394B",
  url: "https://www.capitol.hawaii.gov/hrscurrent/Vol07_Ch0346-0398/HRS0394B/",
  section: "HRS §394B-9",
  note: "Lower threshold than federal (50 vs 100). Covers partial closings.",
});

export const illinoisWarn = stateWarnRule({
  state: "IL", stateName: "Illinois",
  noticeDays: 60, employeeThreshold: 75,
  effectiveFrom: "2005-01-01",
  source: "820 ILCS 65 (IL WARN)",
  url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=2588",
  section: "820 ILCS 65/1 et seq.",
  note: "Lower threshold than federal (75 vs 100).",
});

export const iowaWarn = stateWarnRule({
  state: "IA", stateName: "Iowa",
  noticeDays: 30, employeeThreshold: 25,
  effectiveFrom: "1990-01-01",
  source: "Iowa Code §84C",
  url: "https://www.legis.iowa.gov/law/iowaCode/sections?codeChapter=84C",
  section: "Iowa Code §84C.1-84C.6",
  note: "Very low threshold (25 employees). 30-day notice.",
});

export const kansasWarn = stateWarnRule({
  state: "KS", stateName: "Kansas",
  noticeDays: 60, employeeThreshold: 100,
  effectiveFrom: "1988-01-01",
  source: "K.S.A. §44-616",
  url: "https://www.ksrevisor.org/statutes/chapters/ch44/044_006_0016.html",
  section: "K.S.A. §44-616",
  note: "Notification to Secretary of Human Resources required.",
});

export const massachusettsWarn = stateWarnRule({
  state: "MA", stateName: "Massachusetts",
  noticeDays: 90, employeeThreshold: 50,
  effectiveFrom: "1984-01-01",
  source: "MGL c.151A §71A-71G",
  url: "https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXXI/Chapter151A/Section71A",
  section: "MGL c.151A §71A",
  note: "90-day notice, lower threshold (50). Includes reemployment assistance.",
});

export const marylandWarn = stateWarnRule({
  state: "MD", stateName: "Maryland",
  noticeDays: 60, employeeThreshold: 50,
  effectiveFrom: "2020-10-01",
  source: "Md. Code Lab. & Empl. §11-301",
  url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gle&section=11-301",
  section: "§11-301 et seq.",
  note: "Economic Stabilization Act. Covers relocations. Threshold: 50 employees.",
});

export const maineWarn = stateWarnRule({
  state: "ME", stateName: "Maine",
  noticeDays: 60, employeeThreshold: 100,
  effectiveFrom: "2007-01-01",
  source: "26 MRSA §625-B",
  url: "https://legislature.maine.gov/statutes/26/title26sec625-B.html",
  section: "26 MRSA §625-B",
  note: "Severance pay required: 1 week per year of service for 3+ year employees.",
});

export const michiganWarn = stateWarnRule({
  state: "MI", stateName: "Michigan",
  noticeDays: 60, employeeThreshold: 25,
  effectiveFrom: "2007-01-01",
  source: "MCL §450.731 et seq.",
  url: "https://www.legislature.mi.gov/Laws/MCL?objectName=MCL-450-731",
  section: "MCL §450.731-450.737",
  note: "Very low threshold (25 employees). Notification to state workforce agency.",
});

export const minnesotaWarn = stateWarnRule({
  state: "MN", stateName: "Minnesota",
  noticeDays: 60, employeeThreshold: 50,
  effectiveFrom: "1988-01-01",
  source: "Minn. Stat. §116L.976",
  url: "https://www.revisor.mn.gov/statutes/cite/116L.976",
  section: "Minn. Stat. §116L.976",
  note: "Covers closings and substantial layoffs (50+ employees).",
});

export const newHampshireWarn = stateWarnRule({
  state: "NH", stateName: "New Hampshire",
  noticeDays: 60, employeeThreshold: 100,
  effectiveFrom: "1989-01-01",
  source: "RSA §275-F",
  url: "https://www.gencourt.state.nh.us/rsa/html/XXIII/275-F/275-F-mrg.htm",
  section: "RSA §275-F:1 et seq.",
});

export const newJerseyWarn = stateWarnRule({
  state: "NJ", stateName: "New Jersey",
  noticeDays: 90, employeeThreshold: 100,
  effectiveFrom: "2020-07-19",
  source: "NJ WARN Act (N.J.S.A. 34:21-1)",
  url: "https://www.nj.gov/labor/worker-protections/earnedsick/law.shtml",
  section: "N.J.S.A. 34:21-1 et seq.",
  note: "90-day notice (longer than federal). Severance pay: 1 week per year of service.",
});

export const newYorkWarn = stateWarnRule({
  state: "NY", stateName: "New York",
  noticeDays: 90, employeeThreshold: 50,
  effectiveFrom: "2009-02-01",
  source: "NY WARN Act (Labor Law §860)",
  url: "https://dol.ny.gov/warn-act",
  section: "NY Labor Law §860-860-i",
  note: "90-day notice, lower threshold (50 employees in prior 12 months).",
});

export const ohioWarn = stateWarnRule({
  state: "OH", stateName: "Ohio",
  noticeDays: 60, employeeThreshold: 100,
  effectiveFrom: "1988-01-01",
  source: "ORC §4141.28",
  url: "https://codes.ohio.gov/ohio-revised-code/section-4141.28",
  section: "ORC §4141.28(C)",
  note: "Notification to Director of Job and Family Services.",
});

export const oregonWarn = stateWarnRule({
  state: "OR", stateName: "Oregon",
  noticeDays: 60, employeeThreshold: 100,
  effectiveFrom: "2010-01-01",
  source: "ORS §285B.500",
  url: "https://www.oregonlegislature.gov/bills_laws/ors/ors285B.html",
  section: "ORS §285B.500-285B.524",
  note: "Notification to Dislocated Worker Unit. Covers relocations 100+ miles.",
});

export const pennsylvaniaWarn = stateWarnRule({
  state: "PA", stateName: "Pennsylvania",
  noticeDays: 60, employeeThreshold: 100,
  effectiveFrom: "1988-01-01",
  source: "73 P.S. §1851 et seq.",
  url: "https://www.legis.state.pa.us/cfdocs/legis/LI/uconsCheck.cfm?yr=1988&sessInd=0&act=0180",
  section: "73 P.S. §1851-1855",
  note: "Notification to PA Dept of Labor & Industry.",
});

export const southCarolinaWarn = stateWarnRule({
  state: "SC", stateName: "South Carolina",
  noticeDays: 60, employeeThreshold: 100,
  effectiveFrom: "2007-01-01",
  source: "S.C. Code §41-1-40",
  url: "https://www.scstatehouse.gov/code/t41c001.php",
  section: "S.C. Code §41-1-40",
  note: "Notification to SC Dept of Employment and Workforce.",
});

export const tennesseeWarn = stateWarnRule({
  state: "TN", stateName: "Tennessee",
  noticeDays: 60, employeeThreshold: 50,
  effectiveFrom: "1989-01-01",
  source: "Tenn. Code §50-1-602",
  url: "https://law.justia.com/codes/tennessee/title-50/chapter-1/part-6/",
  section: "Tenn. Code §50-1-601 et seq.",
  note: "Lower threshold (50 employees). Notification to Commissioner of Labor.",
});

export const wisconsinWarn = stateWarnRule({
  state: "WI", stateName: "Wisconsin",
  noticeDays: 60, employeeThreshold: 50,
  effectiveFrom: "1988-01-01",
  source: "Wis. Stat. §109.07",
  url: "https://docs.legis.wisconsin.gov/statutes/statutes/109/07",
  section: "Wis. Stat. §109.07",
  note: "Business Closing and Mass Layoff Law. Threshold: 50 employees.",
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_STATE_WARN_ACT_RULES: readonly Rule[] = [
  californiaWarn,
  connecticutWarn,
  georgiaWarn,
  hawaiiWarn,
  illinoisWarn,
  iowaWarn,
  kansasWarn,
  massachusettsWarn,
  marylandWarn,
  maineWarn,
  michiganWarn,
  minnesotaWarn,
  newHampshireWarn,
  newJerseyWarn,
  newYorkWarn,
  ohioWarn,
  oregonWarn,
  pennsylvaniaWarn,
  southCarolinaWarn,
  tennesseeWarn,
  wisconsinWarn,
];
