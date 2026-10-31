# Employment Law Rules Engine

Deterministic TypeScript rule engine for U.S. employment law compliance.

## Architecture

Rules are plain JSON data files under `data/rules/`, one file per topic, loaded
at startup through the same validator that used to guard hand-written TypeScript
rules. Reference data (the rule taxonomy and the jurisdiction tree) also lives
under `data/`. The validator enforces:
- All referenced facts exist in the fact registry (`data/facts.json`)
- Operators match fact types (no `>` on booleans)
- No vague values ("varies", "unknown")
- Required citation, effective date, and ID
- Topic is a sub-topic code in `data/taxonomy.json` and sits in the file named after its topic
- Result names an obligation from `data/result-vocabulary.json` and its params match
- Jurisdiction resolves to a record in `data/jurisdictions.json`, and no local
  rule sits on a topic its state preempts
- Unique rule ids across all files

## Quick Start

```bash
npm install          # Also installs client/ dependencies (postinstall)
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
- `GET /api/vocabulary` — Obligation types with their typed parameters
- `POST /api/packs/build` — Rule packs for a business profile (one per location)
- `GET /api/packs/sample`, `GET /api/packs/sample/:locationId` — Packs for the sample retail chain

## Structure

```
data/
  taxonomy.json         — 9 categories > 28 topics > 66 sub-topics, enforcement target per topic
  jurisdictions.json    — Federal, 50 states + DC, 5 territories, 30 local jurisdictions (FIPS, parent,
                          preemption flags with statute citations; 28 states preempt some local labor rule)
  result-vocabulary.json — The obligation types a rule can impose, with typed parameters
  facts.json            — Fact registry: every fact a rule may test (125 facts in 8 categories, typed,
                          with enum values and plain-language synonyms)
  profiles/             — Business profiles (sample multi-state retail chain)
  rules/<topic>.json    — All rules, one file per taxonomy topic code (1569 rules across 20 topics)
  schema/               — JSON Schema for rule files and facts.json (editor validation)
  link-report.json      — Output of the link checker (written by npm run check-links)
scripts/
  buildPacks.ts         — Writes one rule pack per location for a business profile
  checkLinks.ts         — Fetches every citation URL, writes data/link-report.json
  classifyCitations.ts  — Fills in citation kind from the source wording
server/
  index.ts              — Express server
  reference/
    dataFiles.ts        — Reads /data
    taxonomy.ts         — Taxonomy loader + lookups
    vocabulary.ts       — Result vocabulary loader + param validation
    jurisdictions.ts    — Jurisdiction loader, chain + preemption lookups
    reference.test.ts   — Reference data tests
    vocabulary.ts       — Result vocabulary loader + param validation
  packs/
    buildRulePack.ts    — Engine A: applicability per location, emits rule packs
    index.ts            — /api/packs routes
    rulePack.test.ts    — Engine A tests
  rules/
    partialEvaluate.ts  — Three-valued condition evaluation against partial facts
  rules/
    types.ts            — Core type definitions
    facts.ts            — Loads data/facts.json; lookups by path, type, enum values, synonym
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

## Results and the obligation vocabulary

A rule's `result` says what the law requires when the rule applies:

```json
"result": {
  "type": "required_break",
  "obligation": "break.meal",
  "params": { "minimum_minutes": 30, "after_hours": 5 },
  "summary": "30-minute meal break for shifts of 5+ hours"
}
```

`type` is the engine behaviour (`minimum_required_value`, `required_break`,
`premium_required`, `prohibition`, `warning`). `obligation` is a code from
`data/result-vocabulary.json`, which declares for each obligation the behaviours
it may use, what Kronto should do when it fires (`block`, `premium`, `inform`),
its typed parameters, the parameter that decides "most protective" when several
rules of the same obligation apply, and synonyms for the authoring tool. The
validator rejects a result whose obligation is unknown or whose params do not
match the declaration. `summary` is one plain-English sentence for display.

## Rule packs for Kronto (Engine A)

The engine has two halves. Engine B is the per-shift compliance evaluator
(`evaluateRules`). Engine A is applicability: given a business profile, which
rules can apply at each location?

A business profile is business-level facts only (`location.*` and `employer.*`
paths from the fact registry), shared employer facts plus per-location facts.
See `data/profiles/sample-retail-chain.json`. `buildRulePack` evaluates every
rule's conditions against those facts with three-valued logic: a rule whose
business conditions fail is dropped, and a rule that survives is shipped with
those conditions removed, leaving only the employee, shift, schedule and leave
logic the scheduler must test per shift.

