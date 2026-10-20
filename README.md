# Employment Law Rules Engine

Deterministic TypeScript rule engine for U.S. employment law compliance.

## Architecture

Rules are plain JSON data files under `data/rules/`, one file per topic, loaded
at startup through the same validator that used to guard hand-written TypeScript
rules. Reference data (the rule taxonomy and the jurisdiction tree) also lives
under `data/`. The validator enforces:
- All referenced facts exist in the fact registry
- Operators match fact types (no `>` on booleans)
- No vague values ("varies", "unknown")
- Required citation, effective date, and ID
- Topic resolves to a node in `data/taxonomy.json`
- Jurisdiction resolves to a record in `data/jurisdictions.json`, and no local
  rule sits on a topic its state preempts
- Unique rule ids across all files

## Quick Start

```bash
npm install
npm run dev          # Starts server (port 3001) + client (port 5173)
npm test                 # Run all four test suites
npm run typecheck        # TypeScript type checking
```

No database required. No Docker. No environment variables.

## API

- `GET /api/ts-rules` — List all rules
- `GET /api/ts-rules/:id` — Single rule detail
- `GET /api/ts-facts` — Fact registry
- `POST /api/ts-rules/evaluate` — Evaluate scenario against all rules
- `GET /api/coverage` — Jurisdiction × topic coverage matrix
- `GET /api/taxonomy` — Category > topic > sub-topic tree with enforcement targets
- `GET /api/jurisdictions` — Jurisdiction records with parent links and preemption flags
- `GET /api/jurisdictions/:key/chain` — A jurisdiction and its ancestors

## Structure

```
data/
  taxonomy.json         — 9 categories > 28 topics > 63 sub-topics, enforcement target per topic
  jurisdictions.json    — Federal, 50 states + DC, 5 territories, 26 local jurisdictions (FIPS, parent, preemption)
  rules/<topic>.json    — All rules, one file per topic (476 rules across 13 topics)
  schema/               — JSON Schema for rule files (editor validation)
  link-report.json      — Output of the link checker (written by npm run check-links)
scripts/
  checkLinks.ts         — Fetches every citation URL, writes data/link-report.json
  classifyCitations.ts  — Fills in citation kind from the source wording
server/
  index.ts              — Express server
  reference/
    dataFiles.ts        — Reads /data
    taxonomy.ts         — Taxonomy loader + lookups
    jurisdictions.ts    — Jurisdiction loader, chain + preemption lookups
    reference.test.ts   — Reference data tests
  rules/
    types.ts            — Core type definitions
    facts.ts            — Fact registry (115 facts)
    conditions.ts       — Condition DSL validation
    createRule.ts       — Rule validator
    loadRules.ts        — Loads and cross-checks data/rules/*.json
    evaluator.ts        — Pure deterministic evaluator
    coverageMatrix.ts   — Jurisdiction × topic coverage tracking
    index.ts            — Public API + rule registry
    rules.test.ts, validation.test.ts — Tests
  scheduler/
    buildScenario.ts    — Turns shift + employee + store data into a fact map
client/
  src/pages/
    RulesExplorerPage   — Browse rules + scenario tester
    RuleDetailPage      — Individual rule detail view
    SchedulerPage       — Schedule editor
    ComplianceWorkbench — Scenario workbench
```

## Sources and links

Every citation carries a `kind` (`statute`, `regulation`, `ordinance`, `constitution`
or `guidance`). Statutes and ordinances are the durable authority; guidance pages
(agency FAQs) churn and may never be a rule's only citation. `npm run
classify-citations` fills in `kind` for new citations from the wording of
`source`.

`npm run check-links` fetches every citation URL and writes
`data/link-report.json` with status, final URL and a hash of the page text, so a
later run can flag links that newly broke and pages whose text changed. The
`Check citation links` workflow runs it nightly and on demand; its job summary
lists the broken links and the report is attached as an artifact.

## Adding or changing a rule

1. Edit the topic's file under `data/rules/` (or add a new topic file whose `topic`
   is a code or legacy topic from `data/taxonomy.json`).
2. Run `npm test`. A rule that fails validation is reported with its file, id and
   the failing path, and is skipped at runtime rather than crashing the server.

## Rules

476 rules across 13 topics and 78 jurisdictions. `GET /api/coverage` reports which
jurisdiction × topic cells have a rule, are confirmed to have no law, or are unchecked.
