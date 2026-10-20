/**
 * Reference Data Tests — taxonomy and jurisdictions against the loaded rules.
 *
 * Usage: npm run test:reference
 */

import { RULES, SKIPPED_DETAILS } from "../rules/index.js";
import { ALL_LOCALS, ALL_STATES, ALL_TOPICS } from "../rules/coverageMatrix.js";
import { TAXONOMY, getAllTaxonomyNodes, resolveTopic, getEnforcementTarget } from "./taxonomy.js";
import {
  JURISDICTIONS, resolveJurisdiction, getJurisdictionChain, findPreemptingAncestor, getJurisdictionsByType,
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
assert(ruleTopics.every(t => resolveTopic(t) !== undefined), `All ${ruleTopics.length} rule topics resolve to taxonomy nodes`);
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
assert(SKIPPED_DETAILS.length === 0, `No rules rejected by reference cross-checks (${SKIPPED_DETAILS.map(s => s.id).join(", ") || "none"})`);

console.log(`\n  Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  for (const f of failures) console.log(`    ❌ ${f}`);
  process.exit(1);
}
