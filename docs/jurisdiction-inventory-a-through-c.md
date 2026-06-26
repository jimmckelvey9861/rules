# Jurisdiction Inventory: Alabama through California

**Date:** 2025-05-30
**Scope:** AL, AK, AZ, AR, CA + CA local jurisdictions
**Method:** Curated official state/city URLs → URL health check → content assessment → structured rule extraction
**Auto-promoted:** None

---

## Results Summary

| Metric | Count |
|--------|-------|
| Jurisdictions processed | 12 (5 states + 7 CA locals) |
| Candidates created | 28 |
| Duplicates skipped | 2 |
| Rejected (broken URL) | 15 |
| Active candidates | 13 |
| With structured rule | 7 |
| Actionable (total) | 9 |
| LawSources (unchanged) | 19 |

---

## Candidates by State

| State | Total | Active | With Rule | Actionable | Notes |
|-------|-------|--------|-----------|-----------|-------|
| AL | 2 | 1 | 1 | 1 | No state minimum wage (follows federal) |
| AK | 1 | 1 | 1 | 1 | Strong state labor dept source |
| AZ | 3 | 1 | 0 | 0 | Paid sick leave + Tucson MW URLs broken |
| AR | 2 | 2 | 0 | 0 | Domain reachable but paths missing |
| CA | 20 | 8 | 5 | 7 | Many city URLs broken; state DIR strong |

---

## Best Candidate per Jurisdiction/Category

| Jurisdiction | Category | Best Candidate | Structured Rule | Confidence | Notes |
|-------------|----------|---------------|-----------------|-----------|-------|
| Alabama | State Minimum Wage | DOL State Minimum Wage — Alabama | ✓ | 0.80 | Redirected to DOL state page |
| Alaska | State Minimum Wage | Alaska Wage and Hour Act | ✓ | 0.98 | Strong state source |
| Arizona | State Minimum Wage | Arizona Minimum Wage | ✗ (not_actionable) | 0.75 | Page is navigational, no wage amount |
| Arkansas | State Minimum Wage | Arkansas Minimum Wage | ✗ (manual_review) | 0.90 | Domain reachable, path 403 |
| Arkansas | Weekly Overtime | Arkansas Overtime | ✗ (manual_review) | 0.85 | Domain reachable, path 403 |
| California | State Minimum Wage | California Minimum Wage FAQ | ✓ | 0.98 | $16.50/2025 extracted |
| California | Daily Overtime | California Overtime FAQ | ✓ | 0.98 | 8hr daily + 40hr weekly |
| California | Meal Breaks | California Meal Period FAQ | ☆ actionable | 0.95 | Needs meal_break extractor |
| California | Rest Breaks | California Rest Period FAQ | ☆ actionable | 0.95 | Needs rest_break extractor |
| Los Angeles | Local Minimum Wage | Los Angeles Minimum Wage | ✓ | 0.98 | $17.28/2025 extracted |
| Santa Monica | Local Minimum Wage | Santa Monica Minimum Wage | ✓ | 0.95 | Rate extracted |

---

## Categories with Actionable Structured Rules

| # | Jurisdiction | Category | Rule Type | Key Extraction |
|---|-------------|----------|-----------|---------------|
| 1 | Alabama | State Minimum Wage | `minimum_wage` | Federal rate applies ($7.25) |
| 2 | Alaska | State Minimum Wage | `minimum_wage` | State rate extracted |
| 3 | California | State Minimum Wage | `minimum_wage` | $16.50/2025 |
| 4 | California | Daily Overtime | `overtime` | 8hr daily + 40hr weekly, 1.5x |
| 5 | California | State Minimum Wage (History) | `minimum_wage` | Multi-year rates |
| 6 | Los Angeles | Local Minimum Wage | `minimum_wage` | $17.28/2025 |
| 7 | Santa Monica | Local Minimum Wage | `minimum_wage` | Rate extracted |

---

## Categories Requiring Manual Review

| Jurisdiction | Category | Issue | Recommendation |
|-------------|----------|-------|---------------|
| Arizona | State Minimum Wage | Page is navigational, no wage data | Find direct wage page |
| Arizona | Paid Sick Leave | URL broken (404) | Find current ICA page |
| Arizona (Tucson) | Local Minimum Wage | URL broken, repaired to parent | Find current Tucson MW page |
| Arkansas | State Minimum Wage | 403 Forbidden | Try alternate URL or manual check |
| Arkansas | Weekly Overtime | 403 Forbidden | Try alternate URL or manual check |
| California | Split Shift Premium | URL broken (404) | DIR restructured; find new path |
| California | Paid Sick Leave | URL broken (404) | DIR restructured; find new path |
| California | Final Pay Timing | URL broken (404) | DIR restructured; find new path |
| California | Reimbursements | URL broken (404) | DIR restructured; find new path |
| San Francisco | Minimum Wage | URL broken (sfgov.org restructured) | Find current OLSE page |
| San Francisco | Paid Sick Leave | URL broken | Find current OLSE page |
| Oakland | Minimum Wage | URL broken | Find current city page |
| San Jose | Minimum Wage | URL broken | Find current city page |
| Berkeley | Minimum Wage | URL broken | Find current city page |
| Emeryville | Minimum Wage | URL broken | Find current city page |
| West Hollywood | Minimum Wage | URL broken | Find current city page |

---

## Categories with No Law Found (Expected)

| Jurisdiction | Category | Reason |
|-------------|----------|--------|
| Alabama | Overtime | No state overtime law; federal FLSA applies |
| Alabama | Meal Breaks | No state requirement |
| Alabama | Paid Sick Leave | No state requirement |
| Alaska | Meal Breaks | Included in Wage and Hour Act (same URL) |
| Arizona | Overtime | No state overtime law beyond federal |

---

## Weak Candidates Rejected

15 candidates were rejected due to broken URLs (HTTP 404). Most are caused by:
1. **California DIR restructuring** — many `/dlse/faq_*.htm` paths no longer exist
2. **San Francisco sfgov.org restructuring** — OLSE pages moved
3. **City website redesigns** — Oakland, San Jose, Berkeley, Emeryville, West Hollywood

---

## New Extractor Strategies Needed

| Topic | Current Status | What's Needed |
|-------|---------------|---------------|
| `meal_break` | Actionable but no structuredRule | Extract break threshold (hours), duration (minutes), paid/unpaid |
| `rest_break` | Actionable but no structuredRule | Extract frequency, duration, paid status |
| `paid_sick_leave` | No healthy sources yet | Extract accrual rate, cap, usage rules, employer size |
| `final_pay` | No healthy sources yet | Extract timing rules (immediate, next payday, etc.) |
| `split_shift` | No healthy sources yet | Extract premium amount, conditions |

---

## Notes

- California DIR appears to have restructured their website. Many previously-valid `/dlse/faq_*.htm` URLs now return 404. The main DIR pages (`/dlse/faq_minimumwage.htm`, `/dlse/faq_overtime.htm`, `/dlse/faq_mealperiods.htm`, `/dlse/faq_restperiods.htm`) still work.
- San Francisco's OLSE has moved from `sfgov.org/olse/` to a new structure.
- Many California city minimum wage pages have moved as cities redesign their websites.
- Arkansas labor department returns 403 for direct page access (may require different User-Agent or accept cookies).
- No legal values were hard-coded. All rates and thresholds were extracted from source page content.
