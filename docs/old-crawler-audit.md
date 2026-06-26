# Old Crawler Audit Report

**Source project:** `/Users/jim/source/rules_engine`  
**Target project:** `/Users/jim/source/third_rules_engine`  
**Audit date:** 2026-05-29  
**Purpose:** Identify reusable crawler/scraper/ingestion logic for porting

---

## Executive Summary

The old `rules_engine` project contains a substantial crawler infrastructure centered around a 7,660-line monolith (`autonomous_state_crawler.py`) that discovers, scrapes, and extracts compliance obligations from government websites using LLM-based structured extraction. The system also includes utility libraries, batch orchestration, URL healing, and static reference data.

**Recommended approach:** Port the utility layer and reference data as-is, decompose the monolith into focused modules, and discard the unverified LLM-only generation scripts.

---

## Files Audited

### Crawler & Scraper Code

| # | File | LOC | Purpose |
|---|------|-----|---------|
| 1 | `generators/autonomous_state_crawler.py` | 7,660 | Main crawler monolith — URL discovery, scraping, LLM extraction, self-healing |
| 2 | `generators/jurisdiction_scout.py` | 366 | LLM-driven discovery of cities with local labor laws |
| 3 | `generators/ingest_utils.py` | 621 | Shared utility library — scraping, LLM calls, card generation |
| 4 | `generators/ingest_ca.py` | 180 | Manual CA Labor Code ingestion (hardcoded text) |
| 5 | `generators/ingest_ny.py` | 369 | NY Labor Law scraper (NY Senate website) |
| 6 | `generators/state_expansion.py` | 446 | Config-driven state content fetcher + LLM extractor |
| 7 | `generators/regenerate_autonomous.py` | 160 | Bulk LLM-only card generation (no sources) |
| 8 | `ingestion/ecfr_client.py` | 57 | eCFR API client for federal regulations |
| 9 | `scripts/run_national_crawl.py` | 245 | 50-state batch orchestrator with subprocess isolation |
| 10 | `run_ingest.py` | 280 | CLI runner for federal regulation ingestion |
| 11 | `run_ny_ingest.py` | 137 | NY-specific ingest + rule factory pipeline |
| 12 | `heal_missing_urls.py` | 465 | DuckDuckGo-based URL backfiller for cards missing sources |
| 13 | `audit_urls.py` | 54 | Simple audit — reports cards missing source URLs |

### Reference Data & Manifests

| # | File | Purpose |
|---|------|---------|
| 14 | `data/state_sources.json` | Master config: 50 states → official labor dept URLs, key pages, scraping strategies |
| 15 | `data/city_hitlist.json` | ~25 cities with known local ordinances → spider root URLs |
| 16 | `data/master_jurisdictions.json` | LLM-generated list of 60 localities with local labor laws |
| 17 | `data/taxonomy.json` | Topic taxonomy (102 lines) |
| 18 | `data/variables.json` | Applicability variable registry (34 lines) |

### Output Data (Examples)

| # | File | Purpose |
|---|------|---------|
| 19 | `raw_data/ca_minimum_wage.json` | Sample compliance card (final output format) |
| 20 | `data/source_docs/CA-LAB-510.json` | Sample source document (ingested statute text) |

---

## Detailed File Analysis

### 1. `generators/autonomous_state_crawler.py`

**Purpose:** The main autonomous crawler — discovers, scrapes, and extracts compliance obligations from state and city government websites, generating structured "compliance cards" via LLM.

**Main functions:**
- `run_crawler()` — orchestrates full state crawl
- `run_city_crawler()` — city-specific crawl variant
- `scout_state_portal()` — discovers relevant pages from a state labor site
- `build_compliance_cards()` — generates cards from scraped content
- `generate_compliance_card()` — single card generation via structured LLM output
- `spider_depth_1()` — crawls links one level deep from a root page
- `discover_spider_root()` — finds the best starting URL for a jurisdiction
- `heal_spider_root()` / `heal_broken_root()` — self-healing URL recovery
- `fetch_page_content()` — HTTP fetch with Playwright fallback
- `call_llm_structured()` — OpenAI structured output call
- `run_batch_mode()` — batch processing across topics