A pack (`kronto-rule-pack/1`) is self-contained: the rules (valid `Rule`
objects, so the shared evaluator runs them unchanged, each with its Kronto
action, taxonomy code and jurisdiction id), the obligation definitions they
use, the fact definitions they still need with recipes for derived facts, the
location's jurisdiction chain, a rules-version hash and a checksum.

```
npm run build-packs                      # sample chain -> examples/packs/<location>.json
npm run build-packs -- profile.json out/ --as-of 2027-01-01 --horizon-days 180
npm run diff-packs -- old-pack.json new-pack.json [--json]
```

## Change management: effective dates, as-of, what changed

Law changes are modelled as rule history, never as edits that lose the past:

- `effectiveFrom` is the date the current text took effect where that has been
  verified. `2000-01-01` is a convention, not a date: it marks a rule in force on
  or before that day whose enactment date has not been researched (long-standing
  overtime, jury duty and child labor statutes). A pack built as of any later
  date treats them as in force, which is correct; only a historical as-of before
  2000 would be wrong for them.
- Every rule has an `effectiveFrom`, and a rule that stopped applying keeps its
  record with an `effectiveTo`. The replacement is a new rule (new id) with
  `supersedes` naming the old one. The loader rejects a link whose two rules sit
  in different jurisdictions or topics, or whose windows overlap or leave the old
  rule open-ended. Chicago's schedule-change premium is the first example:
  `chi-advance-notice-14day` (2022-07-01) supersedes `chi-advance-notice-10day`
  (to 2022-06-30).
- `status` is about the record, not the calendar: `active` rules are evaluated
  (the dates decide whether they apply to a shift), `draft`, `pending` and
  `repealed` rules are never shipped. A repealed law is an `active` rule with an
  `effectiveTo`, so an as-of evaluation for an earlier date still finds it.
- The per-shift evaluator gates every rule by `shift.date` against its window,
  so two versions of a rule can ship together and the right one fires.
- A pack is built **as of** a date (`--as-of`, default today). Rules that expired
  before it are left out; rules in force are shipped; rules taking effect within
  the **horizon** (`--horizon-days`, default 365) are shipped flagged
  `upcoming: true` so the scheduler can warn about shifts past the change date;
  later ones are left out (`stats.excludedNotYetEffective`). Each pack rule names
  its `supersedes` / `supersededBy` neighbour and carries a content `hash`.
- **What changed since the last pack**: `diffRulePacks(previous, next)` (also
  `npm run diff-packs` and `POST /api/packs/diff`) reports rules added, removed
  and changed (by hash, naming the fields), plus the calendar events between the
  two as-of dates: rules that took effect, rules that expired, and rules still
  upcoming. `build-packs` prints this against the pack it is about to overwrite.

## Sources and links

Every citation carries a `kind` (`statute`, `regulation`, `ordinance`, `constitution`,
`case` or `guidance`). A `case` is a court decision that settles how a statute applies. Statutes and ordinances are the durable authority; guidance pages
(agency FAQs) churn and may never be a rule's only citation. `npm run
classify-citations` fills in `kind` for new citations from the wording of
`source`.

`npm run check-links` fetches every citation URL and writes
`data/link-report.json` with status, final URL and a hash of the page text, so a
later run can flag links that newly broke and pages whose text changed. Each URL
gets a verdict: `ok`, `broken` (404/410 or DNS failure, the citation needs a new
URL) or `blocked` (403/429/5xx, timeout or TLS error: the host refused an
automated client, so the page is unverified but probably fine; several state
legislature sites behave this way). The `Check citation links` workflow runs it
nightly and on demand; its job summary lists broken and blocked links and the
report is attached as an artifact. Only broken links fail the nightly run.

## Adding or changing a rule

1. Edit the topic's file under `data/rules/<topic code>.json` (for example
   `pay.minimum_wage.json`). Every rule's `topic` is a sub-topic code from
   `data/taxonomy.json` (`pay.minimum_wage.general`) under the file's topic. To
   start a new topic, add a file named after its taxonomy topic code.
2. Run `npm test`. A rule that fails validation is reported with its file, id and
   the failing path, and is skipped at runtime rather than crashing the server.

## Rules

1569 rules across 20 taxonomy topics (57 sub-topics) and 87 jurisdictions.
`GET /api/coverage` reports which jurisdiction × topic cells have a rule, are
confirmed to have no law, or are unchecked; its 22 rows are the historical topic
names (plus lactation breaks, civic leave, hour limits, personal leave, final pay, equal pay / wage protection, compensable time, hiring and workplace protections), which `matrixTopicFor` in `server/rules/coverageMatrix.ts` maps codes onto.
