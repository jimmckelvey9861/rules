/**
 * Coverage Matrix — Tracks the status of every jurisdiction × topic cell.
 *
 * Three possible statuses:
 * - "has_rule"       — We have an encoded rule for this cell
 * - "no_law"         — Confirmed: no state/local law exists in this area
 * - "not_checked"    — We haven't verified yet (should be zero when complete)
 *
 * Sources:
 * - Rest breaks: DOL.gov "Minimum Paid Rest Period Requirements Under State Law"
 *   (Jan 2023) — only 9 states have laws: CA, CO, IL, KY, MN, NV, OR, VT, WA
 * - Meal breaks: DOL.gov "Minimum Length of Meal Period Required under State Law"
 *   (Jan 2023) — 21 states: CA, CO, CT, DE, IL, KY, ME, MD, MA, MN, NE, NV, NH, NY, ND, OR, RI, TN, VT, WA, WV
 * - Reporting time pay: Only 7 states have laws: CA, CT, DC, MA, NH, NJ, NY, OR, RI
 *   (some sources list DC/NJ as "show-up pay" variants)
 * - Predictive scheduling: State-level only OR; city-level: Chicago, LA, NYC, Philadelphia, San Francisco, Seattle
 * - Day of rest: CA, IL, MA, MN, ND, NY, WI, plus TX (retail) and NH (Sunday businesses)
 * - Hour limits: nurse / health care mandatory-overtime laws in 17 states (ANA list
 *   minus Missouri, which never enacted one), Maine's general 80-hour cap, Oregon
 *   manufacturing 55-hour week
 * - Split shift premium: Only CA, NY, NV have explicit split-shift/spread-of-hours laws
 * - Sick leave: ~18 states + DC mandate paid sick leave
 * - Overtime: Most states follow federal (40hr/week); ~12 states have additional rules
 * - Family/medical leave: ~13 states + DC have state FMLA-type laws
 * - WARN Act: ~20 states have mini-WARN acts
 * - Premium pay: NY spread-of-hours; limited applicability elsewhere
 * - Minimum wage: All 50 + DC (federal floor applies everywhere)
 * - Minor labor: All 50 + DC have child labor laws
 * - Lactation breaks: federal PUMP Act everywhere; ~29 states + DC add break-time or
 *   accommodation duties (Pregnant@Work 50-state survey, 2025). Space-only (IN) and
 *   public-employer-only (TX, LA, MT, NC) laws are not counted.
 * - Civic leave: voting leave in 28 states + DC (AbsenceSoft / Jackson Lewis 2026) plus
 *   jury-duty pay or shift limits in AL, CO, CT, DC, LA, MA, NE, NV, NY, TN, VA. Bare
 *   job protection for jury service exists in every state and is not a row of its own.
 */

export type CoverageStatus = "has_rule" | "no_law" | "not_checked";

export type Topic =
  | "day_of_rest"
  | "family_medical_leave"
  | "meal_break"
  | "minimum_wage"
  | "minor_labor"
  | "overtime"
  | "predictive_scheduling"
  | "premium_pay"
  | "reporting_time_pay"
  | "rest_break"
  | "sick_leave"
  | "split_shift_premium"
  | "warn_act"
  | "lactation_break"
  | "civic_leave"
  | "hour_limits";

export const ALL_TOPICS: Topic[] = [
  "day_of_rest",
  "family_medical_leave",
  "meal_break",
  "minimum_wage",
  "minor_labor",
  "overtime",
  "predictive_scheduling",
  "premium_pay",
  "reporting_time_pay",
  "rest_break",
  "sick_leave",
  "split_shift_premium",
  "warn_act",
  "lactation_break",
  "civic_leave",
  "hour_limits",
];

export const ALL_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL",
  "GA","HI","IA","ID","IL","IN","KS","KY","LA","MA",
  "MD","ME","MI","MN","MO","MS","MT","NC","ND","NE",
  "NH","NJ","NM","NV","NY","OH","OK","OR","PA","RI",
  "SC","SD","TN","TX","UT","VA","VT","WA","WI","WV","WY",
] as const;

export type StateCode = typeof ALL_STATES[number];

// ─── Research-based coverage data ──────────────────────────────────
// For each topic, list the states that HAVE a law (whether or not we've
// encoded the rule yet). States not listed = confirmed no law.

