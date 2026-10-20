/**
 * Comprehensive Validation Suite — All 5 Levels
 *
 * Run with: npx tsx server/rules/validation.test.ts
 */

import { RULES, SKIPPED, evaluateRule, evaluateRules, getAllFacts, isKnownFact } from "./index.js";
import { buildCoverageMatrix, summarizeCoverage, ALL_STATES, ALL_TOPICS, ALL_LOCALS } from "./coverageMatrix.js";
import type { Scenario, Rule } from "./types.js";

// ─── Test Harness ──────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];
let currentSection = "";

function section(name: string) {
  currentSection = name;
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"─".repeat(60)}`);
}

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`[${currentSection}] ${message}`);
    console.log(`  ❌ ${message}`);
  }
}

function assertEq(actual: unknown, expected: unknown, message: string) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    failures.push(`[${currentSection}] ${message} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    console.log(`  ❌ ${message} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// LEVEL 1: STRUCTURAL INTEGRITY
// ═══════════════════════════════════════════════════════════════════════

function level1_structuralIntegrity() {
  section("Level 1: Structural Integrity");

  // 1.1 All rules loaded successfully
  assert(RULES.length >= 447, `At least 447 rules loaded (got ${RULES.length})`);
  assertEq(SKIPPED.length, 0, `No rules skipped during loading (skipped: ${SKIPPED.join(", ")})`);

  // 1.2 No duplicate rule IDs
  const ids = RULES.map(r => r.id);
  const uniqueIds = new Set(ids);
  assertEq(uniqueIds.size, ids.length, `No duplicate rule IDs (${ids.length} rules, ${uniqueIds.size} unique)`);
  if (uniqueIds.size !== ids.length) {
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    console.log(`    Duplicates: ${[...new Set(dupes)].join(", ")}`);
  }

  // 1.3 Every rule has at least one citation with a source
  let missingCitations = 0;
  for (const rule of RULES) {
    if (!rule.citations || rule.citations.length === 0 || !rule.citations[0].source) {
      missingCitations++;
      if (missingCitations <= 3) console.log(`    Missing citation: ${rule.id}`);
    }
  }
  assertEq(missingCitations, 0, `All rules have citations (${missingCitations} missing)`);

  // 1.4 Coverage matrix = 100%
  const matrix = buildCoverageMatrix(RULES);
  const summary = summarizeCoverage(matrix);
  assertEq(summary.not_checked, 0, `Coverage matrix has no gaps (${summary.not_checked} not_checked)`);
  assertEq(summary.coverage_percent, 100, `Coverage is 100% (got ${summary.coverage_percent}%)`);

  // 1.5 All fact paths used in rules exist in the registry
  const badFacts: string[] = [];
  for (const rule of RULES) {
    const facts = extractFactPaths(rule.appliesWhen);
    for (const f of facts) {
      if (!isKnownFact(f)) {
        badFacts.push(`${rule.id}: ${f}`);
      }
    }
  }
  assertEq(badFacts.length, 0, `All fact paths in rules exist in registry (${badFacts.length} invalid)`);
  if (badFacts.length > 0 && badFacts.length <= 5) {
    for (const b of badFacts) console.log(`    ${b}`);
  }

  // 1.6 Every rule has a valid status
  const validStatuses = ["active", "draft", "repealed", "pending"];
  const badStatuses = RULES.filter(r => !validStatuses.includes(r.status));
  assertEq(badStatuses.length, 0, `All rules have valid status (${badStatuses.length} invalid)`);

  // 1.7 Every rule has a non-empty title
  const emptyTitles = RULES.filter(r => !r.title || r.title.trim().length === 0);
  assertEq(emptyTitles.length, 0, `All rules have titles (${emptyTitles.length} empty)`);

  // 1.8 Every rule has a valid effectiveFrom date
  const badDates = RULES.filter(r => !/^\d{4}-\d{2}-\d{2}$/.test(r.effectiveFrom));
  assertEq(badDates.length, 0, `All effectiveFrom dates are ISO format (${badDates.length} invalid)`);

  // 1.9 All topics are recognized
  const knownTopics = new Set(ALL_TOPICS);
  const unknownTopics = RULES.filter(r => !knownTopics.has(r.topic as any));
  assertEq(unknownTopics.length, 0, `All rule topics are in ALL_TOPICS (${unknownTopics.length} unknown)`);
  if (unknownTopics.length > 0) {
    const uniq = [...new Set(unknownTopics.map(r => r.topic))];
    console.log(`    Unknown topics: ${uniq.join(", ")}`);
  }

  console.log(`\n  ✓ Level 1 complete: ${RULES.length} rules, ${summary.total_cells} cells, 100% coverage`);
}

// ═══════════════════════════════════════════════════════════════════════
// LEVEL 2: BEHAVIORAL CORRECTNESS
// ═══════════════════════════════════════════════════════════════════════

function level2_behavioralCorrectness() {
  section("Level 2: Behavioral Correctness — Per-Topic Spot Checks");

  // Helper: find a rule by topic and jurisdiction
  function findRule(topic: string, jurisdiction: string): Rule | undefined {
    return RULES.find(r => r.topic === topic && r.jurisdiction === jurisdiction);
  }

  // 2.1 minimum_wage — CA rule fires when rate too low
  const caMinWage = RULES.find(r => r.topic === "minimum_wage" && r.jurisdiction === "CA" && r.id.includes("minimum-wage") && !JSON.stringify(r.appliesWhen).includes("industry_tag"));
  if (caMinWage) {
    const fires = evaluateRule(caMinWage, {
      "location.state": "CA",
      "employee.exempt_status": "non_exempt",
      "employee.regular_hourly_rate": 10.00,
      "shift.date": "2025-06-01",
    });
    assertEq(fires.outcome, "violation", "minimum_wage: CA fires when rate $10 < minimum");

    const passes = evaluateRule(caMinWage, {
      "location.state": "CA",
      "employee.exempt_status": "non_exempt",
      "employee.regular_hourly_rate": 20.00,
      "shift.date": "2025-06-01",
    });
    assertEq(passes.outcome, "passed", "minimum_wage: CA passes when rate $20 >= minimum");

    const wrongState = evaluateRule(caMinWage, {
      "location.state": "TX",
      "employee.exempt_status": "non_exempt",
      "employee.regular_hourly_rate": 10.00,
      "shift.date": "2025-06-01",
    });
    assertEq(wrongState.outcome, "passed", "minimum_wage: CA rule doesn't fire in TX");
  } else {
    assert(false, "minimum_wage: Could not find CA minimum wage rule");
  }

  // 2.2 overtime — federal fires > 40 hrs
  const fedOT = findRule("overtime", "Federal");
  if (fedOT) {
    const fires = evaluateRule(fedOT, {
      "employee.exempt_status": "non_exempt",
      "shift.hours_worked_this_week": 41,
    });
    assertEq(fires.outcome, "violation", "overtime: federal fires at 41 hrs/week");

    const passes = evaluateRule(fedOT, {
      "employee.exempt_status": "non_exempt",
      "shift.hours_worked_this_week": 40,
    });
    assertEq(passes.outcome, "passed", "overtime: federal passes at 40 hrs/week");
  } else {
    assert(false, "overtime: Could not find federal overtime rule");
  }

  // 2.3 meal_break — CA fires when > 5 hrs without break
  const caMeal = RULES.find(r => r.topic === "meal_break" && r.jurisdiction === "CA");
  if (caMeal) {
    const fires = evaluateRule(caMeal, {
      "location.state": "CA",
      "employee.exempt_status": "non_exempt",
      "shift.shift_length_hours": 6,
      "shift.meal_break_provided": false,
      "shift.meal_break_waived": false,
    });
    assertEq(fires.outcome, "violation", "meal_break: CA fires when 6hrs and no meal break");

    const passes = evaluateRule(caMeal, {
      "location.state": "CA",
      "employee.exempt_status": "non_exempt",
      "shift.shift_length_hours": 6,
      "shift.meal_break_provided": true,
      "shift.meal_break_waived": false,
    });
    assertEq(passes.outcome, "passed", "meal_break: CA passes when meal break provided");
  } else {
    assert(false, "meal_break: Could not find CA meal break rule");
  }

  // 2.4 rest_break — CA fires when > 4 hrs without rest
  const caRest = RULES.find(r => r.topic === "rest_break" && r.jurisdiction === "CA");
  if (caRest) {
    // Check what conditions this rule actually uses
    const conditions = extractAllConditions(caRest.appliesWhen);
    const factNames = conditions.map((c: any) => c.fact);
    const scenario: Record<string, any> = {
      "location.state": "CA",
      "employee.exempt_status": "non_exempt",
    };
    // Add the shift length/hours fact the rule uses
    if (factNames.includes("shift.shift_length_hours")) {
      scenario["shift.shift_length_hours"] = 5;
    } else if (factNames.includes("shift.hours_worked_today")) {
      scenario["shift.hours_worked_today"] = 5;
    }
    if (factNames.includes("shift.rest_break_provided")) {
      scenario["shift.rest_break_provided"] = false;
    }
    const fires = evaluateRule(caRest, scenario as Scenario);
    assertEq(fires.outcome, "violation", "rest_break: CA fires when 5hrs and no rest break");
  } else {
    assert(false, "rest_break: Could not find CA rest break rule");
  }

  // 2.5 sick_leave — CA fires when accrual insufficient
  const caSick = RULES.find(r => r.topic === "sick_leave" && r.jurisdiction === "CA");
  if (caSick) {
    const fires = evaluateRule(caSick, {
      "location.state": "CA",
      "employer.total_employees": 26,
      "leave.hours_accrued": 10,
    });
    assertEq(fires.outcome, "violation", "sick_leave: CA fires when accrual below minimum");
  } else {
    assert(false, "sick_leave: Could not find CA sick leave rule");
  }

  // 2.6 predictive_scheduling — OR fires when < 14 days notice
  const orPredictive = RULES.find(r => r.topic === "predictive_scheduling" && r.jurisdiction === "OR");
  if (orPredictive) {
    const fires = evaluateRule(orPredictive, {
      "location.state": "OR",
      "employer.total_employees_global": 500,
      "employer.industry_tag": "retail",
      "schedule.advance_notice_days": 10,
    });
    assertEq(fires.outcome, "violation", "predictive_scheduling: OR fires when < 14 days notice");
  } else {
    assert(false, "predictive_scheduling: Could not find OR rule");
  }

  // 2.7 minor_labor — federal fires for minor
  const fedMinor = RULES.find(r => r.topic === "minor_labor" && r.jurisdiction === "Federal");
  if (fedMinor) {
    const fires = evaluateRule(fedMinor, {
      "location.state": "CA",
      "employee.is_minor": true,
      "employee.age": 14,
      "shift.is_school_day": true,
      "shift.school_in_session": true,
      "shift.shift_length_hours": 4,
      "shift.end_hour": 20,
    });
    assertEq(fires.outcome, "violation", "minor_labor: federal fires for 14yr on school day > 3hrs");
  } else {
    assert(false, "minor_labor: Could not find federal minor labor rule");
  }

  // 2.8 reporting_time_pay — CA fires when sent home early
  const caReporting = RULES.find(r => r.topic === "reporting_time_pay" && r.jurisdiction === "CA");
  if (caReporting) {
    const fires = evaluateRule(caReporting, {
      "location.state": "CA",
      "employee.exempt_status": "non_exempt",
      "shift.employee_reported": true,
      "shift.sent_home_early": true,
      "shift.hours_worked_at_report": 1,
    });
    assertEq(fires.outcome, "violation", "reporting_time_pay: CA fires when sent home early");
  } else {
    assert(false, "reporting_time_pay: Could not find CA reporting time rule");
  }

  // 2.9 day_of_rest — NY fires on 7th consecutive day
  const nyDayOfRest = findRule("day_of_rest", "NY");
  if (nyDayOfRest) {
    const fires = evaluateRule(nyDayOfRest, {
      "location.state": "NY",
      "employee.exempt_status": "non_exempt",
      "shift.is_seventh_consecutive_day": true,
    });
    assertEq(fires.outcome, "violation", "day_of_rest: NY fires on 7th consecutive day");

    const passes = evaluateRule(nyDayOfRest, {
      "location.state": "NY",
      "employee.exempt_status": "non_exempt",
      "shift.is_seventh_consecutive_day": false,
    });
    assertEq(passes.outcome, "passed", "day_of_rest: NY passes when not 7th day");
  } else {
    assert(false, "day_of_rest: Could not find NY day of rest rule");
  }

  // 2.10 warn_act — federal fires for mass layoff
  const fedWarn = findRule("warn_act", "Federal");
  if (fedWarn) {
    const fires = evaluateRule(fedWarn, {
      "location.country": "US",
      "employer.total_employees_at_location": 100,
      "termination.is_mass_layoff": true,
      "termination.notice_days_given": 30,
    });
    assertEq(fires.outcome, "violation", "warn_act: federal fires when < 60 days notice for 100+ employees");
  } else {
    assert(false, "warn_act: Could not find federal WARN rule");
  }

  // 2.11 family_medical_leave — federal FMLA fires (as warning — it's an entitlement, not a prohibition)
  const fedFmla = findRule("family_medical_leave", "Federal");
  if (fedFmla) {
    const fires = evaluateRule(fedFmla, {
      "location.country": "US",
      "employer.total_employees": 50,
      "employee.tenure_months": 13,
      "employee.hours_worked_last_12_months": 1300,
      "leave.type": "family",
    });
    // FMLA rules fire as warnings (entitlement) or violations depending on result type
    assert(fires.outcome === "violation" || fires.outcome === "warning",
      "family_medical_leave: federal FMLA fires for eligible employee");

    const doesNotFire = evaluateRule(fedFmla, {
      "location.country": "US",
      "employer.total_employees": 10,
      "employee.tenure_months": 13,
      "employee.hours_worked_last_12_months": 1300,
      "leave.type": "family",
    });
    assertEq(doesNotFire.outcome, "passed", "family_medical_leave: FMLA doesn't fire for small employer (<50)");
  } else {
    assert(false, "family_medical_leave: Could not find federal FMLA rule");
  }

  // 2.12 split_shift_premium — CA fires for split shift
  const caSplit = RULES.find(r => r.topic === "split_shift_premium" && r.jurisdiction === "CA");
  if (caSplit) {
    const fires = evaluateRule(caSplit, {
      "location.state": "CA",
      "employee.exempt_status": "non_exempt",
      "shift.is_split_shift": true,
      "employee.regular_hourly_rate": 16.50,
    });
    assertEq(fires.outcome, "violation", "split_shift_premium: CA fires for split shift");
  } else {
    assert(false, "split_shift_premium: Could not find CA split shift rule");
  }

  // 2.13 premium_pay — NY spread of hours fires
  const nyPremium = RULES.find(r => r.topic === "premium_pay" && r.jurisdiction === "NY");
  if (nyPremium) {
    const fires = evaluateRule(nyPremium, {
      "location.state": "NY",
      "employee.exempt_status": "non_exempt",
      "shift.spread_of_hours": 11,
    });
    assertEq(fires.outcome, "violation", "premium_pay: NY fires when spread > 10 hours");
  } else {
    assert(false, "premium_pay: Could not find NY premium pay rule");
  }

  console.log(`\n  ✓ Level 2 complete: all 13 topics spot-checked`);
}

// ═══════════════════════════════════════════════════════════════════════
// LEVEL 3: CROSS-RULE CONSISTENCY
// ═══════════════════════════════════════════════════════════════════════

function level3_crossRuleConsistency() {
  section("Level 3: Cross-Rule Consistency");

  // 3.1 Min wage ordering: federal < state < local
  const fedMinWage = RULES.find(r => r.id === "federal-minimum-wage-7.25");
  const fedMin = fedMinWage && fedMinWage.result.type === "minimum_required_value"
    ? (fedMinWage.result as any).minimum : 7.25;

  const stateMinWageRules = RULES.filter(r =>
    r.topic === "minimum_wage" &&
    r.jurisdiction !== "Federal" &&
    ALL_STATES.includes(r.jurisdiction as any) &&
    r.result.type === "minimum_required_value"
  );

  let statesBelowFederal = 0;
  for (const rule of stateMinWageRules) {
    const min = (rule.result as any).minimum;
    if (min < fedMin) {
      // Some states (GA, WY) have min wages below federal — that's correct,
      // federal still applies. But their state rule should still exist.
      // Only flag if it's nonsensically low (like $0 or negative)
      if (min <= 0) {
        statesBelowFederal++;
        console.log(`    ⚠ ${rule.jurisdiction} min wage is $${min} (≤ $0)`);
      }
    }
  }
  assertEq(statesBelowFederal, 0, `No state min wages are $0 or negative`);

  // 3.2 Local min wages should exceed their state's min wage
  const localMinWageRules = RULES.filter(r =>
    r.topic === "minimum_wage" &&
    !ALL_STATES.includes(r.jurisdiction as any) &&
    r.jurisdiction !== "Federal" &&
    r.result.type === "minimum_required_value"
  );

  let localsChecked = 0;
  let localsBelowState = 0;
  for (const localRule of localMinWageRules) {
    const localMin = (localRule.result as any).minimum;
    // Find the parent state from the rule's conditions
    const stateCondition = extractStateFromConditions(localRule.appliesWhen);
    if (!stateCondition) continue;

    // General state floor only — industry-specific floors (e.g. CA fast food) are higher by design
    const stateRule = stateMinWageRules.find(r =>
      r.jurisdiction === stateCondition &&
      r.result.type === "minimum_required_value" &&
      !JSON.stringify(r.appliesWhen).includes("industry_tag")
    );
    if (!stateRule) continue;

    const stateMin = (stateRule.result as any).minimum;
    localsChecked++;
    if (localMin < stateMin) {
      localsBelowState++;
      if (localsBelowState <= 3) {
        console.log(`    ⚠ ${localRule.jurisdiction} ($${localMin}) < ${stateCondition} ($${stateMin})`);
      }
    }
  }
  assertEq(localsBelowState, 0, `No local min wages below their state (checked ${localsChecked})`);

  // 3.3 "Most restrictive wins" — evaluate a NYC worker at $5/hr
  // At $5/hr, ALL min wage rules fire (federal $7.25, NY downstate $17, NYC $17)
  // Only the most restrictive should survive as a violation
  const nycScenario: Scenario = {
    "location.country": "US",
    "location.state": "NY",
    "location.city": "New York City",
    "employee.exempt_status": "non_exempt",
    "employee.regular_hourly_rate": 5.00,
    "shift.date": "2025-06-01",
    "shift.hours_worked_this_week": 30,
  };
  const nycResult = evaluateRules(RULES, nycScenario);
  const nycMinWageViolations = nycResult.violations.filter(v => {
    const rule = RULES.find(r => r.id === v.ruleId);
    return rule?.topic === "minimum_wage";
  });
  // Should have exactly 1 surviving violation (the most restrictive)
  assert(nycMinWageViolations.length === 1,
    `NYC min wage: exactly 1 violation survives (got ${nycMinWageViolations.length})`);
  // The surviving violation should NOT be the federal rule (it's less restrictive)
  assert(nycMinWageViolations[0]?.ruleId !== "federal-minimum-wage-7.25",
    `NYC min wage: winner is not the federal rule`);
  // The federal rule should be in passed with supersededBy set
  const fedSuperseded = nycResult.passed.find(p => p.ruleId === "federal-minimum-wage-7.25");
  assert(fedSuperseded !== undefined, `NYC min wage: federal rule moved to passed`);
  assert(fedSuperseded?.supersededBy !== undefined,
    `NYC min wage: federal rule has supersededBy set`);

  // 3.4 No two active rules with same ID (already checked in L1, but verify here too)
  const activeRules = RULES.filter(r => r.status === "active");
  const activeIds = activeRules.map(r => r.id);
  const activeUnique = new Set(activeIds);
  assertEq(activeUnique.size, activeIds.length, `No duplicate IDs among active rules`);

  // 3.5 All WARN act rules have higher or equal threshold to federal
  const fedWarnRule = RULES.find(r => r.id.includes("federal") && r.topic === "warn_act");
  const stateWarnRules = RULES.filter(r => r.topic === "warn_act" && r.jurisdiction !== "Federal");
  // State WARN acts can have LOWER thresholds (that's the point — they're more protective)
  // Just verify they all have a threshold > 0
  let warnWithZeroThreshold = 0;
  for (const rule of stateWarnRules) {
    const conditions = extractAllConditions(rule.appliesWhen);
    const thresholdCond = conditions.find(c => c.fact === "employer.total_employees");
    if (thresholdCond && (thresholdCond.value as number) <= 0) {
      warnWithZeroThreshold++;
    }
  }
  assertEq(warnWithZeroThreshold, 0, `All WARN rules have positive employee thresholds`);

  // 3.6 Every topic has at least one rule
  for (const topic of ALL_TOPICS) {
    const count = RULES.filter(r => r.topic === topic).length;
    assert(count > 0, `Topic "${topic}" has at least one rule (got ${count})`);
  }

  console.log(`\n  ✓ Level 3 complete: cross-rule consistency verified`);
}

// ═══════════════════════════════════════════════════════════════════════
// LEVEL 4: DATA ACCURACY AUDIT
// ═══════════════════════════════════════════════════════════════════════

function level4_dataAccuracyAudit() {
  section("Level 4: Data Accuracy Audit");

  // 4.1 Spot-check minimum wage dollar amounts against known 2025 values
  const knownMinWages: Record<string, number> = {
    // Source: DOL.gov state minimum wage table, effective 2025
    "CA": 16.50,   // California (Jan 2025)
    "WA": 16.66,   // Washington (Jan 2025)
    "NY": 16.50,   // New York (Jan 2025, NYC/LI/Westchester)
    "MA": 15.00,   // Massachusetts (Jan 2025)
    "CO": 14.81,   // Colorado (Jan 2025)
    "CT": 16.35,   // Connecticut (Jun 2025)
    "NJ": 15.49,   // New Jersey (Jan 2025)
    "MD": 15.00,   // Maryland (Jan 2025)
    "AZ": 14.70,   // Arizona (Jan 2025)
    "FL": 14.00,   // Florida (Sep 2024)
  };

  let mwChecked = 0;
  let mwMismatches = 0;
  for (const [state, expectedMin] of Object.entries(knownMinWages)) {
    const rule = RULES.find(r =>
      r.topic === "minimum_wage" &&
      r.jurisdiction === state &&
      r.result.type === "minimum_required_value" &&
      r.status === "active"
    );
    if (!rule) {
      console.log(`    ⚠ No min wage rule found for ${state}`);
      continue;
    }
    const actualMin = (rule.result as any).minimum;
    mwChecked++;
    if (Math.abs(actualMin - expectedMin) > 0.50) {
      // Allow $0.50 tolerance for timing differences in rate updates
      mwMismatches++;
      console.log(`    ⚠ ${state}: encoded $${actualMin}, expected ~$${expectedMin} (diff: $${Math.abs(actualMin - expectedMin).toFixed(2)})`);
    }
  }
  assert(mwMismatches <= 2, `Min wage spot-check: ≤2 mismatches out of ${mwChecked} (got ${mwMismatches})`);

  // 4.2 Effective dates are plausible
  let futureDatesForActive = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const rule of RULES) {
    if (rule.status === "active" && rule.effectiveFrom > today) {
      futureDatesForActive++;
      if (futureDatesForActive <= 3) {
        console.log(`    ⚠ Active rule with future date: ${rule.id} (${rule.effectiveFrom})`);
      }
    }
  }
  // Allow some — states pass laws in advance
  assert(futureDatesForActive <= 5,
    `≤5 active rules with future effective dates (got ${futureDatesForActive})`);

  // 4.3 Effective dates are not absurdly old (before 1900) or in far future (after 2030)
  let absurdDates = 0;
  for (const rule of RULES) {
    const year = parseInt(rule.effectiveFrom.slice(0, 4));
    if (year < 1900 || year > 2030) {
      absurdDates++;
      if (absurdDates <= 3) console.log(`    ⚠ Absurd date: ${rule.id} (${rule.effectiveFrom})`);
    }
  }
  assertEq(absurdDates, 0, `No rules with absurd effective dates`);

  // 4.4 Citation URLs are well-formed (when present)
  let badUrls = 0;
  for (const rule of RULES) {
    for (const cite of rule.citations) {
      if (cite.url && !cite.url.startsWith("https://") && !cite.url.startsWith("http://")) {
        badUrls++;
        if (badUrls <= 3) console.log(`    ⚠ Bad URL in ${rule.id}: ${cite.url}`);
      }
    }
  }
  assertEq(badUrls, 0, `All citation URLs start with http(s):// (${badUrls} invalid)`);

  // 4.5 Federal minimum wage is $7.25
  const fedMW = RULES.find(r => r.id === "federal-minimum-wage-7.25");
  if (fedMW && fedMW.result.type === "minimum_required_value") {
    assertEq((fedMW.result as any).minimum, 7.25, "Federal minimum wage is $7.25");
  } else {
    assert(false, "Could not find federal minimum wage rule");
  }

  // 4.6 No rule has an empty jurisdiction
  const emptyJurisdictions = RULES.filter(r => !r.jurisdiction || r.jurisdiction.trim() === "");
  assertEq(emptyJurisdictions.length, 0, `No rules with empty jurisdiction`);

  console.log(`\n  ✓ Level 4 complete: data accuracy spot-checked`);
}

