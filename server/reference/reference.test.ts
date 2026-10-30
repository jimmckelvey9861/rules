/**
 * Reference Data Tests — taxonomy and jurisdictions against the loaded rules.
 *
 * Usage: npm run test:reference
 */

import { RULES, SKIPPED_DETAILS, evaluateRules } from "../rules/index.js";
import { VOCABULARY, getAllObligations, getObligation, resolveObligation, validateObligationParams } from "./vocabulary.js";
import { ALL_LOCALS, ALL_STATES, ALL_TOPICS } from "../rules/coverageMatrix.js";
import { TAXONOMY, getAllTaxonomyNodes, resolveTopic, getEnforcementTarget, topicCodeOf, legacyTopicFor } from "./taxonomy.js";
import { matrixTopicFor, MATRIX_ROWS_BY_TOPIC_CODE } from "../rules/coverageMatrix.js";
import { listJsonFiles, readJsonFile } from "./dataFiles.js";
import { FACTS_FILE, getAllFacts, getCanonicalFacts, getFactCategories, resolveFact } from "../rules/facts.js";
import {
  JURISDICTIONS, resolveJurisdiction, getJurisdiction, getJurisdictionChain, findPreemptingAncestor, getPreemptionDetail, getJurisdictionsByType,
} from "./jurisdictions.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) { passed++; console.log(`  ✅ ${message}`); }
  else { failed++; failures.push(message); console.log(`  ❌ ${message}`); }
}

console.log("\n═══ Taxonomy ═══");
const nodes = getAllTaxonomyNodes();
assert(TAXONOMY.categories.length === 9, `9 top-level categories (got ${TAXONOMY.categories.length})`);
assert(nodes.every(n => /^[a-z_]+(\.[a-z_]+){0,2}$/.test(n.code)), "Every taxonomy code is dotted lowercase, at most three levels");
assert(nodes.filter(n => n.level === "subtopic").every(n => n.code.startsWith(n.topicCode + ".")), "Every sub-topic code extends its topic code");
assert(nodes.filter(n => n.level === "topic").every(n => n.code.startsWith(n.categoryCode + ".")), "Every topic code extends its category code");
for (const topic of ALL_TOPICS) {
  assert(resolveTopic(topic) !== undefined, `Coverage-matrix topic "${topic}" resolves to a taxonomy node`);
}
const ruleTopics = [...new Set(RULES.map(r => r.topic))];
assert(ruleTopics.every(t => resolveTopic(t)?.level === "subtopic"), `All ${ruleTopics.length} rule topics are taxonomy sub-topic codes`);
assert(ruleTopics.every(t => legacyTopicFor(t) !== undefined), "Every rule topic maps back to a legacy topic for preemption flags");
assert(RULES.every(r => matrixTopicFor(r.topic, r.result.obligation) !== undefined), "Every rule lands on a coverage-matrix row");
assert(topicCodeOf("pay.minimum_wage.general") === "pay.minimum_wage" && topicCodeOf("pay.minimum_wage") === "pay.minimum_wage", "topicCodeOf climbs from a sub-topic to its topic");
assert(legacyTopicFor("pay.tipped.cash_wage") === "tipped_compensation" && legacyTopicFor("pay.premium.reporting_time") === "reporting_time_pay" && legacyTopicFor("pay.premium.on_call") === "premium_pay", "legacyTopicFor prefers the sub-topic's own legacy name, else the topic's");
assert(matrixTopicFor("pay.tipped.cash_wage") === "minimum_wage" && matrixTopicFor("sched.shift_structure.clopening") === "predictive_scheduling" && matrixTopicFor("pay.premium.split_shift", "premium.spread_of_hours") === "premium_pay" && matrixTopicFor("pay.premium.split_shift", "premium.split_shift") === "split_shift_premium", "matrixTopicFor folds sub-topics onto the historical matrix rows");
assert(RULES.every(r => (MATRIX_ROWS_BY_TOPIC_CODE[topicCodeOf(r.topic) ?? ""] ?? []).includes(matrixTopicFor(r.topic, r.result.obligation)!)), "MATRIX_ROWS_BY_TOPIC_CODE agrees with matrixTopicFor for every rule");
for (const file of listJsonFiles("rules")) {
  const parsed = readJsonFile<{ topic: string; rules: { topic: string }[] }>(file);
  const topicNode = resolveTopic(parsed.topic);
  assert(topicNode?.level === "topic" && file.endsWith(`${parsed.topic}.json`), `Rules file ${file} is named after its topic-level code`);
  assert(parsed.rules.every(r => topicCodeOf(r.topic) === parsed.topic), `Every rule in ${file} belongs to topic ${parsed.topic}`);
}
assert(ruleTopics.every(t => getEnforcementTarget(t) !== undefined), "Every rule topic has an enforcement target");
assert(getEnforcementTarget("predictive_scheduling") === "kronto", "Predictive scheduling is enforced by Kronto");
assert(getEnforcementTarget("warn_act") === "hr", "WARN notices are an HR duty, not a scheduler duty");
assert(resolveTopic("reporting_time_pay")?.code === "pay.premium.reporting_time", "Legacy reporting_time_pay maps to the premium pay sub-topic");