/**
 * Day of Rest — states requiring one day off per 7-day period.
 * Sources: State labor codes, NELP summaries.
 */
const STATES_WITH_DAY_OF_REST: StateCode[] = [
  "CA", // Cal. Labor Code §551-552
  "IL", // 820 ILCS 140 (One Day Rest in Seven Act)
  "MA", // MGL c.149 §48
  "MN", // Minn. Stat. §624.01 (limited)
  "ND", // N.D. Cent. Code §12.1-30-01 (blue law, limited)
  "NY", // NY Labor Law §161
  "WI", // Wis. Stat. §103.85
  "TX", // Tex. Labor Code §52.001 (retail employees only)
  "NH", // RSA 275:33 (designated day of rest for Sunday businesses)
];

/**
 * Hour limits — statutory caps on mandatory overtime or total hours for adults.
 * Mostly nurse / health care facility laws (ANA count: 18 states incl. ME's
 * general cap); Missouri is often listed but has only introduced bills.
 * Plus Maine's general 80-hours-of-overtime-in-two-weeks cap and Oregon's
 * 55-hour manufacturing week (ORS 652.020).
 */
const STATES_WITH_HOUR_LIMITS: StateCode[] = [
  "AK", // AS 18.20.400 (nurses, 2010)
  "CA", // Wage Order 5 §3(B)(8) (health care, 12 hours in 24)
  "CT", // CGS §19a-490l (hospital nurses, 2005)
  "IL", // 210 ILCS 85/10.9 (hospital nurses, 2006)
  "MA", // MGL c.111 §226 (hospital nurses, 16-hour cap, 2012)
  "MD", // Lab. & Empl. §3-421 (nurses, 2002)
  "ME", // 26 MRS §603 (all employees 80 OT hours / 2 weeks; nurses 12 hours)
  "MN", // Minn. Stat. §181.275 (nurses, 2002)
  "NH", // RSA 275:67 (nurses, 2008)
  "NJ", // N.J.S.A. 34:11-56a31 (health care facility hourly staff, 2002)
  "NY", // Labor Law §167 (nurses, 2009)
  "OR", // ORS 441.166 (hospital nurses); ORS 652.020 (manufacturing 55 hours)
  "PA", // Act 102 of 2008 (health care facility direct-care staff)
  "RI", // RIGL §23-17.20 (hospital nurses and CNAs, 2008)
  "TX", // Health & Safety Code ch. 258 (hospital nurses, 2009)
  "WA", // RCW 49.28.140 (health care facility employees, 2002)
  "WV", // W. Va. Code §21-5F (hospital nurses, 16-hour cap, 2004)
];

/**
 * Family/Medical Leave — states with their own FMLA-equivalent or expansion.
 * (Beyond federal FMLA which applies everywhere with 50+ employees.)
 */
const STATES_WITH_FAMILY_MEDICAL_LEAVE: StateCode[] = [
  "CA", // CFRA (California Family Rights Act)
  "CO", // FAMLI Act (2024)
  "CT", // CT Paid Leave (2022)
  "DC", // DC FMLA + Universal Paid Leave
  "DE", // Healthy Delaware Families Act (2026 benefits start)
  "MA", // MA PFML (2021)
  "MD", // MD FAMLI (2026 benefits start)
  "MN", // MN Paid Leave (2026 benefits start)
  "NJ", // NJ Family Leave Act + TDI
  "NY", // NY Paid Family Leave
  "OR", // Oregon Paid Leave (2023)
  "RI", // RI TCI (Temporary Caregiver Insurance)
  "WA", // WA Paid Family & Medical Leave (2020)
];

/**
 * Meal Breaks — states with mandatory meal period laws for adults.
 * Source: DOL.gov "Minimum Length of Meal Period Required under State Law" (Jan 2023)
 */
const STATES_WITH_MEAL_BREAK: StateCode[] = [
  "CA", "CO", "CT", "DE", "IL", "KY", "MA", "MD", "ME",
  "MN", "ND", "NE", "NH", "NV", "NY", "OR", "RI", "TN",
  "VT", "WA", "WV",
];

/**
 * Minimum Wage — all states (federal floor applies; most have own statute).
 */
const STATES_WITH_MINIMUM_WAGE: StateCode[] = [...ALL_STATES];

/**
 * Minor Labor — all states have child labor laws.
 */
const STATES_WITH_MINOR_LABOR: StateCode[] = [...ALL_STATES];