**Inputs:** `data/state_sources.json`, `data/city_hitlist.json`, `data/taxonomy.json`, `data/variables.json`, `.env` (API keys), CLI args

**Outputs:** `raw_data/*.json` compliance cards

**External dependencies:**
- OpenAI API (gpt-4o, Structured Outputs)
- Tavily Search API (URL discovery/healing)
- DuckDuckGo (`ddgs` package)
- Playwright (JS-heavy sites)
- `requests`, `beautifulsoup4`, `pydantic`, `tenacity`, `colorama`, `httpx`

**Reusability:** ⚠️ **Reusable with significant refactoring**

The file contains excellent patterns but is a 7.6K-line monolith needing decomposition:
- Self-healing URL discovery (Tavily + DDG fallback)
- Pydantic-based structured LLM extraction
- Domain filtering and link classification
- Retry/backoff logic
- Batch mode with timeout isolation

**Risks:**
- Global mutable state (`BATCH_MODE_ACTIVE`, `AUTO_DISCOVERED_TOPICS`)
- Multiple API dependencies with different rate limits
- 30-min timeout per state in batch mode
- No robots.txt compliance

---

### 2. `generators/jurisdiction_scout.py`

**Purpose:** Uses GPT-4o to generate a master list of US cities/counties with local labor laws differing from state baselines.

**Main functions:** `scout_jurisdictions()`, `validate_and_clean()`, `save_jurisdictions()`

**Inputs:** `.env` (OPENAI_API_KEY), hardcoded prompts  
**Outputs:** `data/master_jurisdictions.json`

**External dependencies:** OpenAI API (gpt-4o)

**Reusability:** ⚠️ **Reusable with changes** — Good pattern for LLM-driven discovery, but output quality depends entirely on LLM knowledge.

**Risks:** LLM hallucination risk. No ground-truth verification. Single-shot generation limited to ~60 jurisdictions.

---

### 3. `generators/ingest_utils.py`

**Purpose:** Shared utility library providing web scraping, LLM calls, compliance card generation, file I/O, and taxonomy mapping.

**Main functions:**
- `fetch_page_content()` — HTTP GET with User-Agent, timeout, error handling
- `fetch_multiple_pages()` — batch URL fetcher
- `call_llm()` — OpenAI completion wrapper with retry
- `extract_obligations_from_text()` — LLM-based obligation extraction
- `generate_compliance_card()` — builds card from extracted data
- `map_to_taxonomy()` — maps topics to taxonomy categories
- `compute_content_hash()` — deduplication helper
- `load_json()` / `save_json()` — file I/O

**Inputs:** URLs, taxonomy files, `.env`  
**Outputs:** Scraped text, parsed JSON, compliance card dicts

**External dependencies:** OpenAI API, `requests`, `beautifulsoup4`

**Reusability:** ✅ **Reusable as-is** — Well-structured, stateless functions with clean interfaces. Good retry/backoff logic.

**Risks:** Text truncation at 8K chars. No robots.txt checking. User-Agent spoofing.

---

### 4. `generators/ingest_ca.py`

**Purpose:** Ingests 5 California Labor Code sections using hardcoded manual text (bypasses scraping since CA .gov blocks bots).

**Reusability:** ❌ **Not reusable** — Entirely hardcoded. Useful only as a template pattern.

---

### 5. `generators/ingest_ny.py`

**Purpose:** Scrapes New York Labor Law articles/sections from the NY Senate website.

**Main functions:** `fetch_page()`, `clean_text()`, `extract_sections()`, `save_document()`, `ingest_target()`