console.log("\n═══ Jurisdictions ═══");
assert(JURISDICTIONS.length >= 83, `At least 83 jurisdiction records (got ${JURISDICTIONS.length})`);
assert(getJurisdictionsByType("state").length === 50, "50 states");
assert(getJurisdictionsByType("district").length === 1, "DC is a district");
assert(getJurisdictionsByType("territory").length === 5, "5 territories");
assert(JURISDICTIONS.filter(j => j.type === "state" || j.type === "district").every(j => /^\d{2}$/.test(j.fips ?? "")), "Every state has a 2-digit FIPS code");
for (const code of ALL_STATES) {
  const j = resolveJurisdiction(code);
  assert(j !== undefined && j.parent === "us", `State ${code} resolves with Federal as parent`);
}
for (const local of ALL_LOCALS) {
  const chain = getJurisdictionChain(local);
  assert(chain.length === 3 && chain[2]?.id === "us", `Local "${local}" chains local -> state -> federal`);
}
const ruleJurisdictions = [...new Set(RULES.map(r => r.jurisdiction))];
assert(ruleJurisdictions.every(k => resolveJurisdiction(k) !== undefined), `All ${ruleJurisdictions.length} rule jurisdictions resolve`);
assert(getJurisdictionChain("New York City").map(j => j.id).join(" > ") === "us-ny-new-york-city > us-ny > us", "NYC chain is city > NY > federal");
assert(findPreemptingAncestor("Portland Metro Area", "minimum_wage") === undefined, "State-defined regions are never preempted by their own state");
assert(findPreemptingAncestor("Chicago", "minimum_wage") === undefined, "Illinois does not preempt Chicago's minimum wage");
const texasPreemption = resolveJurisdiction("TX")?.preemption?.minimum_wage;
assert(texasPreemption === "preempted", "Texas is recorded as preempting local minimum wage");
const states = JURISDICTIONS.filter(j => j.type === "state" || j.type === "district");
assert(states.every(j => j.verified && j.preemption !== undefined), "Every state record is verified and carries a preemption map (possibly empty)");
const PREEMPTION_TOPICS = new Set(["minimum_wage", "sick_leave", "predictive_scheduling"]);
assert(states.every(j => Object.keys(j.preemption ?? {}).every(t => PREEMPTION_TOPICS.has(t))), "Preemption flags use the three legacy topic names the loader checks");
assert(states.every(j => Object.entries(j.preemption ?? {}).every(([t, mode]) => mode !== "preempted" || (j.preemptionDetails?.[t]?.citation ?? "").length > 0)), "Every preempted flag cites its statute in preemptionDetails");
assert(states.every(j => Object.keys(j.preemptionDetails ?? {}).every(t => j.preemption?.[t] === "preempted")), "preemptionDetails only describes flags that exist");
assert(states.every(j => Object.values(j.preemptionDetails ?? {}).every(x => (x.exempt ?? []).every(id => getJurisdiction(id)?.parent === j.id))), "Grandfathered exemptions name real locals of that state");
assert(states.filter(j => Object.values(j.preemption ?? {}).includes("preempted")).length === 28, `28 states preempt at least one topic (got ${states.filter(j => Object.values(j.preemption ?? {}).includes("preempted")).length})`);
assert(findPreemptingAncestor("Montgomery County", "sick_leave") === undefined, "Montgomery County's sick leave law is grandfathered under Maryland's act");
assert(resolveJurisdiction("MD")?.preemption?.sick_leave === "preempted" && getPreemptionDetail("MD", "sick_leave")?.exempt?.includes("us-md-montgomery-county") === true, "Maryland preempts new local sick leave laws and lists Montgomery County as exempt");
assert(findPreemptingAncestor("Philadelphia", "sick_leave") === undefined && findPreemptingAncestor("Philadelphia", "predictive_scheduling") === undefined, "Pennsylvania does not preempt Philadelphia's sick leave or fair workweek ordinances");
assert(findPreemptingAncestor("Philadelphia", "minimum_wage")?.id === "us-pa", "Pennsylvania preempts a local minimum wage");
assert(resolveJurisdiction("OR")?.preemption?.predictive_scheduling === "preempted" && resolveJurisdiction("TX")?.preemption?.predictive_scheduling === "preempted" && resolveJurisdiction("FL")?.preemption?.predictive_scheduling === "preempted", "Oregon, Texas and Florida preempt local scheduling ordinances");
assert(resolveJurisdiction("OK")?.preemption?.predictive_scheduling === undefined, "Oklahoma's statute does not reach scheduling");
assert(resolveJurisdiction("CO")?.preemption?.minimum_wage === undefined && resolveJurisdiction("AZ")?.preemption?.sick_leave === undefined && resolveJurisdiction("NE")?.preemption?.minimum_wage === undefined, "Colorado (repealed), Arizona (struck down) and Nebraska (no statute) carry no flags");
console.log("\n═══ Result vocabulary ═══");
const obligations = getAllObligations();
assert(obligations.length >= 19, `At least 19 obligation types (got ${obligations.length})`);
assert(obligations.every(o => /^[a-z_]+(\.[a-z_]+)+$/.test(o.code)), "Every obligation code is dotted lowercase");
assert(new Set(obligations.map(o => o.code)).size === obligations.length, "Obligation codes are unique");
assert(obligations.every(o => o.params.every(p => !p.unit || p.unit in VOCABULARY.units)), "Every param unit is declared in the units table");
assert(obligations.filter(o => o.behaviors.includes("minimum_required_value")).every(o => o.targetFact && o.compareParam), "Every minimum_required_value obligation has a targetFact and compareParam");
assert(RULES.every(r => getObligation(r.result.obligation) !== undefined), "Every rule names a known obligation");
assert(RULES.every(r => getObligation(r.result.obligation)!.behaviors.includes(r.result.type)), "Every rule uses a behaviour its obligation allows");
assert(RULES.every(r => validateObligationParams(r.result.obligation, r.result.params).length === 0), "Every rule's params match its obligation");
assert(RULES.every(r => r.result.summary.trim().length > 0), "Every rule has a summary");
const usedObligations = new Set(RULES.map(r => r.result.obligation));
assert(obligations.every(o => usedObligations.has(o.code)), `Every obligation is used by at least one rule (unused: ${obligations.filter(o => !usedObligations.has(o.code)).map(o => o.code).join(", ") || "none"})`);
assert(resolveObligation("predictability pay")?.code === "premium.schedule_change", "Synonym lookup: predictability pay -> premium.schedule_change");
assert(resolveObligation("WARN Act")?.code === "sep.warn_notice", "Synonym lookup: WARN Act -> sep.warn_notice");
assert(RULES.filter(r => r.result.obligation === "wage.minimum").every(r => typeof r.result.params.rate === "number"), "Every minimum wage rule carries a numeric rate");
assert(RULES.filter(r => r.result.obligation.startsWith("minor.") && r.result.obligation !== "minor.general_restrictions").every(r => typeof r.result.params.age_min === "number" && typeof r.result.params.age_max === "number"), "Every specific minor-labor rule carries an age range");
const caMinWage = evaluateRules(RULES, { "location.state": "CA", "employee.exempt_status": "non_exempt", "employee.regular_hourly_rate": 7.0, "shift.hours_worked_today": 4, "shift.hours_worked_this_week": 20 });
const caWinner = caMinWage.violations.filter(v => RULES.find(r => r.id === v.ruleId)?.result.obligation === "wage.minimum");
assert(caWinner.length === 1 && caWinner[0].ruleId === "ca-minimum-wage-2025", `Most protective minimum wage wins through the vocabulary compare param (got ${caWinner.map(v => v.ruleId).join(", ")})`);

