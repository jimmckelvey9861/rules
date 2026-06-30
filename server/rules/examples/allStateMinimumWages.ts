/**
 * All 50 States + DC — Minimum Wage Rules
 *
 * This file covers the states NOT already handled in:
 * - stateMinimumWages.ts (AK, CA, HI, NM, WA)
 * - priorityStateMinimumWages.ts (NY, DC, VA, MD, NJ, CT, NV)
 *
 * That leaves 38 states. States that follow the federal minimum ($7.25)
 * are included with their own rule so the matrix shows coverage, but they
 * effectively duplicate the federal rule (interaction resolution will
 * supersede the federal one when both fire).
 *
 * Rates as of January 1, 2025.
 * Sources: DOL.gov state minimum wage table, individual state statutes.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── Helper ────────────────────────────────────────────────────────

function stateMinWage(opts: {
  state: string;
  stateName: string;
  minimum: number;
  effectiveFrom: string;
  source: string;
  url: string;
  section?: string;
  note?: string;
}): Rule {
  return createRule({
    id: `${opts.state.toLowerCase()}-minimum-wage-${opts.minimum}`,
    title: `${opts.stateName} Minimum Wage ($${opts.minimum.toFixed(2)}/hr)`,
    jurisdiction: opts.state,
    topic: "minimum_wage",
    effectiveFrom: opts.effectiveFrom,
    status: "active",
    appliesWhen: {
      all: [
        { fact: "location.state", op: "=", value: opts.state },
        { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      ],
    },
    result: {
      type: "minimum_required_value",
      targetFact: "employee.regular_hourly_rate",
      minimum: opts.minimum,
      unit: "USD/hour",
    },
    citations: [
      {
        source: opts.source,
        url: opts.url,
        section: opts.section,
      },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════
// STATES WITH RATES ABOVE FEDERAL ($7.25)
// ═══════════════════════════════════════════════════════════════════

export const arizonaMinWage = stateMinWage({
  state: "AZ", stateName: "Arizona", minimum: 14.70,
  effectiveFrom: "2025-01-01",
  source: "ARS §23-363",
  url: "https://www.azleg.gov/ars/23/00363.htm",
});

export const arkansasMinWage = stateMinWage({
  state: "AR", stateName: "Arkansas", minimum: 11.00,
  effectiveFrom: "2021-01-01",
  source: "Ark. Code §11-4-210",
  url: "https://www.dol.gov/agencies/whd/minimum-wage/state#ar",
});

export const coloradoMinWage = stateMinWage({
  state: "CO", stateName: "Colorado", minimum: 14.81,
  effectiveFrom: "2025-01-01",
  source: "COMPS Order #40",
  url: "https://cdle.colorado.gov/wage-and-hour-law/minimum-wage",
});

export const delawareMinWage = stateMinWage({
  state: "DE", stateName: "Delaware", minimum: 13.25,
  effectiveFrom: "2025-01-01",
  source: "19 Del. C. §902",
  url: "https://dia.delawareworks.com/labor-law/minimum-wage.php",
});

export const floridaMinWage = stateMinWage({
  state: "FL", stateName: "Florida", minimum: 14.00,
  effectiveFrom: "2024-09-30",
  source: "FL Const. Art. X §24",
  url: "https://floridajobs.org/minimum-wage",
});

export const illinoisMinWage = stateMinWage({
  state: "IL", stateName: "Illinois", minimum: 15.00,
  effectiveFrom: "2025-01-01",
  source: "820 ILCS 105/4a",
  url: "https://labor.illinois.gov/laws-rules/conmed/minimum-wage-rates-702.html",
});

export const maineMinWage = stateMinWage({
  state: "ME", stateName: "Maine", minimum: 14.65,
  effectiveFrom: "2025-01-01",
  source: "26 MRSA §664",
  url: "https://www.maine.gov/labor/labor_laws/minimum_wage.html",
});

export const massachusettsMinWage = stateMinWage({
  state: "MA", stateName: "Massachusetts", minimum: 15.00,
  effectiveFrom: "2023-01-01",
  source: "MGL c.151 §1",
  url: "https://www.mass.gov/info-details/minimum-wage",
});

export const michiganMinWage = stateMinWage({
  state: "MI", stateName: "Michigan", minimum: 10.56,
  effectiveFrom: "2025-01-01",
  source: "MCL §408.934",
  url: "https://www.michigan.gov/leo/bureaus-agencies/ber/wage-hour/minimum-wage",
});

export const minnesotaMinWage = stateMinWage({
  state: "MN", stateName: "Minnesota", minimum: 11.13,
  effectiveFrom: "2025-01-01",
  source: "Minn. Stat. §177.24",
  url: "https://www.dli.mn.gov/business/employment-practices/minimum-wage-minnesota",
});

export const missouriMinWage = stateMinWage({
  state: "MO", stateName: "Missouri", minimum: 15.00,
  effectiveFrom: "2025-01-01",
  source: "MO Const. Art. III §3(a)",
  url: "https://labor.mo.gov/dls/minimum-wage",
});

export const montanaMinWage = stateMinWage({
  state: "MT", stateName: "Montana", minimum: 10.55,
  effectiveFrom: "2025-01-01",
  source: "MCA §39-3-409",
  url: "https://erd.dli.mt.gov/labor-standards/wage-and-hour-payment-act/minimum-wage",
});

export const nebraskaMinWage = stateMinWage({
  state: "NE", stateName: "Nebraska", minimum: 13.50,
  effectiveFrom: "2025-01-01",
  source: "Neb. Rev. Stat. §48-1203",
  url: "https://dol.nebraska.gov/MinimumWage",
});

export const newHampshireMinWage = stateMinWage({
  state: "NH", stateName: "New Hampshire", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "NH RSA §279:21",
  url: "https://www.nh.gov/labor/inspection/wage-hour/minimum-wage.htm",
  note: "Follows federal rate",
});

export const ohioMinWage = stateMinWage({
  state: "OH", stateName: "Ohio", minimum: 10.70,
  effectiveFrom: "2025-01-01",
  source: "OH Const. Art. II §34a",
  url: "https://com.ohio.gov/divisions-and-programs/industrial-compliance/wage-and-hour/minimum-wage",
});

export const oregonMinWage = stateMinWage({
  state: "OR", stateName: "Oregon", minimum: 14.70,
  effectiveFrom: "2025-07-01",
  source: "ORS §653.025",
  url: "https://www.oregon.gov/boli/workers/pages/minimum-wage.aspx",
});

export const rhodeIslandMinWage = stateMinWage({
  state: "RI", stateName: "Rhode Island", minimum: 15.00,
  effectiveFrom: "2025-01-01",
  source: "RI Gen. Laws §28-12-3",
  url: "https://dlt.ri.gov/individuals/workplace-protections/minimum-wage",
});

export const southDakotaMinWage = stateMinWage({
  state: "SD", stateName: "South Dakota", minimum: 11.50,
  effectiveFrom: "2025-01-01",
  source: "SDCL §60-11-3",
  url: "https://dlr.sd.gov/employment_laws/minimum_wage.aspx",
});

export const vermontMinWage = stateMinWage({
  state: "VT", stateName: "Vermont", minimum: 14.01,
  effectiveFrom: "2025-01-01",
  source: "21 VSA §384",
  url: "https://labor.vermont.gov/minimum-wage",
});

export const westVirginiaMinWage = stateMinWage({
  state: "WV", stateName: "West Virginia", minimum: 8.75,
  effectiveFrom: "2015-01-01",
  source: "W. Va. Code §21-5C-2",
  url: "https://labor.wv.gov/Pages/Minimum-Wage.aspx",
});

// ═══════════════════════════════════════════════════════════════════
// STATES AT FEDERAL MINIMUM ($7.25) — no separate state law or
// state law matches federal
// ═══════════════════════════════════════════════════════════════════

export const georgiaMinWage = stateMinWage({
  state: "GA", stateName: "Georgia", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "O.C.G.A. §34-4-3 (federal rate applies)",
  url: "https://dol.georgia.gov/minimum-wage",
  note: "State rate is $5.15 but federal $7.25 applies to FLSA-covered employers",
});

export const idahoMinWage = stateMinWage({
  state: "ID", stateName: "Idaho", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "Idaho Code §44-1502",
  url: "https://www.labor.idaho.gov/dnn/Businesses/Wage-and-Hour-Resources/Minimum-Wage",
});

export const indianaMinWage = stateMinWage({
  state: "IN", stateName: "Indiana", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "IC §22-2-2-4",
  url: "https://www.in.gov/dol/wage-and-hour/minimum-wage/",
});

export const iowaMinWage = stateMinWage({
  state: "IA", stateName: "Iowa", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "Iowa Code §91D.1",
  url: "https://www.iowadivisionoflabor.gov/minimum-wage",
});

export const kansasMinWage = stateMinWage({
  state: "KS", stateName: "Kansas", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "K.S.A. §44-1203",
  url: "https://www.dol.ks.gov/laws/minimum-wage",
});

export const kentuckyMinWage = stateMinWage({
  state: "KY", stateName: "Kentucky", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "KRS §337.275",
  url: "https://labor.ky.gov/standards/Pages/Minimum-Wage.aspx",
});

export const louisianaMinWage = stateMinWage({
  state: "LA", stateName: "Louisiana", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "No state minimum wage law (federal applies)",
  url: "https://www.dol.gov/agencies/whd/minimum-wage/state#la",
  note: "Louisiana has no state minimum wage law; federal rate applies",
});

export const mississippiMinWage = stateMinWage({
  state: "MS", stateName: "Mississippi", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "No state minimum wage law (federal applies)",
  url: "https://www.dol.gov/agencies/whd/minimum-wage/state#ms",
  note: "Mississippi has no state minimum wage law; federal rate applies",
});

export const northCarolinaMinWage = stateMinWage({
  state: "NC", stateName: "North Carolina", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "NCGS §95-25.3",
  url: "https://www.labor.nc.gov/workplace-rights/employee-rights-regarding-time-worked-and-wages-earned/minimum-wage-nc",
});

export const northDakotaMinWage = stateMinWage({
  state: "ND", stateName: "North Dakota", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "NDCC §34-06-22",
  url: "https://www.nd.gov/labor/minimum-wage",
});

export const oklahomaMinWage = stateMinWage({
  state: "OK", stateName: "Oklahoma", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "40 O.S. §197.2",
  url: "https://oklahoma.gov/omes/services/risk-management/minimum-wage.html",
});

export const pennsylvaniaMinWage = stateMinWage({
  state: "PA", stateName: "Pennsylvania", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "43 P.S. §333.104",
  url: "https://www.dli.pa.gov/Individuals/Labor-Management-Relations/llc/minimum-wage/Pages/default.aspx",
});

export const southCarolinaMinWage = stateMinWage({
  state: "SC", stateName: "South Carolina", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "No state minimum wage law (federal applies)",
  url: "https://www.dol.gov/agencies/whd/minimum-wage/state#sc",
  note: "South Carolina has no state minimum wage law; federal rate applies",
});

export const tennesseeMinWage = stateMinWage({
  state: "TN", stateName: "Tennessee", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "No state minimum wage law (federal applies)",
  url: "https://www.dol.gov/agencies/whd/minimum-wage/state#tn",
  note: "Tennessee has no state minimum wage law; federal rate applies",
});

export const texasMinWage = stateMinWage({
  state: "TX", stateName: "Texas", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "Tex. Lab. Code §62.051",
  url: "https://www.twc.texas.gov/businesses/minimum-wage-law",
});

export const utahMinWage = stateMinWage({
  state: "UT", stateName: "Utah", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "Utah Code §34-40-103",
  url: "https://laborcommission.utah.gov/divisions/antidiscrimination-and-labor/minimum-wage/",
});

export const wisconsinMinWage = stateMinWage({
  state: "WI", stateName: "Wisconsin", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "Wis. Stat. §104.01",
  url: "https://dwd.wisconsin.gov/er/laborstandards/minimumwage.htm",
});

export const wyomingMinWage = stateMinWage({
  state: "WY", stateName: "Wyoming", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "Wyo. Stat. §27-4-202",
  url: "https://dws.wyo.gov/dws-division/labor-standards/minimum-wage/",
});

export const alabamaMinWage = stateMinWage({
  state: "AL", stateName: "Alabama", minimum: 7.25,
  effectiveFrom: "2009-07-24",
  source: "No state minimum wage law (federal applies)",
  url: "https://www.dol.gov/agencies/whd/minimum-wage/state#al",
  note: "Alabama has no state minimum wage law; federal rate applies",
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_REMAINING_STATE_MINIMUM_WAGES: readonly Rule[] = [
  // Above federal
  arizonaMinWage,
  arkansasMinWage,
  coloradoMinWage,
  delawareMinWage,
  floridaMinWage,
  illinoisMinWage,
  maineMinWage,
  massachusettsMinWage,
  michiganMinWage,
  minnesotaMinWage,
  missouriMinWage,
  montanaMinWage,
  nebraskaMinWage,
  newHampshireMinWage,
  ohioMinWage,
  oregonMinWage,
  rhodeIslandMinWage,
  southDakotaMinWage,
  vermontMinWage,
  westVirginiaMinWage,
  // At federal rate
  georgiaMinWage,
  idahoMinWage,
  indianaMinWage,
  iowaMinWage,
  kansasMinWage,
  kentuckyMinWage,
  louisianaMinWage,
  mississippiMinWage,
  northCarolinaMinWage,
  northDakotaMinWage,
  oklahomaMinWage,
  pennsylvaniaMinWage,
  southCarolinaMinWage,
  tennesseeMinWage,
  texasMinWage,
  utahMinWage,
  wisconsinMinWage,
  wyomingMinWage,
  alabamaMinWage,
];