**Inputs:** NY Senate website URLs (16 targets)  
**Outputs:** `data/source_docs/NY-LAB-*.json`

**External dependencies:** `requests`, `beautifulsoup4` (no LLM needed)

**Reusability:** ⚠️ **Reusable with changes** — Good scraping pattern for legislative sites. Needs new URL targets and selectors for other states.

**Risks:** Fragile CSS selectors tied to NY Senate site structure.

---

### 6. `generators/state_expansion.py`

**Purpose:** Config-driven state expansion — fetches content from official state websites, extracts obligations via LLM.

**Main functions:** `StateExpander` class with `run()`, `get_urls_to_fetch()`, `fetch_state_content()`, `extract_obligations()`

**Inputs:** `data/state_sources.json`, taxonomy, variables, CLI args  
**Outputs:** `raw_data/{state}_{topic}.json`

**External dependencies:** OpenAI API (via ingest_utils), `requests`, `beautifulsoup4`

**Reusability:** ⚠️ **Reusable with changes** — Clean architecture with dry-run mode. Superseded by autonomous_state_crawler but simpler and more readable.

---

### 7. `generators/regenerate_autonomous.py`

**Purpose:** Bulk-generates compliance cards for 4 jurisdictions × 38 topics using GPT-4o with zero source material.

**Reusability:** ❌ **Not reusable** — Generates unverified cards from LLM knowledge alone. Useful only for bootstrapping prototypes.

---

### 8. `ingestion/ecfr_client.py`

**Purpose:** Minimal client to fetch raw XML from the eCFR API (Title 29 — Labor).

**Main functions:** `fetch_flsa_admin_rule()`

**Inputs:** eCFR API endpoint (hardcoded)  
**Outputs:** `raw_data/flsa_admin_rule.xml`

**External dependencies:** eCFR API (`ecfr.gov`), stdlib only

**Reusability:** ⚠️ **Reusable with changes** — Pattern is sound but hardcoded to a single title/date. Needs parameterization.

---

### 9. `scripts/run_national_crawl.py`

**Purpose:** Resilient overnight batch runner — iterates all 50 states as isolated subprocesses with logging, timeouts, and resume capability.

**Main functions:** `run_national_crawl()`, `build_command()`

**Inputs:** CLI args (`--resume STATE`, `--dry-run`)  
**Outputs:** `logs/national_run_{timestamp}.log`

**External dependencies:** None directly (delegates to autonomous_state_crawler)

**Reusability:** ✅ **Reusable as-is** — Excellent subprocess orchestration with isolation, 30-min timeouts, resume, dry-run, and detailed logging.

---

### 10. `run_ingest.py`

**Purpose:** CLI runner for federal regulation ingestion from eCFR with 10 presets (FMLA, FLSA, OSHA, ADA, etc.).

**Reusability:** ✅ **Reusable as-is** — Clean CLI with well-structured presets.

---

### 11. `heal_missing_urls.py`

**Purpose:** Scans `raw_data/*.json` for cards missing source URLs, uses DuckDuckGo to find official .gov/.org URLs, patches files.

**Main functions:** `scan_for_broken_cards()`, `heal_card()`, `search_for_official_url()`

**External dependencies:** DuckDuckGo (`ddgs` package)

**Reusability:** ✅ **Reusable as-is** — Self-contained URL backfiller with dry-run mode, .gov/.org prioritization, Wikipedia filtering, rate limiting.

---

### 12. `audit_urls.py`

**Purpose:** Simple audit — reports which `raw_data/*.json` files are missing valid source URLs.

**Reusability:** ✅ **Reusable as-is** — Zero-dependency data quality checker (~50 lines).

---

### 13. `data/state_sources.json`

**Purpose:** Master configuration mapping all 50 states to official labor department websites, key page URLs, scraping strategies, and topic coverage.