/**
 * Overtime — states with rules BEYOND the standard federal 40hr/week threshold.
 * This includes daily overtime, industry-specific OT, different thresholds, etc.
 * States that simply mirror federal FLSA overtime are listed as "no_law" (federal covers them).
 */
const STATES_WITH_OVERTIME: StateCode[] = [
  "AK", // Daily OT after 8 hours
  "CA", // Daily OT after 8, double after 12, 7th day
  "CO", // Daily OT after 12 hours (COMPS Order)
  "CT", // OT after 40 (same as federal but state-enforced)
  "DC", // OT after 40 (state-enforced)
  "HI", // OT after 40 (state-enforced, different exemptions)
  "MD", // OT after 40 (state-enforced)
  "MN", // OT after 48 hours (different threshold!)
  "NJ", // OT after 40 (state-enforced)
  "NV", // Daily OT after 8 hours (if rate < 1.5x min wage)
  "NY", // OT after 40 (state-enforced, hospitality special rules)
  "OR", // OT after 40 + manufacturing daily OT
  "VA", // OT after 40 (state-enforced, 2021 VOWA)
  "WA", // OT after 40 (state-enforced)
  "KY", // Seventh-day overtime (KRS 337.050)
  "ME", // Exempt salary threshold 3,000x minimum wage (26 MRS §663)
];

/**
 * Predictive Scheduling — state-level laws only.
 * City-level (Chicago, LA, NYC, Philadelphia, San Francisco, Seattle) are
 * tracked separately as local jurisdictions, not in this state matrix.
 * Only Oregon has a statewide predictive scheduling law.
 */
const STATES_WITH_PREDICTIVE_SCHEDULING: StateCode[] = [
  "OR", // Oregon Fair Work Practices Act (2018)
  "VT", // 21 V.S.A. §309 right to request flexible working arrangements (2014)
  "NH", // RSA 275:37-b no retaliation for requesting a flexible schedule (2016)
];

/**
 * Premium Pay — spread-of-hours, call-in pay, or similar premium requirements.
 * Distinct from reporting time pay (which is about showing up and being sent home).
 */
const STATES_WITH_PREMIUM_PAY: StateCode[] = [
  "NY", // Spread-of-hours premium (>10 hour span = extra hour at min wage)
];

/**
 * Reporting Time Pay — minimum pay when employee reports but is sent home.
 * Source: State labor codes and DOL summaries.
 */
const STATES_WITH_REPORTING_TIME_PAY: StateCode[] = [
  "CA", // IWC Orders — 2 hours or half scheduled shift
  "CT", // Conn. Gen. Stat. §31-62 — 4 hours at min wage
  "DC", // DC Mun. Regs. 7-907 — 4 hours
  "MA", // 454 CMR 27.04 — 3 hours at min wage
  "NH", // RSA §275:43-a — 2 hours
  "NJ", // N.J.A.C. 12:56-5.5 — 1 hour at min wage
  "NY", // 12 NYCRR 142-2.3 — varies by industry
  "OR", // OAR 839-020-0030 — half of scheduled shift
  "RI", // R.I. Gen. Laws §28-12-3.2 — 3 hours at min wage
];

/**
 * Rest Breaks — states with mandatory paid rest period requirements.
 * Source: DOL.gov "Minimum Paid Rest Period Requirements Under State Law" (Jan 2023)
 * Footnote 1: "States not listed do not require paid rest periods."
 */
const STATES_WITH_REST_BREAK: StateCode[] = [
  "CA", // 10 min per 4 hours
  "CO", // 10 min per 4 hours
  "IL", // Hotel room attendants only (limited)
  "KY", // 10 min per 4 hours
  "MN", // Adequate rest period per 4 hours
  "NV", // 10 min per 4 hours
  "OR", // 10 min per 4 hours
  "VT", // Reasonable opportunities
  "WA", // 10 min per 4 hours
];

/**
 * Sick Leave — states with mandatory paid sick leave accrual.
 * Source: A Better Balance, NCSL, state statutes.
 */
