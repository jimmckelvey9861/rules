# Employment Law Rules Engine

Deterministic TypeScript rule engine for U.S. employment law compliance.

## Architecture

Rules are defined as validated TypeScript objects — no database, no JSON blobs.
Each rule is created with `createRule()` which enforces:
- All referenced facts exist in the fact registry
- Operators match fact types (no `>` on booleans)
- No vague values ("varies", "unknown")
- Required citation, effective date, and ID

## Quick Start

```bash
npm install
npm run dev          # Starts server (port 3001) + client (port 5173)
npm run test:new-rules   # Run all tests
npm run typecheck        # TypeScript type checking
```

No database required. No Docker. No environment variables.

## API

- `GET /api/ts-rules` — List all rules
- `GET /api/ts-rules/:id` — Single rule detail
- `GET /api/ts-facts` — Fact registry
- `POST /api/ts-rules/evaluate` — Evaluate scenario against all rules

## Structure

```
server/
  index.ts              — Express server (4 endpoints)
  rules/
    types.ts            — Core type definitions
    facts.ts            — Fact registry (75 facts)
    conditions.ts       — Condition DSL validation
    createRule.ts       — Rule factory with validation
    evaluator.ts        — Pure deterministic evaluator
    index.ts            — Public API + rule registry
    rules.test.ts       — Tests
    examples/           — All rule definitions
client/
  src/pages/
    RulesExplorerPage   — Browse rules + scenario tester
    RuleDetailPage      — Individual rule detail view
```

## Rules (41)

- **Overtime**: Federal weekly, CA daily, CA double time, WA weekly
- **Minimum wage**: Federal + 6 states + 22 cities
- **Predictive scheduling**: Seattle, NYC (fast food, retail, clopening)
- **Meal breaks**: CA first (>5hr) and second (>10hr)
- **Leave**: Federal FMLA
- **Mass layoffs**: Federal WARN Act