**Structure:**
```json
{
  "metadata": { "generated_at": "...", "total_jurisdictions": 50 },
  "jurisdictions": [
    {
      "locality": "California",
      "state": "CA",
      "known_for": ["minimum_wage", "overtime_pay", ...],
      "spider_root": "https://www.dir.ca.gov/dlse/",
      "agency": "Department of Industrial Relations",
      "key_pages": { "minimum_wage": "https://...", ... },
      "scraping_strategy": "standard",
      "notes": "..."
    }
  ]
}
```

**Reusability:** ✅ **Reusable as-is** — Excellent curated reference data.

---

### 14. `data/city_hitlist.json`

**Purpose:** Registry of ~25 US cities with known local labor ordinances → spider root URLs.

**Structure:**
```json
{
  "New York City": { "state": "NY", "spider_root": "https://..." },
  "San Francisco": { "state": "CA", "spider_root": "https://..." },
  ...
}
```

**Reusability:** ✅ **Reusable as-is** — Valuable curated dataset of municipal labor law portals.

---

### 15. `raw_data/ca_minimum_wage.json` (Output Format)

**Structure (compliance card):**
```json
{
  "title": "California Minimum Wage",
  "topic": "minimum_wage",
  "category": "Compensation & Pay",
  "jurisdiction": { "type": "state", "state": "CA", "locality": "California" },
  "thresholds": { "employee_count": null, "revenue": null },
  "summary": "...",
  "variables": { "minimum_wage_hourly": 16.90, ... },
  "payload": { "universal": { ... } },
  "enforcement_directives": [ { "logic_groups": [...], "action_code": "PREVENT_PUBLISH" } ],
  "operational_triggers": { "requires_overtime_calc": true, ... },
  "notification_requirements": [...],
  "sources": [{ "url": "https://...", "title": "...", "retrieved": "..." }],
  "verification_status": "unverified"
}
```

---

## Reusability Tier List

### ✅ Tier 1: Reusable As-Is

| File | Why |
|------|-----|
| `generators/ingest_utils.py` | Clean utility functions — fetch, LLM call, card generation |
| `scripts/run_national_crawl.py` | Excellent batch orchestration pattern |
| `run_ingest.py` | Clean CLI for federal regulation ingestion |
| `heal_missing_urls.py` | Self-contained URL backfiller |
| `audit_urls.py` | Zero-dependency quality checker |
| `data/state_sources.json` | Curated 50-state URL manifest |
| `data/city_hitlist.json` | Curated city URL manifest |

### ⚠️ Tier 2: Reusable With Changes

| File | What Needs Changing |
|------|---------------------|
| `generators/autonomous_state_crawler.py` | Decompose 7.6K-line monolith into modules |
| `generators/jurisdiction_scout.py` | Add verification step after LLM generation |
| `generators/state_expansion.py` | Parameterize for new taxonomy |
| `generators/ingest_ny.py` | Generalize selectors for other legislative sites |
| `ingestion/ecfr_client.py` | Parameterize title/part/date |
| `data/master_jurisdictions.json` | Verify against ground truth |

### ❌ Tier 3: Not Reusable (Discard)

| File | Why |
|------|-----|
| `generators/ingest_ca.py` | Hardcoded text for 5 sections only |
| `generators/regenerate_autonomous.py` | Unverified LLM-only generation, no sources |

---

## Output Format Mapping

### Old Format (Compliance Card → `raw_data/*.json`)

```json
{
  "title": "California Minimum Wage",
  "topic": "minimum_wage",
  "category": "Compensation & Pay",
  "jurisdiction": { "type": "state", "state": "CA", "locality": "California" },
  "summary": "...",
  "variables": { "minimum_wage_hourly": 16.90 },
  "sources": [{ "url": "https://...", "title": "..." }],
  "verification_status": "unverified"
}
```

### New Format (third_rules_engine `LawSource`)