const STATES_WITH_SICK_LEAVE: StateCode[] = [
  "AZ", // Prop 206 (2017)
  "CA", // Healthy Workplaces, Healthy Families Act
  "CO", // Healthy Families and Workplaces Act (2021)
  "CT", // Paid Sick Leave (2012, service workers; expanded 2025)
  "DC", // Accrued Sick and Safe Leave Act
  "IL", // Paid Leave for All Workers Act (2024)
  "MA", // Earned Sick Time (2015)
  "MD", // Healthy Working Families Act (2018)
  "ME", // Earned Paid Leave (2021)
  "MI", // Earned Sick Time Act (2019)
  "MN", // Earned Sick and Safe Time (2024)
  "NJ", // Earned Sick Leave (2018)
  "NM", // Healthy Workplaces Act (2022)
  "NV", // SB 312 Paid Leave (2020)
  "NY", // NY Paid Sick Leave (2020)
  "OR", // Oregon Sick Time (2016)
  "RI", // Healthy and Safe Families and Workplaces Act (2018)
  "VT", // Earned Sick Time (2017)
  "WA", // Paid Sick Leave (2018)
];

/**
 * Split Shift Premium — states requiring extra pay for split shifts.
 * Very few states have this.
 */
const STATES_WITH_SPLIT_SHIFT_PREMIUM: StateCode[] = [
  "CA", // IWC Orders — 1 hour at min wage for split shift
  "NV", // NRS 608.160 — premium for spread > 10 hours (limited)
  "NY", // Spread-of-hours (overlaps with premium_pay; included here too)
];

/**
 * WARN Act — states with mini-WARN acts (plant closing/mass layoff notice).
 * Source: NCSL, individual state statutes.
 */
const STATES_WITH_WARN_ACT: StateCode[] = [
  "CA", // Cal-WARN (Cal. Labor Code §1400-1408)
  "CT", // Conn. Gen. Stat. §31-51n
  "GA", // Ga. Code §34-6-1 (limited)
  "HI", // HRS §394B
  "IL", // 820 ILCS 65 (IL WARN)
  "IA", // Iowa Code §84C
  "KS", // K.S.A. §44-616
  "MA", // MGL c.151A §71A-71G (limited)
  "MD", // Md. Code Lab. & Empl. §11-301
  "ME", // 26 MRSA §625-B
  "MI", // MIOSHA (limited)
  "MN", // Minn. Stat. §116L.976
  "NH", // RSA §275-F
  "NJ", // NJ WARN (N.J.S.A. 34:21-1)
  "NY", // NY WARN (Labor Law §860)
  "OH", // ORC §4141.28 (limited)
  "OR", // ORS §285B.500 (limited)
  "PA", // 73 P.S. §1851 (limited)
  "SC", // S.C. Code §41-1-40 (limited)
  "TN", // Tenn. Code §50-1-602
  "WI", // Wis. Stat. §109.07
];

// ─── Build the matrix ──────────────────────────────────────────────

/**
 * Lactation breaks — states with a break-time or accommodation duty for private
 * employers beyond the federal PUMP Act (29 U.S.C. §218d).
 */
const STATES_WITH_LACTATION_BREAK: StateCode[] = [
  "AR", "CA", "CO", "CT", "DC", "DE", "GA", "HI", "IL", "KY", "MA", "ME", "MN", "MS", "NE",
  "NH", "NJ", "NM", "NV", "NY", "OK", "OR", "RI", "SC", "TN", "UT", "VA", "VT", "WA",
];

/**
 * Civic leave — states with a voting-leave statute, or a jury-duty statute that
 * requires pay or limits the shifts an employer may require around service.
 */
const STATES_WITH_CIVIC_LEAVE: StateCode[] = [
  // voting leave
  "AK", "AL", "AR", "AZ", "CA", "CO", "DC", "GA", "IA", "IL", "KS", "KY", "MA", "MD", "MN", "MO",
  "NE", "NM", "NV", "NY", "OH", "OK", "SD", "TN", "TX", "UT", "WI", "WV", "WY",
  // jury duty pay or shift limits (not already listed)
  "CT", "LA", "VA",
];

