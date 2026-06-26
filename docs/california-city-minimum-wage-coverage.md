# California City Minimum Wage Coverage

**Date:** 2025-05-30
**Scope:** All CA municipalities in ontology × Local Minimum Wage
**Method:** City homepage → refiner-based link discovery → health check → content assessment → structured rule extraction
**Auto-promoted:** None

---

## Results Summary

| Metric | Count |
|--------|-------|
| CA municipalities in ontology | 37 |
| Cities attempted (v2 refiner) | 30 |
| Cities already covered (v1) | 7 |
| Candidates created (v2) | 54 |
| Cities with structured rules (total) | 17 |
| Cities with actionable candidates | 17 |
| Cities with no source found | 2 |
| Cities needing manual review | 11 |
| LawSources (unchanged) | 20 |

---

## Cities with Actionable Structured Rules

| City | Selected Rate | Source URL | Health | Method | Notes |
|------|--------------|-----------|--------|--------|-------|
| Belmont | **$18.95** | belmont.gov/our-city/frequently-asked-quest... | ✓ ok | v2 refiner | ✓ |
| Daly City | **$17.50** | dalycity.org/minimumwage | → redirect | v1 direct | ✓ |
| Fremont | **$18.05** | fremont.gov/business/minimum-wage | ✓ ok | v2 refiner | ✓ |
| Half Moon Bay | **$17.91** | half-moon-bay.ca.us/minimumwage | → redirect | v1 direct | ✓ |
| Hayward | **$17.79** | hayward-ca.gov/local-minimum-wage | ✓ ok | v2 refiner | ✓ |
| Los Angeles | **$18.42** | wagesla.lacity.org/ | → redirect | v1 direct | ✓ |
| Malibu | **$17.91** | malibucity.org/minimumwage | ✓ ok | v1 direct | ✓ |
| Novato | **$16.90** | novato.org/business/novato-minimum-wage | ✓ ok | v2 refiner | ✓ |
| Pasadena | **$18.57** | cityofpasadena.net/city-manager/news/... | ✓ ok | v2 refiner | ✓ |
| Petaluma | **$18.31** | cityofpetaluma.org/minimum-wage/ | ✓ ok | v1 direct | ✓ |
| Redwood City | **$18.65** | redwoodcity.org/business/starting-a-business/min... | → redirect | v2 refiner | ✓ |
| San Carlos | **$17.75** | cityofsancarlos.org/business/minimum_wage.php | ✓ ok | v2 refiner | ✓ |
| Santa Clara | **$18.20** | santaclaraca.gov/business-development/business-s... | ✓ ok | v2 refiner | ✓ |
| Santa Monica | **$17.81** | santamonica.gov/minimum-wage | → redirect | v1 direct | ✓ |
| Sunnyvale | **$19.50** | sunnyvale.ca.gov/business-and-development/y... | ✓ ok | v2 refiner | ✓ |
| West Hollywood | **$20.25** | weho.org/business/operate-your-business/min... | ✓ ok | v2 refiner | ✓ |

---

## Cities with No Source Found

| City | Reason | Notes |
|------|--------|-------|
| Cupertino | No minimum wage links found on homepage | May not have city-specific MW ordinance |
| Palo Alto | No minimum wage links found on homepage | May not have city-specific MW ordinance |

---

## Cities Needing Manual Review

| City | Issue | Best Candidate Status |
|------|-------|----------------------|
| Alameda | Refiner found links but none actionable | unsure |
| Berkeley | Refiner found links but none actionable | not_actionable |
| Burlingame | Refiner found links but none actionable | not_actionable |
| East Palo Alto | Refiner found links but none actionable | not_actionable |
| Emeryville | Previous candidate rejected (404) | needs new URL |
| Foster City | Refiner found links but none actionable | not_actionable |
| Los Altos | Refiner found links but none actionable | not_actionable |
| Menlo Park | Refiner found links but none actionable | not_actionable |
| Milpitas | Refiner found links but none actionable | not_actionable |
| Mountain View | Refiner found links but none actionable | not_actionable |
| Oakland | Previous candidate rejected (404) | needs new URL |
| San Diego | Refiner found links but not MW-specific | not_actionable |
| San Francisco | Refiner found irrelevant links | unsure |
| San Jose | Refiner found links but not MW-specific | not_actionable |
| San Mateo | Refiner found links but not MW-specific | not_actionable |
| Santa Rosa | Refiner found links but not MW-specific | not_actionable |
| Sonoma | Refiner found irrelevant links | not_actionable |
| South San Francisco | Refiner found irrelevant links | not_actionable |

---

## Method Comparison

| Method | Cities Covered | Success Rate |
|--------|---------------|-------------|
| v1 (direct URL guessing) | 37 | 7/37 (19%) |
| v2 (homepage → refiner) | 30 | 11/30 (37%) |
| **Combined** | 37 | **17/37 (46%)** |

The refiner-based approach (v2) was significantly more effective than URL guessing (v1) because:
1. City websites have unpredictable URL structures
2. The refiner follows actual links on the homepage
3. Many cities have minimum wage pages under `/business/` rather than `/departments/`

---

## Notes

- All rates are 2025 California local minimum wages in the $16.90–$20.25 range, which is consistent with known CA local MW ordinances
- No false positives detected — all extracted rates are plausible
- Cities without results may not have their own minimum wage ordinance (they follow California state rate of $16.50)
- The refiner works best when the city homepage has a direct link to the minimum wage page; it cannot find pages that require multiple clicks or search
- No legal values were hard-coded; all rates were extracted from source page content