```json
{
  "title": "California Minimum Wage",
  "jurisdictionId": "<prisma-id-for-CA>",
  "lawCategoryId": "<prisma-id-for-State-Minimum-Wage>",
  "sourceUrl": "https://www.dir.ca.gov/dlse/faq_minimumwage.htm",
  "sourceAuthority": "California Department of Industrial Relations",
  "summary": "...",
  "structuredText": "{\"minimum_wage_hourly\": 16.90, ...}",
  "effectiveDate": null,
  "expirationDate": null,
  "status": "active",
  "verificationStatus": "auto_generated",
  "verificationNotes": "",
  "applicabilityVariableIds": ["<id-for-location.state>", "<id-for-employee.exemption_status>"]
}
```

### Mapping Rules

| Old Field | New Field | Transform |
|-----------|-----------|-----------|
| `title` | `title` | Direct copy |
| `jurisdiction.state` + `jurisdiction.locality` | `jurisdictionId` | Lookup in Jurisdiction table by state code + name |
| `topic` + `category` | `lawCategoryId` | Map topic → LawCategory via taxonomy alignment |
| `sources[0].url` | `sourceUrl` | Take first source URL |
| `sources[0].title` or `jurisdiction.agency` | `sourceAuthority` | Use source title or agency name |
| `summary` | `summary` | Direct copy |
| `variables` (key-value) | `structuredText` | JSON.stringify the variables object |
| (not present) | `effectiveDate` | Parse from text or leave null |
| (not present) | `expirationDate` | null |
| `verification_status` | `verificationStatus` | Map: "unverified" → "auto_generated", "verified" → "verified" |
| `variables` keys | `applicabilityVariableIds` | Map variable names → ApplicabilityVariable IDs |

---

## Minimum Subset Worth Porting

For the first iteration of crawler support in `third_rules_engine`, port:

1. **`generators/ingest_utils.py`** — Core utility layer (fetch, LLM, retry)
2. **`data/state_sources.json`** — 50-state URL manifest
3. **`data/city_hitlist.json`** — City URL manifest
4. **`heal_missing_urls.py`** — URL backfiller for cards missing sources
5. **`audit_urls.py`** — Quality checker
6. **`scripts/run_national_crawl.py`** — Batch orchestration pattern

Then extract these focused modules from `autonomous_state_crawler.py`:
- **URL Discovery** — `discover_spider_root()`, `spider_depth_1()`, link classification
- **Content Fetching** — `fetch_page_content()` with Playwright fallback
- **LLM Extraction** — `call_llm_structured()`, Pydantic schemas
- **Self-Healing** — `heal_spider_root()`, Tavily/DDG fallback

---

## What Should Be Discarded

1. **`generators/regenerate_autonomous.py`** — Generates unverified cards from LLM knowledge alone
2. **`generators/ingest_ca.py`** — Hardcoded text for 5 CA sections (stale)
3. **Global mutable state patterns** in the monolith
4. **`verification_status: "verified"` on unverified cards** — misleading
5. **Complex enforcement_directives schema** — over-engineered for an inventory browser

---

## Recommended Next Steps

1. **Create a `crawler/` directory** in `third_rules_engine` with focused modules:
   - `crawler/fetcher.ts` — HTTP fetch + Playwright fallback
   - `crawler/discovery.ts` — URL discovery and link classification
   - `crawler/extractor.ts` — LLM-based structured extraction
   - `crawler/healer.ts` — URL healing via search APIs
   - `crawler/orchestrator.ts` — Batch runner with isolation
   - `crawler/data/state-sources.json` — Ported manifest
   - `crawler/data/city-hitlist.json` — Ported manifest

2. **Define a CrawlerCandidate schema** that maps directly to `LawSource` creation

3. **Add a `PATCH /api/law-sources/import` endpoint** that accepts crawler output and creates LawSource records

4. **Port `ingest_utils.py` functions** to TypeScript equivalents

5. **Keep the crawler as a CLI tool** (not a background service) that produces JSON candidates for review before import