const TOPIC_TO_STATES: Record<Topic, readonly StateCode[]> = {
  day_of_rest: STATES_WITH_DAY_OF_REST,
  family_medical_leave: STATES_WITH_FAMILY_MEDICAL_LEAVE,
  meal_break: STATES_WITH_MEAL_BREAK,
  minimum_wage: STATES_WITH_MINIMUM_WAGE,
  minor_labor: STATES_WITH_MINOR_LABOR,
  overtime: STATES_WITH_OVERTIME,
  predictive_scheduling: STATES_WITH_PREDICTIVE_SCHEDULING,
  premium_pay: STATES_WITH_PREMIUM_PAY,
  reporting_time_pay: STATES_WITH_REPORTING_TIME_PAY,
  rest_break: STATES_WITH_REST_BREAK,
  sick_leave: STATES_WITH_SICK_LEAVE,
  split_shift_premium: STATES_WITH_SPLIT_SHIFT_PREMIUM,
  warn_act: STATES_WITH_WARN_ACT,
  lactation_break: STATES_WITH_LACTATION_BREAK,
  civic_leave: STATES_WITH_CIVIC_LEAVE,
  hour_limits: STATES_WITH_HOUR_LIMITS,
};

// ─── Local (City/County) Coverage ──────────────────────────────────
// Cities only have a subset of topics that are relevant at the local level.
// Topics that are exclusively state/federal (WARN, FMLA, minor labor, overtime,
// day of rest) are marked "no_law" for all cities.

/**
 * Topics that can exist at the city/county level.
 */
const LOCAL_RELEVANT_TOPICS: Topic[] = [
  "minimum_wage",
  "sick_leave",
  "predictive_scheduling",
  "meal_break",
  "rest_break",
  "reporting_time_pay",
  "premium_pay",
  "split_shift_premium",
];

/**
 * All local jurisdictions tracked in the system.
 * These match the jurisdiction strings used in rules.
 */
export const ALL_LOCALS = [
  // California cities and counties
  "Belmont", "Berkeley", "Daly City", "Emeryville", "Fremont", "Half Moon Bay", "Hayward",
  "Los Angeles", "Los Angeles County", "Malibu", "Novato", "Pasadena", "Redwood City",
  "Richmond", "San Carlos", "San Francisco", "San Jose", "Santa Clara",
  "Sunnyvale", "West Hollywood",
  // Colorado cities
  "Boulder", "Denver",
  // Illinois cities
  "Chicago", "Evanston",
  // Maryland counties
  "Montgomery County",
  // Minnesota cities
  "Minneapolis",
  // New York cities
  "New York City",
  // Oregon cities
  "Portland Metro Area",
  // Pennsylvania cities
  "Philadelphia",
  // Washington cities
  "Seattle",
] as const;

export type LocalCode = typeof ALL_LOCALS[number];

/**
 * For each topic, which LOCAL jurisdictions have a law.
 * Cities not listed for a relevant topic = confirmed no local law.
 * Cities listed for a non-relevant topic = impossible (those topics don't apply locally).
 *
 * Sources: City ordinance databases, NELP local policy tracker, A Better Balance.
 */
const LOCALS_WITH_MINIMUM_WAGE: LocalCode[] = [
  // California cities and counties (all have local min wage ordinances)
  "Belmont", "Berkeley", "Daly City", "Emeryville", "Fremont", "Half Moon Bay", "Hayward",
  "Los Angeles", "Los Angeles County", "Malibu", "Novato", "Pasadena", "Redwood City",
  "Richmond", "San Carlos", "San Francisco", "San Jose", "Santa Clara",
  "Sunnyvale", "West Hollywood",
  // Colorado
  "Denver",
  // Illinois
  "Chicago",
  // Maryland
  "Montgomery County",
  // Minnesota
  "Minneapolis",
  // New York
  "New York City",
  // Oregon
  "Portland Metro Area",
  // Washington
  "Seattle",
  // Note: Boulder has a CO min wage (no separate local), Philadelphia has no local min wage
];

const LOCALS_WITH_SICK_LEAVE: LocalCode[] = [
  // Cities that passed their own paid sick leave ordinances
  // (distinct from or predating their state's law)
  "San Francisco",    // SF Paid Sick Leave Ordinance (2007, first in US)
  "Seattle",          // Seattle Paid Sick & Safe Time (2012)
  "New York City",    // NYC Earned Safe & Sick Time Act (2014, expanded 2020)
  "Los Angeles",      // LA Paid Sick Leave (2016)
  "Chicago",          // Chicago Paid Leave & Paid Sick Leave (2024)
  "Philadelphia",     // Promoting Healthy Families & Workplaces (2015)
  "Minneapolis",      // Minneapolis Sick & Safe Time (2017)
  "Montgomery County", // Earned Sick & Safe Leave (2016)
  "Denver",           // Denver HFWA (follows CO state, local enforcement)
  "Berkeley",         // Berkeley Paid Sick Leave Ordinance (2017)
  "Emeryville",       // Emeryville Paid Sick Leave Ordinance (2015)
  // Note: Portland covered by OR state law (no separate local ordinance needed)
  // Note: San Jose, Santa Clara, etc. covered by CA state law (no separate local)
];