console.log("\n═══ Facts ═══");
const facts = getAllFacts();
const factPaths = facts.map(f => f.path);
assert(facts.length >= 118, `At least 118 facts loaded from data/facts.json (got ${facts.length})`);
assert(new Set(factPaths).size === factPaths.length, "Fact paths are unique");
assert(facts.every(f => /^[a-z_]+\.[a-z_0-9]+$/.test(f.path)), "Every fact path is namespace.name in lowercase");
const categoryIds = new Set(getFactCategories().map(c => c.id));
assert(facts.every(f => f.category !== undefined && categoryIds.has(f.category)), "Every fact sits in a declared category");
assert(facts.filter(f => f.type === "enum").every(f => (f.enumValues?.length ?? 0) > 0), "Every enum fact lists its values");
assert(facts.filter(f => f.type !== "enum").every(f => !f.enumValues), "Only enum facts list enum values");
const allSynonyms = facts.flatMap(f => (f.synonyms ?? []).map(s => s.toLowerCase()));
assert(new Set(allSynonyms).size === allSynonyms.length && allSynonyms.every(s => !new Set(factPaths).has(s)), "Synonyms are unique and never collide with a fact path");
assert(facts.filter(f => f.deprecated).every(f => f.replacedBy && new Set(factPaths).has(f.replacedBy)), "Every deprecated fact names a live replacement");
assert(getCanonicalFacts().every(f => !f.deprecated), "Canonical facts exclude deprecated ones");
assert(resolveFact("Headcount")?.path === "employer.total_employees" && resolveFact("EMPLOYER.TOTAL_EMPLOYEES")?.path === "employer.total_employees", "resolveFact matches a synonym or a path, ignoring case");
assert(resolveFact("no such term") === undefined, "resolveFact returns undefined for an unknown term");
const usedFacts = new Set<string>();
const walk = (c: any) => { if (!c) return; if (c.fact) usedFacts.add(c.fact); for (const k of ["all", "any"]) (c[k] ?? []).forEach(walk); if (c.not) walk(c.not); };
RULES.forEach(r => walk(r.appliesWhen));
assert([...usedFacts].every(p => new Set(factPaths).has(p)), `All ${usedFacts.size} facts referenced by rules are registered`);
assert(FACTS_FILE.version >= "2026-10-30", `Facts file carries a version (${FACTS_FILE.version})`);

console.log("\n═══ Citations ═══");
const allCitations = RULES.flatMap(r => r.citations);
assert(allCitations.every(c => c.kind !== undefined), `Every citation has a kind (${allCitations.filter(c => !c.kind).length} missing)`);
assert(allCitations.every(c => c.url !== undefined), `Every citation has a URL (${allCitations.filter(c => !c.url).length} missing)`);
assert(RULES.every(r => r.citations.some(c => c.kind !== "guidance")), "No rule rests on guidance alone");
assert(SKIPPED_DETAILS.length === 0, `No rules rejected by reference cross-checks (${SKIPPED_DETAILS.map(s => s.id).join(", ") || "none"})`);

console.log(`\n  Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  for (const f of failures) console.log(`    ❌ ${f}`);
  process.exit(1);
}