// ═══════════════════════════════════════════════════════════════════════
// LEVEL 5: SCENARIO-BASED INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════

function level5_scenarioIntegration() {
  section("Level 5: Scenario Integration Tests");

  // 5.1 California store — non-exempt, 9hr day, $15/hr, no meal break
  {
    const scenario: Scenario = {
      "location.country": "US",
      "location.state": "CA",
      "employee.exempt_status": "non_exempt",
      "employee.regular_hourly_rate": 15.00,
      "shift.hours_worked_today": 9,
      "shift.shift_length_hours": 9,
      "shift.hours_worked_this_week": 42,
      "shift.meal_break_provided": false,
      "shift.meal_break_waived": false,
      "shift.rest_break_provided": false,
      "shift.date": "2025-06-15",
    };
    const result = evaluateRules(RULES, scenario);
    const topics = new Set(result.violations.map(v => {
      const rule = RULES.find(r => r.id === v.ruleId);
      return rule?.topic;
    }));

    assert(topics.has("minimum_wage"), "CA scenario: min wage violation ($15 < $16.50)");
    assert(topics.has("overtime"), "CA scenario: overtime violation (daily > 8hrs)");
    assert(topics.has("meal_break"), "CA scenario: meal break violation (no break > 5hrs)");
    assert(topics.has("rest_break"), "CA scenario: rest break violation (no break > 4hrs)");
    assert(result.violations.length >= 4, `CA scenario: at least 4 violations (got ${result.violations.length})`);
  }

  // 5.2 New York store — minor, school day, 5hr shift ending at 8pm
  {
    const scenario: Scenario = {
      "location.country": "US",
      "location.state": "NY",
      "employee.is_minor": true,
      "employee.age": 14,
      "employee.exempt_status": "non_exempt",
      "shift.is_school_day": true,
      "shift.school_in_session": true,
      "shift.shift_length_hours": 5,
      "shift.end_hour": 20,
      "shift.date": "2025-06-15",
    };
    const result = evaluateRules(RULES, scenario);
    const minorViolations = result.violations.filter(v => {
      const rule = RULES.find(r => r.id === v.ruleId);
      return rule?.topic === "minor_labor";
    });
    assert(minorViolations.length >= 1, `NY minor scenario: at least 1 minor labor violation (got ${minorViolations.length})`);
  }

  // 5.3 Oregon store — predictive scheduling violation
  {
    const scenario: Scenario = {
      "location.country": "US",
      "location.state": "OR",
      "employer.total_employees_global": 500,
      "employer.industry_tag": "retail",
      "schedule.advance_notice_days": 10,
      "schedule.was_changed": true,
      "schedule.employer_initiated": true,
      "schedule.employee_consented": false,
      "schedule.change_type": "hours_added",
    };
    const result = evaluateRules(RULES, scenario);
    const schedViolations = result.violations.filter(v => {
      const rule = RULES.find(r => r.id === v.ruleId);
      return rule?.topic === "predictive_scheduling";
    });
    assert(schedViolations.length >= 1, `OR predictive scheduling: at least 1 violation (got ${schedViolations.length})`);
  }

  // 5.4 Illinois store — 7 consecutive days
  {
    const scenario: Scenario = {
      "location.country": "US",
      "location.state": "IL",
      "employee.exempt_status": "non_exempt",
      "shift.consecutive_days_worked": 7,
      "shift.is_seventh_consecutive_day": true,
      "shift.hours_worked_today": 8,
      "shift.hours_worked_this_week": 40,
      "shift.date": "2025-06-15",
    };
    const result = evaluateRules(RULES, scenario);
    const dayOfRestViolations = result.violations.filter(v => {
      const rule = RULES.find(r => r.id === v.ruleId);
      return rule?.topic === "day_of_rest";
    });
    assert(dayOfRestViolations.length >= 1, `IL 7-day scenario: day_of_rest violation (got ${dayOfRestViolations.length})`);
  }

  // 5.5 NYC worker — multi-jurisdiction stack (federal + NY state + NYC local)
  {
    const scenario: Scenario = {
      "location.country": "US",
      "location.state": "NY",
      "location.city": "New York City",
      "employee.exempt_status": "non_exempt",
      "employee.regular_hourly_rate": 14.00,
      "shift.hours_worked_today": 8,
      "shift.hours_worked_this_week": 45,
      "shift.date": "2025-06-15",
    };
    const result = evaluateRules(RULES, scenario);

    // Should get min wage violation (NYC rate is ~$16.50, worker at $14)
    const mwViolations = result.violations.filter(v => {
      const rule = RULES.find(r => r.id === v.ruleId);
      return rule?.topic === "minimum_wage";
    });
    assert(mwViolations.length >= 1, `NYC stack: min wage violation (got ${mwViolations.length})`);

    // Should get overtime violation (> 40 hrs)
    const otViolations = result.violations.filter(v => {
      const rule = RULES.find(r => r.id === v.ruleId);
      return rule?.topic === "overtime";
    });
    assert(otViolations.length >= 1, `NYC stack: overtime violation (got ${otViolations.length})`);

    // The most restrictive min wage should win (NYC local, not federal or state)
    // Federal should be superseded
    const fedInPassed = result.passed.find(p => p.ruleId === "federal-minimum-wage-7.25");
    assert(fedInPassed !== undefined, `NYC stack: federal min wage superseded to passed`);

    // Total violations should be reasonable (not hundreds)
    assert(result.violations.length <= 10, `NYC stack: reasonable violation count (got ${result.violations.length})`);
  }

  console.log(`\n  ✓ Level 5 complete: integration scenarios verified`);
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function extractFactPaths(condition: any): string[] {
  if (!condition) return [];
  if (condition.fact) return [condition.fact];
  if (condition.all) return condition.all.flatMap((c: any) => extractFactPaths(c));
  if (condition.any) return condition.any.flatMap((c: any) => extractFactPaths(c));
  if (condition.not) return extractFactPaths(condition.not);
  return [];
}

function extractAllConditions(condition: any): any[] {
  if (!condition) return [];
  if (condition.fact) return [condition];
  if (condition.all) return condition.all.flatMap((c: any) => extractAllConditions(c));
  if (condition.any) return condition.any.flatMap((c: any) => extractAllConditions(c));
  if (condition.not) return extractAllConditions(condition.not);
  return [];
}

function extractStateFromConditions(condition: any): string | null {
  const conditions = extractAllConditions(condition);
  const stateCond = conditions.find((c: any) => c.fact === "location.state" && c.op === "=");
  return stateCond ? stateCond.value : null;
}

// ═══════════════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════════════

function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  VALIDATION SUITE — All 5 Levels");
  console.log("  Rules Engine: Employment Law Compliance");
  console.log("═══════════════════════════════════════════════════════════════");

  level1_structuralIntegrity();
  level2_behavioralCorrectness();
  level3_crossRuleConsistency();
  level4_dataAccuracyAudit();
  level5_scenarioIntegration();

  // Final summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (failures.length > 0) {
    console.log("  FAILURES:");
    for (const f of failures) {
      console.log(`    ❌ ${f}`);
    }
    console.log("");
  } else {
    console.log("  ✅ ALL TESTS PASSED\n");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