const LOCALS_WITH_PREDICTIVE_SCHEDULING: LocalCode[] = [
  "New York City",    // Fair Workweek Law (fast food + retail, 2017)
  "San Francisco",    // Formula Retail Employee Rights (2015)
  "Seattle",          // Secure Scheduling Ordinance (2017)
  "Chicago",          // Fair Workweek Ordinance (2020)
  "Philadelphia",     // Fair Workweek Employment Standards (2020)
  "Los Angeles",      // Fair Work Week Ordinance (2023)
  "Emeryville",       // Fair Workweek Ordinance (2017)
  "San Jose",         // Opportunity to Work Ordinance (2017, offer of hours only)
  "Berkeley",         // Fair Workweek Ordinance (2024)
  "Evanston",         // Fair Workweek Ordinance (2024)
  "Los Angeles County", // Fair Workweek Ordinance, unincorporated areas (2025)
];

// No cities currently have local meal break, rest break, reporting time,
// premium pay, or split shift laws beyond their state's requirements.
const LOCALS_WITH_MEAL_BREAK: LocalCode[] = [];
const LOCALS_WITH_REST_BREAK: LocalCode[] = [];
const LOCALS_WITH_REPORTING_TIME_PAY: LocalCode[] = [];
const LOCALS_WITH_PREMIUM_PAY: LocalCode[] = [];
const LOCALS_WITH_SPLIT_SHIFT_PREMIUM: LocalCode[] = [];

const LOCAL_TOPIC_TO_CITIES: Partial<Record<Topic, readonly LocalCode[]>> = {
  minimum_wage: LOCALS_WITH_MINIMUM_WAGE,
  sick_leave: LOCALS_WITH_SICK_LEAVE,
  predictive_scheduling: LOCALS_WITH_PREDICTIVE_SCHEDULING,
  meal_break: LOCALS_WITH_MEAL_BREAK,
  rest_break: LOCALS_WITH_REST_BREAK,
  reporting_time_pay: LOCALS_WITH_REPORTING_TIME_PAY,
  premium_pay: LOCALS_WITH_PREMIUM_PAY,
  split_shift_premium: LOCALS_WITH_SPLIT_SHIFT_PREMIUM,
};

// ─── Types & Builders ──────────────────────────────────────────────

export interface CoverageCell {
  status: CoverageStatus;
}

export type CoverageMatrix = Record<string, Record<Topic, CoverageCell>>;

/**
 * Build the coverage matrix for both states and local jurisdictions.
 */
/**
 * Maps a taxonomy code (topic or sub-topic) to the coverage-matrix row it is
 * tracked under. The matrix keeps the 13 historical rows, which are coarser
 * than the taxonomy in places (tipped wages sit under minimum wage) and finer
 * in others (pay.premium splits into reporting time, split shift and premium
 * pay; the obligation decides). Legacy row names pass through unchanged.
 */
export function matrixTopicFor(topic: string, obligation?: string): Topic | undefined {
  if ((ALL_TOPICS as string[]).includes(topic)) return topic as Topic;
  const topicCode = topic.split(".").slice(0, 2).join(".");
  switch (topicCode) {
    case "pay.minimum_wage":
    case "pay.tipped": return "minimum_wage";
    case "pay.overtime": return "overtime";
    case "pay.premium":
      if (topic === "pay.premium.reporting_time" || topic === "pay.premium.on_call") return "reporting_time_pay";
      if (topic === "pay.premium.split_shift") return obligation === "premium.spread_of_hours" ? "premium_pay" : "split_shift_premium";
      return "premium_pay";
    case "sched.meal_break": return "meal_break";
    case "sched.rest_break": return topic === "sched.rest_break.lactation" ? "lactation_break" : "rest_break";
    case "sched.predictive": return "predictive_scheduling";
    case "sched.shift_structure":
      return topic === "sched.shift_structure.day_of_rest" ? "day_of_rest" : "predictive_scheduling";
    case "sched.hour_limits": return "hour_limits";
    case "leave.sick": return "sick_leave";
    case "leave.family_medical": return "family_medical_leave";
    case "leave.civic_emergency": return "civic_leave";
    case "minor.labor": return "minor_labor";
    case "sep.warn": return "warn_act";
    default: return undefined;
  }
}

