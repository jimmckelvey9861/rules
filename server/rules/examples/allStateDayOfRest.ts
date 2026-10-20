/**
 * Day of Rest Laws — 6 Additional States
 *
 * NY is already covered in dayOfRest.ts.
 * This file adds the remaining 6 states with day-of-rest requirements.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

export const californiaDayOfRest: Rule = createRule({
  id: "ca-day-of-rest",
  title: "California Day of Rest (1 day off per 7-day workweek)",
  jurisdiction: "CA",
  topic: "day_of_rest",
  effectiveFrom: "1937-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "shift.consecutive_days_worked", op: ">", value: 6 },
    ],
  },
  result: {
    type: "prohibition",
    prohibitedAction: "Scheduling an employee to work more than 6 consecutive days without a day of rest. Employee may voluntarily choose to work the 7th day. Exemptions for emergencies and certain industries.",
  },
  citations: [{ source: "Cal. Labor Code §551-552", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=LAB&sectionNum=551", section: "§551-552" }],
});

export const illinoisDayOfRest: Rule = createRule({
  id: "il-day-of-rest",
  title: "Illinois One Day Rest in Seven Act",
  jurisdiction: "IL",
  topic: "day_of_rest",
  effectiveFrom: "2023-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "IL" },
      { fact: "shift.consecutive_days_worked", op: ">", value: 6 },
    ],
  },
  result: {
    type: "prohibition",
    prohibitedAction: "Failing to provide at least 24 consecutive hours of rest in every consecutive 7-day period. Amended 2023: employer must also provide a meal period of 20 minutes for every 7.5-hour shift.",
  },
  citations: [{ source: "820 ILCS 140 (One Day Rest in Seven Act)", url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=1505", section: "820 ILCS 140/2" }],
});

export const massachusettsDayOfRest: Rule = createRule({
  id: "ma-day-of-rest",
  title: "Massachusetts Day of Rest (1 day off per 7 days)",
  jurisdiction: "MA",
  topic: "day_of_rest",
  effectiveFrom: "1994-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MA" },
      { fact: "shift.consecutive_days_worked", op: ">", value: 6 },
    ],
  },
  result: {
    type: "prohibition",
    prohibitedAction: "Requiring an employee to work more than 6 days in a calendar week. Manufacturing employees may not work more than 6 days in a calendar week.",
  },
  citations: [{ source: "MGL c.149 §48", url: "https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXXI/Chapter149/Section48", section: "§48-50" }],
});

export const minnesotaDayOfRest: Rule = createRule({
  id: "mn-day-of-rest",
  title: "Minnesota Day of Rest",
  jurisdiction: "MN",
  topic: "day_of_rest",
  effectiveFrom: "1939-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "MN" },
      { fact: "shift.consecutive_days_worked", op: ">", value: 6 },
    ],
  },
  result: {
    type: "warning",
    message: "Minnesota law provides that no employer may require an employee to work seven days in a row without providing a day of rest. Limited applicability — primarily enforced through local ordinance and common law.",
  },
  citations: [{ source: "Minn. Stat. §624.01 (historical blue law)", url: "https://www.revisor.mn.gov/statutes/cite/624.01", section: "§624.01" }],
});

export const northDakotaDayOfRest: Rule = createRule({
  id: "nd-day-of-rest",
  title: "North Dakota Day of Rest",
  jurisdiction: "ND",
  topic: "day_of_rest",
  effectiveFrom: "1975-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "ND" },
      { fact: "shift.consecutive_days_worked", op: ">", value: 6 },
    ],
  },
  result: {
    type: "warning",
    message: "North Dakota Sunday closing law limits certain commercial activities on Sunday. While not a pure day-of-rest employment mandate, it restricts retail/commercial scheduling on Sundays for covered establishments.",
  },
  citations: [{ source: "N.D. Cent. Code §12.1-30-01", url: "https://www.ndlegis.gov/cencode/t12-1c30.pdf", section: "§12.1-30-01" }],
});

export const wisconsinDayOfRest: Rule = createRule({
  id: "wi-day-of-rest",
  title: "Wisconsin One Day of Rest in Seven",
  jurisdiction: "WI",
  topic: "day_of_rest",
  effectiveFrom: "1939-01-01",
  status: "active",
  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "WI" },
      { fact: "shift.consecutive_days_worked", op: ">", value: 6 },
    ],
  },
  result: {
    type: "prohibition",
    prohibitedAction: "Requiring employees in a factory or mercantile establishment to work without at least 24 consecutive hours of rest in every 7 consecutive days. Exemptions for janitors, watchmen, and certain continuous-process industries.",
  },
  citations: [{ source: "Wis. Stat. §103.85", url: "https://docs.legis.wisconsin.gov/statutes/statutes/103/85", section: "§103.85" }],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_ADDITIONAL_DAY_OF_REST_RULES: readonly Rule[] = [
  californiaDayOfRest,
  illinoisDayOfRest,
  massachusettsDayOfRest,
  minnesotaDayOfRest,
  northDakotaDayOfRest,
  wisconsinDayOfRest,
];
