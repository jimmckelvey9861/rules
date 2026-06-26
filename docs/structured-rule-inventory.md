# Structured Rule Inventory Report

**Generated**: 2026-06-01
**Total rules analyzed**: 73
**Sources**: LawSources + Reviewable Candidates
**Rule types found**: 11

| Rule Type | Count | Sources |
|-----------|-------|---------|
| `minimum_wage` | 41 | LawSource: 17, Candidate: 24 |
| `unknown` | 15 | LawSource: 15 |
| `overtime` | 7 | LawSource: 1, Candidate: 6 |
| `anti_discrimination` | 2 | LawSource: 1, Candidate: 1 |
| `workplace_safety` | 2 | Candidate: 2 |
| `warn_act` | 1 | LawSource: 1 |
| `family_medical_leave` | 1 | LawSource: 1 |
| `predictive_scheduling` | 1 | LawSource: 1 |
| `worker_classification` | 1 | Candidate: 1 |
| `minor_labor` | 1 | Candidate: 1 |
| `equal_pay` | 1 | Candidate: 1 |

---

## `minimum_wage`

**Records**: 41

### Observed Fields

| Field | Frequency | Types Observed | Sample Values |
|-------|-----------|----------------|---------------|
| `rates` | 41/41 | list[dict] (38), list[empty] (3) | [{'amount': '$13.00', 'condition': None, 'conditionDetail': ; [{'year': None, 'amount': '$7.25'}]; [{'amount': '$17.50', 'condition': None, 'conditionDetail':  |
| `ruleType` | 41/41 | str (41) | 'minimum_wage' |
| `multiRate` | 41/41 | bool (41) | False; True |
| `jurisdiction` | 41/41 | str (41) | 'Alaska'; 'Alabama'; 'Daly City' |
| `notes` | 40/41 | NoneType (38), str (2) | None; 'Source page appears to be historical; rate may need verific |
| `confidence` | 40/41 | str (40) | 'medium'; 'high'; 'low' |
| `defaultRate` | 40/41 | str (40) | '$13.00'; '$17.50'; '$17.91' |
| `effectiveYear` | 40/41 | str (40) | '2025'; '2026'; 'unknown' |
| `selectedRate` | 1/41 | dict (1) | {'year': 'unknown', 'amount': '$7.25', 'reason': 'highest_am |

### Inconsistencies

- `notes`: mixed types — NoneType, str
- `rates`: mixed types — list[empty], list[dict]

### Potential Applicability Fields

- `rates` (contains condition data)

### Potential Evidence/Debug Fields

- `notes`
- `confidence`

### Sample Records

**Sample 1** — Alaska (LawSource)

```json
{
  "notes": null,
  "rates": [
    {
      "amount": "$13.00",
      "condition": null,
      "conditionDetail": null
    }
  ],
  "ruleType": "minimum_wage",
  "multiRate": false,
  "confidence": "medium",
  "defaultRate": "$13.00",
  "jurisdiction": "Alaska",
  "effectiveYear": "2025"
}
```

**Sample 2** — San Carlos (Candidate)

```json
{
  "notes": null,
  "rates": [
    {
      "amount": "$17.75",
      "condition": null,
      "conditionDetail": null
    }
  ],
  "ruleType": "minimum_wage",
  "multiRate": false,
  "confidence": "high",
  "defaultRate": "$17.75",
  "jurisdiction": "San Carlos",
  "effectiveYear": "2026"
}
```

**Sample 3** — Denver (Candidate)

```json
{
  "notes": null,
  "rates": [
    {
      "amount": "$19.29",
      "condition": null,
      "conditionDetail": null
    }
  ],
  "ruleType": "minimum_wage",
  "multiRate": false,
  "confidence": "high",
  "defaultRate": "$19.29",
  "jurisdiction": "Denver",
  "effectiveYear": "2026"
}
```

---

## `unknown`

**Records**: 15

### Observed Fields

| Field | Frequency | Types Observed | Sample Values |
|-------|-----------|----------------|---------------|
| `minimum_wage` | 4/15 | float (4) | 16.5; 7.25; 15.95 |
| `basis` | 4/15 | str (4) | 'hourly' |
| `applies_to` | 4/15 | str (4) | 'all employees'; 'covered nonexempt employees'; 'all employees working 2+ hours per week in SF' |
| `selectedRate` | 4/15 | dict (4) | {'amount': '$19.29', 'year': '2026', 'reason': 'current_year; {'amount': '$7.25', 'year': 'unknown', 'reason': 'highest_am; {'amount': '$21.30', 'year': '2026', 'reason': 'current_year |
| `rates` | 4/15 | list[dict] (4) | [{'amount': '$19.29', 'year': '2026'}, {'amount': '$19.29', ; [{'amount': '$19.29', 'year': '2026'}, {'amount': '$18.81', ; [{'amount': '$7.25', 'year': None}] |
| `multiRate` | 4/15 | bool (4) | True; False |
| `effective_date` | 3/15 | str (3) | '2025-01-01'; '2024-07-01' |
| `overtime_multiplier` | 2/15 | float (2) | 1.5 |
| `employer_threshold` | 2/15 | int (2) | 50; 100 |
| `advance_notice_days` | 2/15 | int (2) | 14 |
| `covered_industries` | 2/15 | list[str] (2) | ['fast_food', 'retail']; ['retail', 'food_service'] |
| `adjustment` | 2/15 | str (2) | 'annual CPI, capped at 3.5%'; 'annual CPI' |
| `daily_threshold_hours` | 1/15 | int (1) | 8 |
| `daily_double_threshold_hours` | 1/15 | int (1) | 12 |
| `double_time_multiplier` | 1/15 | int (1) | 2 |
| `seventh_day` | 1/15 | str (1) | '1.5x for first 8 hours, 2x thereafter' |
| `first_break` | 1/15 | dict (1) | {'threshold_hours': 5, 'duration_minutes': 30} |
| `second_break` | 1/15 | dict (1) | {'threshold_hours': 10, 'duration_minutes': 30} |
| `waiver` | 1/15 | str (1) | 'First break waivable if shift ≤ 6 hours by mutual consent.  |
| `penalty` | 1/15 | str (1) | '1 hour of pay at regular rate for each day a compliant brea |
| `fast_food_minimum_wage` | 1/15 | int (1) | 20 |
| `leave_weeks` | 1/15 | int (1) | 12 |
| `employee_eligibility` | 1/15 | str (1) | '12 months employed, 1,250 hours worked in prior 12 months' |
| `qualifying_reasons` | 1/15 | list[str] (1) | ['birth/adoption', 'serious health condition', 'family membe |
| `overtime_threshold_weekly` | 1/15 | int (1) | 40 |
| `notice_days` | 1/15 | int (1) | 60 |
| `triggers` | 1/15 | list[str] (1) | ['plant closing (50+ employees)', 'mass layoff (500+ employe |
| `fast_food_employer_threshold` | 1/15 | int (1) | 30 |
| `retail_employer_threshold` | 1/15 | int (1) | 20 |
| `premium` | 1/15 | str (1) | 'schedule change premium of $10-$75 depending on change type |
| `region` | 1/15 | str (1) | 'Portland Metro Area (urban growth boundary of the Metro reg |
| `employer_threshold_global` | 1/15 | int (1) | 500 |
| `premium_model` | 1/15 | dict (1) | {'add': {'type': 'flat_hours', 'hours': 1}, 'cancel': {'type |
| `weekly_threshold_hours` | 1/15 | int (1) | 40 |

### Inconsistencies

- `minimum_wage` vs `fast_food_minimum_wage` — potentially redundant
- `employer_threshold` vs `fast_food_employer_threshold` — potentially redundant
- `employer_threshold` vs `retail_employer_threshold` — potentially redundant
- `employer_threshold` vs `employer_threshold_global` — potentially redundant
- `notice_days` vs `advance_notice_days` — potentially redundant
- `premium` vs `premium_model` — potentially redundant

### Potential Applicability Fields

- `daily_threshold_hours`
- `daily_double_threshold_hours`
- `applies_to`
- `employer_threshold`
- `employee_eligibility`
- `overtime_threshold_weekly`
- `covered_industries`
- `fast_food_employer_threshold`
- `retail_employer_threshold`
- `employer_threshold_global`
- `weekly_threshold_hours`

### Potential Evidence/Debug Fields

- None identified.

### Sample Records

**Sample 1** — California (LawSource)

```json
{
  "daily_threshold_hours": 8,
  "daily_double_threshold_hours": 12,
  "overtime_multiplier": 1.5,
  "double_time_multiplier": 2,
  "seventh_day": "1.5x for first 8 hours, 2x thereafter"
}
```

**Sample 2** — Federal (LawSource)

```json
{
  "selectedRate": {
    "amount": "$7.25",
    "year": "unknown",
    "reason": "highest_amount"
  },
  "rates": [
    {
      "amount": "$7.25",
      "year": null
    }
  ],
  "multiRate": false
}
```

**Sample 3** — Washington (LawSource)

```json
{
  "weekly_threshold_hours": 40,
  "overtime_multiplier": 1.5,
  "applies_to": "non-exempt employees"
}
```

---

## `overtime`

**Records**: 7

### Observed Fields

| Field | Frequency | Types Observed | Sample Values |
|-------|-----------|----------------|---------------|
| `basis` | 7/7 | str (7) | 'weekly_hours' |
| `ruleType` | 7/7 | str (7) | 'overtime' |
| `appliesTo` | 7/7 | dict (7) | {'employee.exemption_status': 'non_exempt'} |
| `threshold` | 7/7 | dict (7) | {'hours': 40, 'period': 'workweek'}; {'hours': 45, 'period': 'workweek'} |
| `calculation` | 7/7 | dict (7) | {'overtimePay': 'overtimeHours * regular_rate * 1.5', 'overt |
| `premiumRate` | 7/7 | float (7) | 1.5 |
| `jurisdiction` | 7/7 | str (7) | 'federal' |

### Inconsistencies

- None detected.

### Potential Applicability Fields

- `appliesTo`
- `threshold`

### Potential Evidence/Debug Fields

- None identified.

### Sample Records

**Sample 1** — Federal (LawSource)

```json
{
  "basis": "weekly_hours",
  "ruleType": "overtime",
  "appliesTo": {
    "employee.exemption_status": "non_exempt"
  },
  "threshold": {
    "hours": 40,
    "period": "workweek"
  },
  "calculation": {
    "overtimePay": "overtimeHours * regular_rate * 1.5",
    "overtimeHours": "max(0, hours_worked_in_workweek - 40)"
  },
  "premiumRate": 1.5,
  "jurisdiction": "federal"
}
```

**Sample 2** — Federal (Candidate)

```json
{
  "basis": "weekly_hours",
  "ruleType": "overtime",
  "appliesTo": {
    "employee.exemption_status": "non_exempt"
  },
  "threshold": {
    "hours": 40,
    "period": "workweek"
  },
  "calculation": {
    "overtimePay": "overtimeHours * regular_rate * 1.5",
    "overtimeHours": "max(0, hours_worked_in_workweek - 40)"
  },
  "premiumRate": 1.5,
  "jurisdiction": "federal"
}
```

**Sample 3** — Federal (Candidate)

```json
{
  "basis": "weekly_hours",
  "ruleType": "overtime",
  "appliesTo": {
    "employee.exemption_status": "non_exempt"
  },
  "threshold": {
    "hours": 40,
    "period": "workweek"
  },
  "calculation": {
    "overtimePay": "overtimeHours * regular_rate * 1.5",
    "overtimeHours": "max(0, hours_worked_in_workweek - 40)"
  },
  "premiumRate": 1.5,
  "jurisdiction": "federal"
}
```

---

## `anti_discrimination`

**Records**: 2

### Observed Fields

| Field | Frequency | Types Observed | Sample Values |
|-------|-----------|----------------|---------------|
| `ruleType` | 2/2 | str (2) | 'anti_discrimination' |
| `statutes` | 2/2 | list[str] (2) | ['Title VII of the Civil Rights Act of 1964', 'Genetic Infor |
| `appliesTo` | 2/2 | dict (2) | {'employer.total_employees_global': '>= 15'} |
| `jurisdiction` | 2/2 | str (2) | 'federal' |
| `protectedClasses` | 2/2 | list[str] (2) | ['race', 'color', 'religion', 'sex', 'national_origin', 'age |
| `enforcementAgency` | 2/2 | str (2) | 'EEOC' |
| `prohibitedActions` | 2/2 | list[str] (2) | ['hiring', 'firing', 'compensation', 'terms_and_conditions', |

### Inconsistencies

- None detected.

### Potential Applicability Fields

- `appliesTo`

### Potential Evidence/Debug Fields

- None identified.

### Sample Records

**Sample 1** — Federal (LawSource)

```json
{
  "ruleType": "anti_discrimination",
  "statutes": [
    "Title VII of the Civil Rights Act of 1964",
    "Genetic Information Nondiscrimination Act"
  ],
  "appliesTo": {
    "employer.total_employees_global": ">= 15"
  },
  "jurisdiction": "federal",
  "protectedClasses": [
    "race",
    "color",
    "religion",
    "sex",
    "national_origin",
    "age",
    "disability",
    "genetic_information",
    "pregnancy"
  ],
  "enforcementAgency": "EEOC",
  "prohibitedActions": [
    "hiring",
    "firing",
    "compensation",
    "terms_and_conditions",
    "harassment",
    "retaliation"
  ]
}
```

**Sample 2** — Federal (Candidate)

```json
{
  "ruleType": "anti_discrimination",
  "statutes": [
    "Title VII of the Civil Rights Act of 1964",
    "Genetic Information Nondiscrimination Act"
  ],
  "appliesTo": {
    "employer.total_employees_global": ">= 15"
  },
  "jurisdiction": "federal",
  "protectedClasses": [
    "race",
    "color",
    "religion",
    "sex",
    "national_origin",
    "age",
    "disability",
    "genetic_information",
    "pregnancy"
  ],
  "enforcementAgency": "EEOC",
  "prohibitedActions": [
    "hiring",
    "firing",
    "compensation",
    "terms_and_conditions",
    "harassment",
    "retaliation"
  ]
}
```

---

## `workplace_safety`

**Records**: 2

### Observed Fields

| Field | Frequency | Types Observed | Sample Values |
|-------|-----------|----------------|---------------|
| `statute` | 2/2 | str (2) | 'Occupational Safety and Health Act of 1970' |
| `ruleType` | 2/2 | str (2) | 'workplace_safety' |
| `appliesTo` | 2/2 | dict (2) | {'employer.type': 'private_sector_or_federal_agency'} |
| `obligations` | 2/2 | list[str] (2) | ['recordkeeping', 'injury_reporting', 'safety_training', 'po; ['general_duty_clause', 'recordkeeping', 'injury_reporting', |
| `jurisdiction` | 2/2 | str (2) | 'federal' |
| `enforcementAgency` | 2/2 | str (2) | 'OSHA' |
| `generalDutyClause` | 1/2 | str (1) | 'Employer shall furnish a place of employment free from reco |

### Inconsistencies

- None detected.

### Potential Applicability Fields

- `appliesTo`

### Potential Evidence/Debug Fields

- None identified.

### Sample Records

**Sample 1** — Federal (Candidate)

```json
{
  "statute": "Occupational Safety and Health Act of 1970",
  "ruleType": "workplace_safety",
  "appliesTo": {
    "employer.type": "private_sector_or_federal_agency"
  },
  "obligations": [
    "recordkeeping",
    "injury_reporting",
    "safety_training",
    "poster_display"
  ],
  "jurisdiction": "federal",
  "enforcementAgency": "OSHA"
}
```

**Sample 2** — Federal (Candidate)

```json
{
  "statute": "Occupational Safety and Health Act of 1970",
  "ruleType": "workplace_safety",
  "appliesTo": {
    "employer.type": "private_sector_or_federal_agency"
  },
  "obligations": [
    "general_duty_clause",
    "recordkeeping",
    "injury_reporting",
    "safety_training",
    "poster_display"
  ],
  "jurisdiction": "federal",
  "enforcementAgency": "OSHA",
  "generalDutyClause": "Employer shall furnish a place of employment free from recognized hazards causing or likely to cause death or serious physical harm"
}
```

---

## `warn_act`

**Records**: 1

### Observed Fields

| Field | Frequency | Types Observed | Sample Values |
|-------|-----------|----------------|---------------|
| `ruleType` | 1/1 | str (1) | 'warn_act' |
| `triggers` | 1/1 | list[str] (1) | ['plant_closing', 'mass_layoff', 'reduction_in_force'] |
| `appliesTo` | 1/1 | dict (1) | {'employer.total_employees_global': '>= 100'} |
| `exceptions` | 1/1 | list[str] (1) | ['faltering_company', 'unforeseeable_business_circumstances' |
| `jurisdiction` | 1/1 | str (1) | 'federal' |
| `employerCoverage` | 1/1 | dict (1) | {'type': 'full_time_equivalent', 'minimumEmployees': 100} |
| `noticeRequirement` | 1/1 | dict (1) | {'days': 60, 'type': 'calendar_days', 'written': True} |

### Inconsistencies

- None detected.

### Potential Applicability Fields

- `appliesTo`
- `employerCoverage`

### Potential Evidence/Debug Fields

- None identified.

### Sample Records

**Sample 1** — Federal (LawSource)

```json
{
  "ruleType": "warn_act",
  "triggers": [
    "plant_closing",
    "mass_layoff",
    "reduction_in_force"
  ],
  "appliesTo": {
    "employer.total_employees_global": ">= 100"
  },
  "exceptions": [
    "faltering_company",
    "unforeseeable_business_circumstances",
    "natural_disaster"
  ],
  "jurisdiction": "federal",
  "employerCoverage": {
    "type": "full_time_equivalent",
    "minimumEmployees": 100
  },
  "noticeRequirement": {
    "days": 60,
    "type": "calendar_days",
    "written": true
  }
}
```

---

## `family_medical_leave`

**Records**: 1

### Observed Fields

| Field | Frequency | Types Observed | Sample Values |
|-------|-----------|----------------|---------------|
| `ruleType` | 1/1 | str (1) | 'family_medical_leave' |
| `appliesTo` | 1/1 | dict (1) | {'employee.tenure_months': '>= 12', 'employer.total_employee |
| `jurisdiction` | 1/1 | str (1) | 'federal' |
| `jobProtection` | 1/1 | bool (1) | False |
| `leaveDuration` | 1/1 | dict (1) | {'paid': False, 'weeks': 12, 'period': '12_month_period'} |
| `employerCoverage` | 1/1 | dict (1) | {'scope': 'within_75_miles', 'minimumEmployees': 50} |
| `qualifyingReasons` | 1/1 | list[str] (1) | ['birth_or_placement', 'serious_health_condition', 'care_for |
| `employeeEligibility` | 1/1 | dict (1) | {'hoursWorked': 1250} |
| `benefitsContinuation` | 1/1 | bool (1) | True |

### Inconsistencies

- None detected.

### Potential Applicability Fields

- `appliesTo`
- `employerCoverage`
- `employeeEligibility`

### Potential Evidence/Debug Fields

- None identified.

### Sample Records

**Sample 1** — Federal (LawSource)

```json
{
  "ruleType": "family_medical_leave",
  "appliesTo": {
    "employee.tenure_months": ">= 12",
    "employer.total_employees_global": ">= 50"
  },
  "jurisdiction": "federal",
  "jobProtection": false,
  "leaveDuration": {
    "paid": false,
    "weeks": 12,
    "period": "12_month_period"
  },
  "employerCoverage": {
    "scope": "within_75_miles",
    "minimumEmployees": 50
  },
  "qualifyingReasons": [
    "birth_or_placement",
    "serious_health_condition",
    "care_for_family_member",
    "military_family"
  ],
  "employeeEligibility": {
    "hoursWorked": 1250
  },
  "benefitsContinuation": true
}
```

---

## `predictive_scheduling`

**Records**: 1

### Observed Fields

| Field | Frequency | Types Observed | Sample Values |
|-------|-----------|----------------|---------------|
| `ruleType` | 1/1 | str (1) | 'predictive_scheduling' |
| `jurisdiction` | 1/1 | str (1) | 'New York City' |
| `coveredIndustries` | 1/1 | list[str] (1) | ['fast_food', 'retail', 'utility_safety'] |
| `scheduleChangePenalties` | 1/1 | list[dict] (1) | [{'industry': 'fast_food', 'advanceNotice': {'days': 14}, 'p |
| `restrictions` | 1/1 | dict (1) | {'onCallBan': True, 'clopening': {'premium': '$100', 'rightT |
| `appliesTo` | 1/1 | dict (1) | {'business.industry_tags': ['fast_food', 'retail', 'utility_ |

### Inconsistencies

- None detected.

### Potential Applicability Fields

- `coveredIndustries`
- `appliesTo`

### Potential Evidence/Debug Fields

- None identified.

### Sample Records

**Sample 1** — New York City (LawSource)

```json
{
  "ruleType": "predictive_scheduling",
  "jurisdiction": "New York City",
  "coveredIndustries": [
    "fast_food",
    "retail",
    "utility_safety"
  ],
  "scheduleChangePenalties": [
    {
      "industry": "fast_food",
      "advanceNotice": {
        "days": 14
      },
      "premiumPay": {
        "type": "fixed",
        "amount": "$100"
      }
    },
    {
      "industry": "retail",
      "advanceNotice": {
        "hours": 72
      }
    }
  ],
  "restrictions": {
    "onCallBan": true,
    "clopening": {
      "premium": "$100",
      "rightToRefuse": true
    },
    "justCauseRequired": true,
    "accessToHoursRequired": true
  },
  "appliesTo": {
    "business.industry_tags": [
      "fast_food",
      "retail",
      "utility_safety"
    ]
  }
}
```

---

## `worker_classification`

**Records**: 1

### Observed Fields

| Field | Frequency | Types Observed | Sample Values |
|-------|-----------|----------------|---------------|
| `factors` | 1/1 | list[str] (1) | ['type_of_relationship'] |
| `ruleType` | 1/1 | str (1) | 'worker_classification' |
| `appliesTo` | 1/1 | dict (1) | {'employee.classification': 'requires_determination'} |
| `consequence` | 1/1 | str (1) | 'Misclassified workers entitled to FLSA protections includin |
| `jurisdiction` | 1/1 | str (1) | 'federal' |

### Inconsistencies

- None detected.

### Potential Applicability Fields

- `appliesTo`

### Potential Evidence/Debug Fields

- None identified.

### Sample Records

**Sample 1** — Federal (Candidate)

```json
{
  "factors": [
    "type_of_relationship"
  ],
  "ruleType": "worker_classification",
  "appliesTo": {
    "employee.classification": "requires_determination"
  },
  "consequence": "Misclassified workers entitled to FLSA protections including minimum wage and overtime",
  "jurisdiction": "federal"
}
```

---

## `minor_labor`

**Records**: 1

### Observed Fields

| Field | Frequency | Types Observed | Sample Values |
|-------|-----------|----------------|---------------|
| `ruleType` | 1/1 | str (1) | 'minor_labor' |
| `ageGroups` | 1/1 | list[dict] (1) | [{'ageRange': '14-15'}] |
| `appliesTo` | 1/1 | dict (1) | {'employee.age': '< 18'} |
| `jurisdiction` | 1/1 | str (1) | 'federal' |
| `schoolHourRestrictions` | 1/1 | bool (1) | True |
| `hazardousOccupationRestrictions` | 1/1 | bool (1) | False |

### Inconsistencies

- None detected.

### Potential Applicability Fields

- `appliesTo`

### Potential Evidence/Debug Fields

- None identified.

### Sample Records

**Sample 1** — Federal (Candidate)

```json
{
  "ruleType": "minor_labor",
  "ageGroups": [
    {
      "ageRange": "14-15"
    }
  ],
  "appliesTo": {
    "employee.age": "< 18"
  },
  "jurisdiction": "federal",
  "schoolHourRestrictions": true,
  "hazardousOccupationRestrictions": false
}
```

---

## `equal_pay`

**Records**: 1

### Observed Fields

| Field | Frequency | Types Observed | Sample Values |
|-------|-----------|----------------|---------------|
| `factors` | 1/1 | list[str] (1) | ['skill', 'effort', 'responsibility', 'working_conditions'] |
| `statute` | 1/1 | str (1) | 'Equal Pay Act of 1963' |
| `ruleType` | 1/1 | str (1) | 'equal_pay' |
| `appliesTo` | 1/1 | dict (1) | {'employer.covered': True} |
| `requirement` | 1/1 | str (1) | 'Employers must pay equal wages for substantially equal work |
| `jurisdiction` | 1/1 | str (1) | 'federal' |
| `protectedClasses` | 1/1 | list[str] (1) | ['sex', 'race', 'national_origin', 'color', 'religion'] |
| `comparisonStandard` | 1/1 | str (1) | 'substantially_equal_work' |

### Inconsistencies

- None detected.

### Potential Applicability Fields

- `appliesTo`

### Potential Evidence/Debug Fields

- None identified.

### Sample Records

**Sample 1** — Federal (Candidate)

```json
{
  "factors": [
    "skill",
    "effort",
    "responsibility",
    "working_conditions"
  ],
  "statute": "Equal Pay Act of 1963",
  "ruleType": "equal_pay",
  "appliesTo": {
    "employer.covered": true
  },
  "requirement": "Employers must pay equal wages for substantially equal work regardless of protected class",
  "jurisdiction": "federal",
  "protectedClasses": [
    "sex",
    "race",
    "national_origin",
    "color",
    "religion"
  ],
  "comparisonStandard": "substantially_equal_work"
}
```

---


### Analysis of `unknown` Records

These 15 records were created before the `ruleType` field was standardized. Their likely actual types:

| Jurisdiction | Category | Likely Type | Key Fields |
|---|---|---|---|
| California | State Minimum Wage | `minimum_wage` | `minimum_wage`, `basis`, `applies_to`, `effective_date` |
| California | Daily Overtime | `overtime` | `daily_threshold_hours`, `overtime_multiplier`, `double_time_multiplier` |
| California | Meal Break Eligibility | `meal_break` | `first_break`, `second_break`, `waiver`, `penalty` |
| Denver (×2) | Local Minimum Wage | `minimum_wage` | `selectedRate`, `rates`, `multiRate` (legacy format) |
| Federal | State Minimum Wage | `minimum_wage` | `minimum_wage`, `basis`, `overtime_threshold_weekly` |
| Federal | 1.1 Minimum Wage | `minimum_wage` | `selectedRate`, `rates`, `multiRate` (legacy format) |
| Federal | FMLA | `family_medical_leave` | `employer_threshold`, `employee_eligibility`, `leave_weeks` |
| Federal | WARN Act | `warn_act` | `employer_threshold`, `triggers`, `notice_days` |
| New York City | Advance Schedule Notice | `predictive_scheduling` | `advance_notice_days`, `covered_industries`, `premium` |
| Portland Metro Area | Local Minimum Wage | `minimum_wage` | `minimum_wage`, `region`, `basis`, `adjustment` |
| San Francisco | Local Minimum Wage | `minimum_wage` | `minimum_wage`, `basis`, `applies_to`, `adjustment` |
| Seattle | Local Minimum Wage | `minimum_wage` | `selectedRate`, `rates`, `multiRate` (legacy format) |
| Seattle | Advance Schedule Notice | `predictive_scheduling` | `advance_notice_days`, `covered_industries`, `employer_threshold_global` |
| Washington | Weekly Overtime | `overtime` | `weekly_threshold_hours`, `overtime_multiplier`, `applies_to` |

**Key finding**: 8 of 15 are minimum wage records in a legacy format (pre-normalization). The remaining 7 are correctly structured for their domain but simply lack the `ruleType` field.

**Normalization path**: Add `ruleType` to each record and rename fields to match the canonical format for that type. No data loss required — only field mapping.

## Summary & Recommendations

### Rule Types Ready for Schema Definition

These have enough records and consistent structure to define a canonical schema:

- **`minimum_wage`** — 41 records, ⚠️ Moderate consistency (4/9 fields common)
- **`unknown`** — 15 records, ⚠️ Moderate consistency (0/34 fields common)
- **`overtime`** — 7 records, ✅ High consistency (7/7 fields common)

### Rule Types Needing More Examples

- **`anti_discrimination`** — 2 record(s). Need 5+ examples before schema definition.
- **`workplace_safety`** — 2 record(s). Need 5+ examples before schema definition.
- **`warn_act`** — 1 record(s). Need 5+ examples before schema definition.
- **`family_medical_leave`** — 1 record(s). Need 5+ examples before schema definition.
- **`predictive_scheduling`** — 1 record(s). Need 5+ examples before schema definition.
- **`worker_classification`** — 1 record(s). Need 5+ examples before schema definition.
- **`minor_labor`** — 1 record(s). Need 5+ examples before schema definition.
- **`equal_pay`** — 1 record(s). Need 5+ examples before schema definition.


### Candidate Canonical Schemas

These are suggested schemas based on observed data. **Not implemented** — for discussion only.

#### `minimum_wage` (suggested)

```typescript
interface MinimumWageRule {
  ruleType: "minimum_wage";
  jurisdiction: string;
  effectiveYear: string;          // "2026" or "unknown"
  rates: Array<{
    amount: string;               // "$19.61"
    condition: string | null;     // "large_employer", "tipped_employee", etc.
    conditionDetail: string | null; // Human-readable description
  }>;
  defaultRate: string;            // The general/unconditioned rate
  multiRate: boolean;             // Whether multiple rates exist
  confidence: "high" | "medium" | "low";
  notes: string | null;           // Only for ambiguous sources
}
```

**Fields to remove from rule**: `selectedRate` (evidence), `matchedTerms` (evidence)

#### `overtime` (suggested)

```typescript
interface OvertimeRule {
  ruleType: "overtime";
  jurisdiction: string;
  basis: "weekly_hours" | "daily_hours";
  threshold: {
    hours: number;                // 40 (weekly) or 8 (daily)
    period: "workweek" | "workday";
  };
  premiumRate: number;            // 1.5
  appliesTo: {
    "employee.exemption_status": string;  // "non_exempt"
  };
  calculation: {
    overtimeHours: string;        // Formula
    overtimePay: string;          // Formula
  };
}
```

#### `predictive_scheduling` (suggested)

```typescript
interface PredictiveSchedulingRule {
  ruleType: "predictive_scheduling";
  jurisdiction: string;
  coveredIndustries: string[];    // ["fast_food", "retail"]
  advanceNotice?: {
    days?: number;                // 14
    hours?: number;               // 72
  };
  scheduleChangePenalties?: Array<{
    industry: string;
    advanceNotice: { days?: number; hours?: number };
    premiumPay?: { type: string; amount?: string };
  }>;
  premiumPay?: {
    type: "fixed" | "tiered" | "required";
    amount?: string;
    tiers?: Array<{ trigger: string; penalty: string }>;
  };
  restrictions: {
    onCallBan?: boolean;
    clopening?: {
      minimumRestHours?: number;
      premium?: string;
      penalty?: string;
      rightToRefuse?: boolean;
    };
    justCauseRequired?: boolean;
    accessToHoursRequired?: boolean;
  };
  employerSizeThreshold?: number;
  employerSizeScope?: "worldwide" | "local";
  appliesTo: Record<string, unknown>;
}
```

### Estimated Normalization Effort

| Rule Type | Records | Effort | Notes |
|-----------|---------|--------|-------|
| `minimum_wage` | 41 | Low | Already normalized by recent extraction fixes |
| `unknown` | 15 | High | Need ruleType assignment and field mapping |
| `overtime` | 7 | Medium | Mostly consistent but some field variations |
| `anti_discrimination` | 2 | Low (single record) | Define schema when more examples exist |
| `workplace_safety` | 2 | Low (single record) | Define schema when more examples exist |
| `warn_act` | 1 | Low (single record) | Define schema when more examples exist |
| `family_medical_leave` | 1 | Low (single record) | Define schema when more examples exist |
| `predictive_scheduling` | 1 | Low (single record) | Define schema when more examples exist |
| `worker_classification` | 1 | Low (single record) | Define schema when more examples exist |
| `minor_labor` | 1 | Low (single record) | Define schema when more examples exist |
| `equal_pay` | 1 | Low (single record) | Define schema when more examples exist |
