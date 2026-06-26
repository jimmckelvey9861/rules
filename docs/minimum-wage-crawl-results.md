# Minimum Wage Crawl Results

**Date**: 2026-06-05
**Scope**: State and local minimum wage
**Total candidates created**: 46
**Reviewable (with structured JSON)**: 21
**Non-reviewable**: 25
  - Broken URL: 0
  - Unsure/insufficient: 16
  - Not actionable: 4
**No seed URL**: Alabama, Louisiana, Mississippi, South Carolina, Tennessee

## Reviewable Candidates (Structured JSON)

| Jurisdiction | Type | URL |
|---|---|---|
| Boulder | municipality | https://boulderreportinglab.org/2024/10/11/boulder-city-council-approv |
| Georgia | state | https://dol.georgia.gov/minimum-wage |
| Hawaii | state | https://labor.hawaii.gov/wsd/minimum-wage/ |
| Massachusetts | state | https://www.mass.gov/minimum-wage-program |
| Minneapolis | municipality | https://www.minneapolismn.gov/news/2025/december/minimum-wage/ |
| Minnesota | state | https://www.dli.mn.gov/business/employment-practices/minimum-wage-minn |
| Missouri | state | https://labor.mo.gov/DLS/MinimumWage |
| Nevada | state | https://labor.nv.gov/Employer/Minimum_Wage/ |
| New Mexico | state | https://www.dws.state.nm.us/Minimum-Wage-Information |
| New York | state | https://dol.ny.gov/minimum-wage |
| North Carolina | state | https://www.labor.nc.gov/workplace-rights/employee-rights-regarding-ti |
| Oregon | state | https://www.oregon.gov/boli/workers/Pages/minimum-wage.aspx |
| Pennsylvania | state | https://www.dli.pa.gov/Individuals/Labor-Management-Relations/llc/mini |
| Redwood City | municipality | https://www.redwoodcity.org/departments/city-manager/city-manager-s-in |
| Richmond | municipality | https://www.ci.richmond.ca.us/2615/Minimum-Wage |
| San Jose | municipality | https://www.sanjoseca.gov/your-government/departments-offices/public-w |
| Santa Rosa | municipality | https://www.srcity.org/3164/Minimum-Wage |
| South Dakota | state | https://dlr.sd.gov/employment_laws/minimum_wage.aspx |
| Virginia | state | https://www.doli.virginia.gov/labor-law/virginia-minimum-wage/ |
| Washington | state | https://www.lni.wa.gov/workers-rights/wages/minimum-wage/ |
| Wisconsin | state | https://dwd.wisconsin.gov/er/laborstandards/minimumwage.htm |

## Non-Reviewable Candidates

| Jurisdiction | Status | Reason | URL |
|---|---|---|---|
| Albuquerque | ok | Insufficient data on page | https://codelibrary.amlegal.com/codes/albuquerque/ |
| Arkansas | manual_review | Unknown | https://labor.arkansas.gov/labor/labor-standards/m |
| Belmont | ok | Insufficient data on page | https://library.municode.com/ca/belmont/codes/code |
| Chicago | ok | Page not about minimum wage | https://chicago.councilmatic.org/legislation/o2023 |
| Colorado | manual_review | Unknown | https://cdle.colorado.gov/minimum-wage |
| Cupertino | ok | Insufficient data on page | https://www.cupertino.gov/files/assets/city/v/1/yo |
| Delaware | redirected | Insufficient data on page | https://labor.delaware.gov/divisions/industrial-af |
| Emeryville | ok | Insufficient data on page | https://www.emeryville.org/Services/Business/Labor |
| Idaho | redirected | Page not about minimum wage | https://www.labor.idaho.gov/businesses/wage-and-ho |
| Iowa | redirected | Page not about minimum wage | https://www.iowadivisionoflabor.gov/wage-hour |
| Kansas | manual_review | Unknown | https://www.dol.ks.gov/laws-regulations/employment |
| Kentucky | redirected | Page not about minimum wage | https://labor.ky.gov/standards/Pages/Wages-and-Hou |
| Los Altos | ok | Insufficient data on page | https://www.losaltosca.gov/DocumentCenter/View/143 |
| Mountain View | ok | Insufficient data on page | https://developmentpermits.mountainview.gov/about- |
| New York City | ok | Insufficient data on page | https://www.nyc.gov/site/dca/workers/workersrights |
| Ohio | ok | Insufficient data on page | https://com.ohio.gov/divisions-and-programs/indust |
| Pasadena | ok | Insufficient data on page | https://library.municode.com/ca/pasadena/codes/cod |
| Philadelphia | ok | Insufficient data on page | https://www.phila.gov/departments/department-of-la |
| Portland | unchecked | Unknown | https://www.portland.gov/bhr/employee-relations/la |
| San Diego | redirected | Insufficient data on page | https://www.sandiego.gov/compliance/minimum-wage |
| San Francisco | ok | Insufficient data on page | https://www.sf.gov/sites/default/files/2023-12/Lab |
| Santa Clara | ok | Insufficient data on page | https://files.santaclaracounty.gov/exjcpb1451/2023 |
| Santa Fe | ok | Insufficient data on page | https://santafenm.gov/media/ordinances_resolutions |
| Texas | ok | Insufficient data on page | https://www.twc.texas.gov/jobseekers/texas-minimum |
| Wyoming | manual_review | Unknown | https://dws.wyo.gov/dws-division/labor-standards/ |

## No Source URL Found

These jurisdictions have no seed URL for minimum wage:

- Alabama (AL)
- Louisiana (LA)
- Mississippi (MS)
- South Carolina (SC)
- Tennessee (TN)

## Post-Crawl Verification

Commands:

```bash
npm run crawl:all-mw          # crawl
npm run normalize:rules -- --dry-run  # normalization dry-run
npm run test:rules            # rule tests
```

## Verification Results

### Normalization Dry-Run

```
Total rules: 95
Normalized: 83 (0 with warnings)
Failed: 0
Skipped (unsupported type): 12

By type:
  minimum_wage: 71 success
  overtime: 9 success (1 warning — California double time fields)
  predictive_scheduling: 3 success
```

### Rule Tests

```
Results: 796 passed, 0 failed

Schema conformance: 71 minimum_wage, 9 overtime, 3 predictive_scheduling — all valid

Evaluator tests:
  ✅ Federal minimum wage returns $7.25
  ✅ California default rate: $16.50
  ✅ California fast food rate: $20.00 (condition: fast_food_worker)
  ✅ Federal overtime: 45 hrs, $20/hr, non-exempt → 5 OT hours, $150 OT pay
  ✅ Federal overtime: exempt → does not apply
  ✅ California daily overtime: 10 hrs/day → 2 OT hours
```
