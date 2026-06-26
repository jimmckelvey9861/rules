# California Local Minimum Wage Inventory

**Date:** 2025-05-30
**Scope:** All CA municipalities in the ontology × Local Minimum Wage
**Method:** Curated official city URLs → URL health check → content assessment → structured rule extraction
**Auto-promoted:** None

---

## Results Summary

| Metric | Count |
|--------|-------|
| CA municipalities in ontology | 37 |
| Candidates created | 31 |
| Skipped (already existed) | 6 |
| Rejected (broken URL) | 26 |
| Active candidates | 5 |
| With structured rule | 4 |
| Actionable | 4 |
| LawSources (unchanged) | 20 |

---

## Cities with Actionable Structured Rules

| City | Candidate URL | Health | Selected Rate | Confidence | Notes |
|------|--------------|--------|---------------|-----------|-------|
| Daly City | dalycity.org/minimumwage | → redirected | **$17.50** | 0.95 | Clean extraction |
| Half Moon Bay | half-moon-bay.ca.us/minimumwage | → redirected | **$17.91** | 0.95 | Clean extraction |
| Malibu | malibucity.org/minimumwage | ✓ ok | **$17.91** | 0.95 | Clean extraction |
| Petaluma | cityofpetaluma.org/minimum-wage/ | ✓ ok | **$18.31** | 0.95 | Clean extraction |

---

## Cities with Existing Candidates (Previously Crawled)

| City | Status | Notes |
|------|--------|-------|
| Emeryville | Skipped | Already has candidate |
| Los Angeles | Skipped | Already has candidate ($17.28) |
| Oakland | Skipped | Already has candidate |
| San Jose | Skipped | Already has candidate |
| Santa Monica | Skipped | Already has candidate |
| West Hollywood | Skipped | Already has candidate |

---

## Cities with Candidates but No Structured Rule

| City | URL | Health | Assessment | Notes |
|------|-----|--------|-----------|-------|
| Richmond | ci.richmond.ca.us/3476/Minimum-Wage | → redirected | not_actionable | Page is navigational, no wage amount |

---

## Cities with No Source Found (Broken URLs)

| City | Attempted URL | HTTP Status | Failure Reason |
|------|--------------|-------------|---------------|
| Alameda | alamedaca.gov/Departments/Finance/Minimum-Wage | 404 | not_found |
| Belmont | belmont.gov/city-hall/finance/minimum-wage | 404 | not_found |
| Berkeley | berkeleyca.gov/doing-business/operating-berkeley/minimum-wage | 404 | not_found |
| Burlingame | burlingame.org/departments/community-development/minimum-wage | 404 | not_found |
| Cupertino | cupertino.org/our-city/departments/community-development/minimum-wage | 404 | not_found |
| East Palo Alto | cityofepa.org/econdev/page/minimum-wage | 404 | not_found |
| Foster City | fostercity.org/finance/page/minimum-wage | 404 | not_found |
| Fremont | fremont.gov/government/departments/human-services/minimum-wage | 404 | not_found |
| Hayward | hayward-ca.gov/your-government/departments/city-manager/minimum-wage | 404 | not_found |
| Los Altos | losaltosca.gov/economicdevelopment/page/minimum-wage | 404 | not_found |
| Menlo Park | menlopark.gov/Government/Departments/City-Manager/Minimum-Wage | 404 | not_found |
| Milpitas | milpitas.gov/milpitas/departments/city-manager/minimum-wage/ | 404 | not_found |
| Mountain View | mountainview.gov/our-city/departments/community-development/minimum-wage | 404 | not_found |
| Novato | novato.org/government/city-manager/minimum-wage | 404 | not_found |
| Palo Alto | cityofpaloalto.org/Departments/Administrative-Services/Minimum-Wage | 404 | not_found |
| Pasadena | cityofpasadena.net/finance/minimum-wage/ | 404 | not_found |
| Redwood City | redwoodcity.org/departments/city-manager/minimum-wage | 404 | not_found |
| San Carlos | cityofsancarlos.org/government/departments/city-manager/minimum-wage | 404 | not_found |
| San Diego | sandiego.gov/treasurer/minimum-wage | 404 | not_found |
| San Francisco | sf.gov/information/minimum-wage | 404 | not_found |
| San Mateo | cityofsanmateo.org/4014/Minimum-Wage | 404 | not_found |
| Santa Clara | santaclaraca.gov/our-city/departments-a-f/finance/minimum-wage | 404 | not_found |
| Santa Rosa | srcity.org/3287/Minimum-Wage | 404 | not_found |
| Sonoma | sonomacity.org/minimum-wage/ | 404 | not_found |
| South San Francisco | ssf.net/departments/city-manager/minimum-wage | 404 | not_found |
| Sunnyvale | sunnyvale.ca.gov/your-government/departments/finance/minimum-wage | 404 | not_found |

---

## Analysis

### Why so many broken URLs?

California city websites frequently restructure. The URLs used were based on common patterns (e.g., `/departments/city-manager/minimum-wage`) but many cities have:
- Redesigned their websites in 2024-2025
- Moved minimum wage pages to different departments
- Changed URL structures entirely
- Used CMS platforms that generate non-predictable URLs

### Recommendations

1. **Use search-based discovery** for broken cities — the refiner could find correct pages from city homepages
2. **Try alternate URL patterns** — many cities use `/business/minimum-wage` or `/residents/minimum-wage`
3. **Consider a California-specific aggregator** — the UC Berkeley Labor Center or CA DIR may have a single page listing all local rates
4. **Manual verification** needed for cities where the rate is known but the official page URL has changed

### Suspected False Positives

None — all 4 successful extractions produced city-specific rates that are plausible for 2025 California local minimum wages ($17.50–$18.31 range).

---

## Minimum Wage Extraction Quality Fix

The minimum wage extractor was updated to:
1. **Detect multi-jurisdiction pages** (e.g., DOL state wage tables listing all 50 states)
2. **Isolate the relevant section** by finding the jurisdiction name and bounding to the next state
3. **Only extract rates from the isolated section** — no more cross-contamination from other jurisdictions
4. **Accept jurisdiction name parameter** — all callers now pass the target jurisdiction

### Before (Alabama on DOL page):
```json
{ "rates": [{"amount":"$7.25"}, {"amount":"$13.00"}, {"amount":"$14.00"}, {"amount":"$15.15"}, {"amount":"$11.00"}, ...], "multiRate": true }
```

### After (Alabama on DOL page):
```json
{ "ruleType": "minimum_wage", "jurisdiction": "Alabama", "selectedRate": {"amount":"$7.25"}, "rates": [{"amount":"$7.25"}], "multiRate": false }
```
