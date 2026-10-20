import express from "express";
import cors from "cors";
import { RULES, SKIPPED, evaluateRules, getAllFacts } from "./rules/index.js";
import { schedulerRouter } from "./scheduler/index.js";
import { buildCoverageMatrix, summarizeCoverage, ALL_STATES, ALL_TOPICS, ALL_LOCALS } from "./rules/coverageMatrix.js";
import { TAXONOMY, getAllTaxonomyNodes } from "./reference/taxonomy.js";
import { JURISDICTIONS_FILE, getJurisdictionChain } from "./reference/jurisdictions.js";
import type { Scenario } from "./rules/types.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ─── TypeScript Rule API ───────────────────────────────────────────

// GET /api/ts-rules
app.get("/api/ts-rules", (_req, res) => {
  const rules = RULES.map(r => ({
    id: r.id,
    title: r.title,
    jurisdiction: r.jurisdiction,
    topic: r.topic,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo || null,
    status: r.status,
    citations: r.citations,
    resultType: r.result.type,
  }));
  res.json({ count: rules.length, skipped: SKIPPED.length, rules });
});

// GET /api/ts-rules/:id
app.get("/api/ts-rules/:id", (req, res) => {
  const rule = RULES.find(r => r.id === req.params.id);
  if (!rule) {
    res.status(404).json({ error: `Rule "${req.params.id}" not found` });
    return;
  }
  res.json(rule);
});

// GET /api/ts-facts
app.get("/api/ts-facts", (_req, res) => {
  const facts = getAllFacts().map(f => ({
    path: f.path,
    type: f.type,
    description: f.description,
    category: f.category || null,
    enumValues: f.enumValues || null,
    deprecated: f.deprecated || false,
    replacedBy: f.replacedBy || null,
  }));
  res.json({ count: facts.length, facts });
});

// POST /api/ts-rules/evaluate
app.post("/api/ts-rules/evaluate", (req, res) => {
  const { scenario } = req.body;

  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
    res.status(400).json({ error: "Request body must contain a 'scenario' object with fact key-value pairs." });
    return;
  }

  for (const key of Object.keys(scenario)) {
    if (!key.includes(".")) {
      res.status(400).json({ error: `Invalid fact path: "${key}". Fact paths use dot notation (e.g. "employee.exempt_status").` });
      return;
    }
  }

  const result = evaluateRules(RULES, scenario as Scenario);

  res.json({
    scenario,
    summary: {
      violations: result.violations.length,
      warnings: result.warnings.length,
      passed: result.passed.length,
    },
    violations: result.violations,
    warnings: result.warnings,
    passed: result.passed,
  });
});

// ─── Coverage Matrix API ───────────────────────────────────────────

// GET /api/coverage
app.get("/api/coverage", (_req, res) => {
  const matrix = buildCoverageMatrix(RULES);
  const summary = summarizeCoverage(matrix);
  res.json({ states: ALL_STATES, locals: ALL_LOCALS, topics: ALL_TOPICS, summary, matrix });
});

// ─── Reference Data API ────────────────────────────────────────────

// GET /api/taxonomy — the category > topic > sub-topic tree plus a flat node list
app.get("/api/taxonomy", (_req, res) => {
  res.json({ version: TAXONOMY.version, categories: TAXONOMY.categories, nodes: getAllTaxonomyNodes() });
});

// GET /api/jurisdictions — every jurisdiction record with parent links and preemption flags
app.get("/api/jurisdictions", (_req, res) => {
  res.json(JURISDICTIONS_FILE);
});

// GET /api/jurisdictions/:key/chain — a jurisdiction (by id or ruleKey) and its ancestors, nearest first
app.get("/api/jurisdictions/:key/chain", (req, res) => {
  const chain = getJurisdictionChain(req.params.key);
  if (chain.length === 0) {
    res.status(404).json({ error: `Unknown jurisdiction: ${req.params.key}` });
    return;
  }
  res.json(chain);
});

// ─── Scheduler API ─────────────────────────────────────────────────

app.use("/api/scheduler", schedulerRouter);

// ─── Start ─────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`  TypeScript rules: ${RULES.length} loaded${SKIPPED.length ? `, ${SKIPPED.length} skipped` : ""}`);
});

function shutdown() {
  server.closeAllConnections();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
