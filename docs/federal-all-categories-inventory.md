# Federal All-Categories Source Inventory

**Date:** 2025-05-30
**Scope:** All federal law categories with discoverable authoritative sources
**Method:** Curated .gov URLs → URL health check → content assessment → structured rule extraction
**Auto-promoted:** None

---

## Results Summary

| Metric | Count |
|--------|-------|
| Categories crawled | 15 |
| Candidates created (this run) | 16 |
| Duplicates skipped | 9 |
| Rejected (broken URL) | 3 |
| Total federal candidates (active) | 17 |
| With structured rule | 10 |
| Actionable (no structured rule yet) | 3 |
| Unsure / insufficient data | 4 |
| LawSources (unchanged) | 16 |

---

## Inventory by Category

| Category | Best Candidate | Actionable | Structured Rule | Confidence | Notes |
|----------|---------------|-----------|-----------------|-----------|-------|
| 1.1 Minimum Wage | Federal Minimum Wage — WHD | ✓ | ✓ | 0.95 | `selectedRate: $7.25` |
| 1.2 Tipped Compensation | WHD Tips Guidance | ✓ | ✓ | 0.90 | Tip credit rules, no dollar amounts on page |
| 1.3 Overtime | Federal Overtime Pay — WHD | ✓ | ✓ | 0.95 | `threshold: 40hrs/workweek, rate: 1.5x` |
| 1.5 Compensable Time | 29 CFR Part 785 — Hours Worked | ✓ | ✓ | 0.95 | Travel, waiting, on-call, donning/doffing |
| 1.7 Equal Pay | EEOC Equal Pay/Compensation | ✓ | ✓ | 0.90 | EPA 1963, protected classes, defenses |
| 3.2 Family & Medical Leave | Family and Medical Leave Act — WHD | ✓ | ✓ | 0.95 | 12 weeks, 50 employees, qualifying reasons |
| 4.1 Hour Restrictions (Minors) | 29 CFR Part 570 — Child Labor | ✓ | ✓ | 0.90 | Age groups, hour limits, hazardous occupations |
| 5.3 Worker Classification | Worker Misclassification — WHD | ✓ | ✓ | 0.90 | Economic reality test, factors |
| 6.1 Anti-Discrimination | Title VII — EEOC | ✓ | ✓ | 0.95 | Protected classes, statutes, employer threshold |
| 6.4 Workplace Safety | OSH Act Full Text | ✓ | ✓ | 0.90 | General duty clause, OSHA obligations |
| 7.3 WARN Act | 20 CFR Part 639 — WARN Regulations | ✓ | ✓ | 0.90 | 100 employees, 60 days notice, triggers |
| 1.4 Premium Pay | (no strong federal source) | — | — | — | Limited federal private-sector premium pay |
| 1.6 Reimbursements | IRS Standard Mileage Rates | ✗ | ✗ | 0.55 | Not a labor law; IRS tax guidance only |
| 5.5 Employment Eligibility | Form I-9 — USCIS | ? unsure | ✗ | 0.90 | Valid source but topic mismatch for extractor |
| 8.2 Posting & Notice | Workplace Posters — WHD | ✓ | ✗ | 0.90 | Actionable but no structured extractor yet |

---

## Categories with Successful Structured Rule Generation

| # | Category | Rule Type | Key Fields Extracted |
|---|----------|-----------|---------------------|
| 1 | Minimum Wage | `minimum_wage` | selectedRate, rates, multiRate |
| 2 | Tipped Compensation | `tipped_compensation` | tipPooling, notificationRequired, calculation |
| 3 | Overtime | `overtime` | threshold (40hrs/workweek), premiumRate (1.5), appliesTo |
| 4 | Compensable Time | `compensable_time` | categories (travel, waiting, on-call, donning), principalActivityDoctrine |
| 5 | Equal Pay | `equal_pay` | protectedClasses, comparisonStandard, factors, affirmativeDefenses |
| 6 | Family & Medical Leave | `family_medical_leave` | leaveDuration, employerCoverage, employeeEligibility, qualifyingReasons |
| 7 | Minor Labor | `minor_labor` | minimumEmploymentAge, ageGroups, hazardousOccupationRestrictions |
| 8 | Worker Classification | `worker_classification` | classificationTests, factors, consequence |
| 9 | Anti-Discrimination | `anti_discrimination` | statutes, protectedClasses, employerCoverage, prohibitedActions |
| 10 | Workplace Safety | `workplace_safety` | generalDutyClause, obligations, penalties |
| 11 | WARN Act | `warn_act` | employerCoverage, noticeRequirement, triggers, exceptions |

---

## Categories with Candidates but Insufficient Data for Structured Rule

| Category | Issue | Recommendation |
|----------|-------|---------------|
| 1.3 Overtime (29 CFR 541) | Page covers exemption categories, not the overtime threshold itself | Already have WHD overtime page with rule; this is supplementary |
| 1.6 Reimbursements & Allowances | IRS mileage page is tax guidance, not labor law | No strong federal private-sector reimbursement mandate exists |
| 5.5 Employment Eligibility | I-9 page is valid but topic extractor doesn't match | Needs a dedicated `employment_eligibility` extractor |
| 8.2 Posting & Notice | WHD posters page is actionable but no `posting_notice` extractor | Needs a dedicated extractor for posting requirements |

---

## Categories Requiring Human Review

1. **1.4 Premium Pay** — No strong federal source for private sector. OPM premium pay applies only to federal government employees. Consider marking this cell "no_law_found" for federal.
2. **1.6 Reimbursements & Allowances** — Federal law has minimal private-sector reimbursement mandates (primarily FLSA wage deduction rules). Consider marking "no_law_found" or linking to 29 CFR 531.
3. **4.5 Restricted Occupations** — URL broken (404). Need to find current WHD hazardous occupations page.
4. **6.6 Whistleblower Protections** — URL broken (404). Need to find current OSHA whistleblower page.

---

## Categories Requiring New Extractor Strategy

| Category | What's Needed |
|----------|--------------|
| `posting_notice` | Extract list of required posters, applicability conditions, penalties |
| `employment_eligibility` | Extract I-9 requirements, E-Verify, timing rules |
| `whistleblower` | Extract covered activities, anti-retaliation provisions, filing deadlines |

---

## Broken URLs (Rejected)

| URL | Category | HTTP Status |
|-----|----------|-------------|
| https://www.dol.gov/agencies/whd/child-labor/hazardous | 4.5 Restricted Occupations | 404 |
| https://www.eeoc.gov/laws/guidance/employment-discrimination-overview | 6.1 Anti-Discrimination | 404 |
| https://www.osha.gov/whistleblower | 6.6 Whistleblower | 404 |

---

## Design Notes

- **No legal values are hard-coded.** All dollar amounts, thresholds, employee counts, and leave durations are extracted from the source page content by regex-based heuristics.
- **Evidence is separated from executable rules.** `actionableFacts.structuredRule` contains only machine-actionable fields; `actionableFacts.evidence` retains debug/provenance data.
- **Each category has its own schema.** The `ruleType` field identifies which schema applies. There is no universal rule format.
- **Extractors are deterministic.** No LLM is used. If the page doesn't contain recognizable patterns, the extractor returns null and the candidate remains "unsure."