/** Taxonomy topic code -> the matrix rows its rules can land on (for the UI's coverage lookup). */
export const MATRIX_ROWS_BY_TOPIC_CODE: Record<string, readonly Topic[]> = {
  "pay.minimum_wage": ["minimum_wage"],
  "pay.tipped": ["minimum_wage"],
  "pay.overtime": ["overtime"],
  "pay.premium": ["reporting_time_pay", "split_shift_premium", "premium_pay"],
  "sched.meal_break": ["meal_break"],
  "sched.rest_break": ["rest_break", "lactation_break"],
  "sched.predictive": ["predictive_scheduling"],
  "sched.shift_structure": ["day_of_rest", "predictive_scheduling"],
  "sched.hour_limits": ["hour_limits"],
  "leave.sick": ["sick_leave"],
  "leave.family_medical": ["family_medical_leave"],
  "leave.civic_emergency": ["civic_leave"],
  "minor.labor": ["minor_labor"],
  "sep.warn": ["warn_act"],
};

export function buildCoverageMatrix(
  encodedRules: readonly { jurisdiction: string; topic: string; result?: { obligation: string } }[]
): CoverageMatrix {
  const encoded = new Set<string>();
  for (const r of encodedRules) {
    const row = matrixTopicFor(r.topic, r.result?.obligation);
    if (row) encoded.add(`${r.jurisdiction}:${row}`);
  }

  const matrix = {} as CoverageMatrix;

  // ── States ──
  for (const state of ALL_STATES) {
    matrix[state] = {} as Record<Topic, CoverageCell>;
    for (const topic of ALL_TOPICS) {
      const lawExists = TOPIC_TO_STATES[topic].includes(state);
      const ruleEncoded = encoded.has(`${state}:${topic}`);
      if (ruleEncoded) {
        matrix[state][topic] = { status: "has_rule" };
      } else if (lawExists) {
        matrix[state][topic] = { status: "not_checked" };
      } else {
        matrix[state][topic] = { status: "no_law" };
      }
    }
  }

  // ── Local jurisdictions ──
  for (const local of ALL_LOCALS) {
    matrix[local] = {} as Record<Topic, CoverageCell>;
    for (const topic of ALL_TOPICS) {
      const isRelevantLocally = LOCAL_RELEVANT_TOPICS.includes(topic);
      if (!isRelevantLocally) {
        // Topics like WARN, FMLA, minor labor don't apply at city level
        matrix[local][topic] = { status: "no_law" };
        continue;
      }
      const citiesWithLaw = LOCAL_TOPIC_TO_CITIES[topic] || [];
      const lawExists = (citiesWithLaw as readonly string[]).includes(local);
      const ruleEncoded = encoded.has(`${local}:${topic}`);
      if (ruleEncoded) {
        matrix[local][topic] = { status: "has_rule" };
      } else if (lawExists) {
        matrix[local][topic] = { status: "not_checked" };
      } else {
        matrix[local][topic] = { status: "no_law" };
      }
    }
  }

  return matrix;
}

/**
 * Summary stats for the coverage matrix.
 */
export interface CoverageSummary {
  total_cells: number;
  has_rule: number;
  no_law: number;
  not_checked: number;
  coverage_percent: number; // (has_rule + no_law) / total_cells * 100
}

export function summarizeCoverage(matrix: CoverageMatrix): CoverageSummary {
  let has_rule = 0;
  let no_law = 0;
  let not_checked = 0;

  const allJurisdictions = [...ALL_STATES, ...ALL_LOCALS];
  for (const jurisdiction of allJurisdictions) {
    for (const topic of ALL_TOPICS) {
      const cell = matrix[jurisdiction]?.[topic];
      if (!cell) continue;
      if (cell.status === "has_rule") has_rule++;
      else if (cell.status === "no_law") no_law++;
      else not_checked++;
    }
  }

  const total_cells = allJurisdictions.length * ALL_TOPICS.length;
  const coverage_percent = Math.round(((has_rule + no_law) / total_cells) * 1000) / 10;

  return { total_cells, has_rule, no_law, not_checked, coverage_percent };
}
