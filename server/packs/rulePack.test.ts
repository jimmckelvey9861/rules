/**
 * Engine A tests — partial evaluation and rule packs.
 *
 * Usage: npm run test:packs
 */

import { RULES, evaluateRules } from "../rules/index.js";
import { isKnownFact } from "../rules/facts.js";
import { evaluatePartial, compare, factsIn } from "../rules/partialEvaluate.js";
import { buildRulePack, buildRulePacks, validateBusinessProfile, isBusinessFact } from "./buildRulePack.js";
import { SAMPLE_PROFILE } from "./index.js";
import { buildScenario } from "../scheduler/buildScenario.js";
import type { BusinessProfile } from "./types.js";
import type { Condition, Rule } from "../rules/types.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) { passed++; console.log(`  ✅ ${message}`); }
  else { failed++; failures.push(message); console.log(`  ❌ ${message}`); }
}

console.log("\n═══ Partial evaluation ═══");
const cond: Condition = {
  all: [
    { fact: "location.state", op: "=", value: "WA" },
    { fact: "employer.total_employees_global", op: ">=", value: 500 },
    { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
    { fact: "shift.hours_worked_this_week", op: ">", value: 40 },
  ],
};
const open = evaluatePartial(cond, { "location.state": "WA", "employer.total_employees_global": 1200 });
assert(open.state === "open", "Business facts satisfied, employee facts unknown -> open");
assert(JSON.stringify(open.residual) === JSON.stringify({ all: [cond.all[2], cond.all[3]] }), "Residual keeps only the unknown conditions");
assert(open.satisfiedBy.join(",") === "employer.total_employees_global,location.state", "satisfiedBy lists the business facts used");
assert(open.openFacts.join(",") === "employee.exempt_status,shift.hours_worked_this_week", "openFacts lists what the scheduler must supply");
assert(evaluatePartial(cond, { "location.state": "CA" }).state === false, "A failing known condition makes the whole 'all' false");
assert(evaluatePartial(cond, { "location.state": "WA", "employer.total_employees_global": 1200, "employee.exempt_status": "non_exempt", "shift.hours_worked_this_week": 41 }).state === true, "All conditions known and met -> true");
const anyCond: Condition = { any: [{ fact: "location.city", op: "=", value: "Seattle" }, { fact: "employee.age", op: "<", value: 18 }] };
assert(evaluatePartial(anyCond, { "location.city": "Seattle" }).state === true, "'any' with one known true branch -> true");
const anyOpen = evaluatePartial(anyCond, { "location.city": "Tacoma" });
assert(anyOpen.state === "open" && JSON.stringify(anyOpen.residual) === JSON.stringify(anyCond.any[1]), "'any' drops its false branches and keeps the open one");
assert(evaluatePartial({ any: [{ fact: "location.city", op: "=", value: "Seattle" }] }, { "location.city": "Tacoma" }).state === false, "'any' with every branch false -> false");
const notOpen = evaluatePartial({ not: anyCond.any[1] }, {});
assert(notOpen.state === "open" && "not" in (notOpen.residual as object), "'not' of an open condition stays open and wraps the residual");
assert(evaluatePartial({ not: { fact: "location.state", op: "=", value: "WA" } }, { "location.state": "WA" }).state === false, "'not' of a true condition -> false");
assert(compare("in", "retail", ["retail", "fast_food"]) && !compare("not_in", "retail", ["retail"]) && compare(">=", 5, 5) && !compare(">", "5", 4), "compare handles in, not_in, numeric ops and rejects non-numbers");
assert([...factsIn(cond)].length === 4, "factsIn collects every referenced fact");

console.log("\n═══ Business profile validation ═══");
assert(validateBusinessProfile(SAMPLE_PROFILE).length === 0, "Sample profile is valid");
assert(isBusinessFact("employer.industry_tag") && isBusinessFact("location.city") && !isBusinessFact("employee.age") && !isBusinessFact("shift.date"), "Business facts are location.* and employer.* only");
const bad: BusinessProfile = { name: "x", employer: { "employee.age": 30, "employer.total_employees": "many" } as any, locations: [{ id: "a", name: "a", facts: { "location.city": "Nowhere" } }] };
const badErrors = validateBusinessProfile(bad);
assert(badErrors.some(e => e.path === "employer.employee.age"), "Rejects an employee-level fact in the employer profile");
assert(badErrors.some(e => e.path === "employer.employer.total_employees" && e.message.includes("expected number")), "Rejects a wrongly typed fact value");
assert(badErrors.some(e => e.path.endsWith("location.state")), "Requires location.state on every location");

console.log("\n═══ Rule packs ═══");
const packs = buildRulePacks(SAMPLE_PROFILE, { asOf: "2026-10-20" });
const byId = Object.fromEntries(packs.map(p => [p.location.id, p]));
const seattle = byId["sea-capitol-hill"];
const nyc = byId["nyc-soho"];
const austin = byId["aus-south-congress"];
assert(packs.length === SAMPLE_PROFILE.locations.length, `One pack per location (${packs.length})`);
assert(seattle.format === "kronto-rule-pack/1" && seattle.checksum.length === 64 && seattle.rulesVersion.length === 16, "Pack carries format, checksum and rules version");
assert(seattle.jurisdictions.map(j => j.id).join(" > ") === "us-wa-seattle > us-wa > us", `Seattle pack chain is city > state > federal (${seattle.jurisdictions.map(j => j.id).join(" > ")})`);
assert(seattle.rules.some(r => r.id === "federal-overtime-weekly-40"), "Seattle pack includes the federal weekly overtime rule");
assert(seattle.rules.some(r => r.jurisdiction === "Seattle"), "Seattle pack includes Seattle ordinances");
assert(seattle.rules.every(r => !["CA", "NY", "IL", "TX"].includes(r.jurisdiction) && !["New York City", "Chicago", "Los Angeles"].includes(r.jurisdiction)), "Seattle pack excludes other states' and cities' rules");
assert(seattle.rules.every(r => r.factsNeeded.every(f => !f.startsWith("location."))), "No pack rule still asks for a location fact");
assert(seattle.rules.every(r => r.factsNeeded.every(f => isKnownFact(f))), "Every fact a pack rule needs is registered");
assert(seattle.facts.every(f => isKnownFact(f.path)) && seattle.facts.some(f => f.derived), "Pack fact definitions are registered and derived facts carry recipes");
assert(seattle.rules.every(r => r.result.kronto === "block" || r.result.kronto === "premium" || r.result.kronto === "inform"), "Every pack rule has a Kronto action");
assert(seattle.rules.every(r => r.topicCode.includes(".") && r.jurisdictionId.startsWith("us")), "Pack rules carry taxonomy codes and jurisdiction ids");
assert(seattle.obligations.length > 0 && seattle.obligations.every(o => seattle.rules.some(r => r.result.obligation === o.code)), "Pack ships exactly the obligations its rules use");
assert(seattle.stats.rulesIncluded === seattle.rules.length && seattle.stats.rulesIncluded + seattle.stats.excludedByProfile + seattle.stats.excludedExpired + seattle.stats.excludedInactive === seattle.stats.rulesConsidered, "Pack stats add up");
assert(nyc.rules.some(r => r.id.startsWith("nyc-retail-")) && !nyc.rules.some(r => r.id.startsWith("nyc-ff-")), "NYC retail pack includes the retail fair workweek rules and excludes fast food");
const nycFastFood = buildRulePack({ ...SAMPLE_PROFILE, employer: { ...SAMPLE_PROFILE.employer, "employer.industry_tag": "fast_food" } }, SAMPLE_PROFILE.locations[1], { asOf: "2026-10-20" });
assert(nycFastFood.rules.some(r => r.id.startsWith("nyc-ff-")) && !nycFastFood.rules.some(r => r.id.startsWith("nyc-retail-")), "Switching the industry to fast food swaps the NYC fair workweek rules");
assert(austin.rules.some(r => r.jurisdiction === "TX" && r.result.obligation === "wage.minimum") && !austin.rules.some(r => r.jurisdictionType === "city"), "Austin pack has state and federal rules only");
const rebuilt = buildRulePack(SAMPLE_PROFILE, SAMPLE_PROFILE.locations[0], { asOf: "2026-10-20" });
assert(rebuilt.checksum === seattle.checksum, "Rebuilding the same pack gives the same checksum");

console.log("\n═══ Pack evaluation matches the full rule set ═══");
const store = { id: "nyc-soho", name: "SoHo", state: "NY", city: "New York City", county: "New York", country: "US" };
const employer = { totalEmployees: 1200, totalEmployeesAtLocation: 45, industryTag: "retail", annualGrossSales: 180000000 };
const employee = { id: "e1", name: "Test", age: 17, exemptStatus: "non_exempt" as const, hourlyRate: 12, tippedStatus: "not_tipped" as const, jobCategory: "retail", isSchoolEnrolled: true, tenureMonths: 8 };
const shift = { id: "s1", employeeId: "e1", date: "2026-10-21", startTime: "15:00", endTime: "23:30", publishedDate: "2026-10-19" };
const scenario = buildScenario(shift, employee, store, employer, { otherShiftsThisWeek: [], priorWeekShifts: [] });
// The pack already encodes the profile's employer facts, so give the full rule set the same ones.
const fullScenario = { ...scenario, ...SAMPLE_PROFILE.employer, ...SAMPLE_PROFILE.locations[1].facts };
const full = evaluateRules(RULES, fullScenario);
const viaPack = evaluateRules(nyc.rules as unknown as Rule[], scenario);
const ids = (xs: { ruleId: string }[]) => xs.map(x => x.ruleId).sort().join(",");
assert(full.violations.length > 0, `Scenario produces violations (${full.violations.length})`);
assert(ids(full.violations) === ids(viaPack.violations), "Pack rules produce the same violations as the full rule set");
assert(ids(full.warnings) === ids(viaPack.warnings), "Pack rules produce the same warnings as the full rule set");

console.log(`\n  Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  for (const f of failures) console.log(`    ❌ ${f}`);
  process.exit(1);
}
