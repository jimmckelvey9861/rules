# Law Inventory Browser

A minimal two-screen web application for visualizing employment/labor law source coverage across U.S. jurisdictions.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node + TypeScript + Express
- **Database**: PostgreSQL (via Docker Compose) + Prisma ORM
- **Data**: Static seed files derived from Employment Law Taxonomy, Location Ontology, and Applicability Variable Taxonomy

## Screens

1. **Law Matrix** (`/`) — Rows are law categories, columns are jurisdictions. Populated cells are clickable.
2. **Law Detail** (`/laws/:id`) — Full details of a law source including applicability variables.

## Quick Start

```bash
cd /Users/jim/source/third_rules_engine

# 1. Start PostgreSQL
docker compose up -d

# 2. Install dependencies
npm install
cd client && npm install && cd ..

# 3. Run database migration
npx prisma migrate dev --name init

# 4. Seed the database
npm run db:seed

# 5. Start development servers (backend + frontend)
npm run dev
```

## URLs

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173       |
| Backend  | http://localhost:3001       |
| Prisma Studio | `npm run db:studio`   |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both backend and frontend in dev mode |
| `npm run dev:server` | Start backend only |
| `npm run dev:client` | Start frontend only |
| `npm run build` | Build frontend for production |
| `npm run typecheck` | Type-check both server and client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jurisdictions` | All jurisdictions |
| GET | `/api/law-categories` | All law categories |
| GET | `/api/applicability-variables` | All applicability variables |
| GET | `/api/law-sources` | All law sources |
| GET | `/api/law-sources/:id` | Single law source with details |
| GET | `/api/matrix` | Matrix data (categories, jurisdictions, cells) |

## Database Schema

- **Jurisdiction** — Hierarchical location tree (federal → state → county → city)
- **LawCategory** — Three-level taxonomy of employment law topics
- **ApplicabilityVariable** — Variables needed to evaluate a law's applicability
- **LawSource** — Individual law/regulation records
- **LawSourceApplicabilityVariable** — Join table linking sources to variables

## What This Is NOT

- ❌ No crawler or automatic law extraction
- ❌ No approval workflows
- ❌ No compliance evaluation engine
- ❌ No authentication
- ❌ No queues or background jobs

This is purely an **organized, inspectable law inventory browser**.
