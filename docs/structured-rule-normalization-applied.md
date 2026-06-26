# Structured Rule Normalization — Applied

**Applied at**: 2026-06-02T14:49:10.403Z
**Backup file**: `docs/structured-rule-backup-before-normalization.json`
**Records updated**: 61
  - LawSources: 31
  - Candidates: 30
**Records skipped**: 12
**Errors**: 0
**Verification**: 61 pass, 0 fail, 0 unsupported modified

## Records by Rule Type

| Rule Type | Updated | Skipped |
|-----------|---------|---------|
| `anti_discrimination` | 0 | 2 |
| `equal_pay` | 0 | 1 |
| `family_medical_leave` | 0 | 1 |
| `minimum_wage` | 49 | 0 |
| `minor_labor` | 0 | 1 |
| `overtime` | 9 | 0 |
| `predictive_scheduling` | 3 | 0 |
| `unknown` | 0 | 3 |
| `warn_act` | 0 | 1 |
| `worker_classification` | 0 | 1 |
| `workplace_safety` | 0 | 2 |

## Warnings

### Federal — State Minimum Wage (LawSource)

**Mixed-category fields (not included in output):**

- "overtime_threshold_weekly" → likely belongs to overtime

## Before/After Examples

### `minimum_wage` (49 updated)

#### California — State Minimum Wage (LawSource)

Changes:
- Set ruleType: "minimum_wage" (was: undefined)
- Set jurisdiction: "California" (was missing)
- Extracted effectiveYear "2025" from effective_date "2025-01-01"
- Set effectiveYear: "2025"
- Converted legacy "minimum_wage: 16.5" → rates array (formatted as "$16.50")
- Moved "fast_food_minimum_wage: 20" into rates array with condition (formatted as "$20.00")
- Computed defaultRate: "$16.50"
- Corrected multiRate: true (was: undefined)
- Set default confidence: "medium"

**Before:**
```json
{
  "minimum_wage": 16.5,
  "basis": "hourly",
  "effective_date": "2025-01-01",
  "applies_to": "all employees",
  "fast_food_minimum_wage": 20
}
```

**After:**
```json
{
  "ruleType": "minimum_wage",
  "jurisdiction": "California",
  "effectiveYear": "2025",
  "rates": [
    {
      "amount": "$16.50",
      "condition": null,
      "conditionDetail": null
    },
    {
      "amount": "$20.00",
      "condition": "fast_food_worker",
      "conditionDetail": "Fast food workers"
    }
  ],
  "defaultRate": "$16.50",
  "multiRate": true,
  "confidence": "medium",
  "notes": null
}
```
---

#### Portland Metro Area — Local Minimum Wage (LawSource)

Changes:
- Set ruleType: "minimum_wage" (was: undefined)
- Set jurisdiction: "Portland Metro Area" (was missing)
- Extracted effectiveYear "2024" from effective_date "2024-07-01"
- Set effectiveYear: "2024"
- Converted legacy "minimum_wage: 15.95" → rates array (formatted as "$15.95")
- Computed defaultRate: "$15.95"
- Corrected multiRate: false (was: undefined)
- Set default confidence: "medium"

**Before:**
```json
{
  "minimum_wage": 15.95,
  "basis": "hourly",
  "effective_date": "2024-07-01",
  "region": "Portland Metro Area (urban growth boundary of the Metro regional government)",
  "adjustment": "annual CPI, capped at 3.5%"
}
```

**After:**
```json
{
  "ruleType": "minimum_wage",
  "jurisdiction": "Portland Metro Area",
  "effectiveYear": "2024",
  "rates": [
    {
      "amount": "$15.95",
      "condition": null,
      "conditionDetail": null
    }
  ],
  "defaultRate": "$15.95",
  "multiRate": false,
  "confidence": "medium",
  "notes": null
}
```
---

### `overtime` (9 updated)

#### Washington — Weekly Overtime (LawSource)

Changes:
- Set ruleType: "overtime" (was: undefined)
- Set jurisdiction: "Washington"
- Moved "weekly_threshold_hours" → threshold.hours
- Renamed "overtime_multiplier" → premiumRate
- Converted "applies_to" string → appliesTo object
- Generated calculation formulas

**Before:**
```json
{
  "weekly_threshold_hours": 40,
  "overtime_multiplier": 1.5,
  "applies_to": "non-exempt employees"
}
```

**After:**
```json
{
  "ruleType": "overtime",
  "jurisdiction": "Washington",
  "basis": "weekly_hours",
  "threshold": {
    "hours": 40,
    "period": "workweek"
  },
  "premiumRate": 1.5,
  "appliesTo": {
    "employee.exemption_status": "non-exempt employees"
  },
  "calculation": {
    "overtimeHours": "max(0, hours_worked_in_workweek - 40)",
    "overtimePay": "overtimeHours * regular_rate * 1.5"
  }
}
```
---

#### California — Daily Overtime (LawSource)

Changes:
- Set ruleType: "overtime" (was: undefined)
- Set jurisdiction: "California"
- Moved "daily_threshold_hours" → threshold.hours, set basis to "daily_hours"
- Extracted double time: 2x after 12 hours/day
- Renamed "overtime_multiplier" → premiumRate
- Generated calculation formulas

**Before:**
```json
{
  "daily_threshold_hours": 8,
  "daily_double_threshold_hours": 12,
  "overtime_multiplier": 1.5,
  "double_time_multiplier": 2,
  "seventh_day": "1.5x for first 8 hours, 2x thereafter"
}
```

**After:**
```json
{
  "ruleType": "overtime",
  "jurisdiction": "California",
  "basis": "daily_hours",
  "threshold": {
    "hours": 8,
    "period": "workday"
  },
  "premiumRate": 1.5,
  "doubleTimeRate": 2,
  "doubleTimeThreshold": {
    "hours": 12,
    "period": "workday"
  },
  "appliesTo": {
    "employee.exemption_status": "non_exempt"
  },
  "calculation": {
    "overtimeHours": "max(0, hours_worked_in_workday - 8)",
    "overtimePay": "overtimeHours * regular_rate * 1.5"
  }
}
```
---

### `predictive_scheduling` (3 updated)

#### Seattle — Advance Schedule Notice (LawSource)

Changes:
- Set ruleType: "predictive_scheduling" (was: undefined)
- Set jurisdiction: "Seattle"
- Renamed "covered_industries" → coveredIndustries
- Moved "advance_notice_days" → advanceNotice.days
- Moved "employer_threshold_global" → employerSizeThreshold + scope "worldwide"
- Generated appliesTo from coveredIndustries and employerSizeThreshold

**Before:**
```json
{
  "advance_notice_days": 14,
  "covered_industries": [
    "retail",
    "food_service"
  ],
  "employer_threshold_global": 500,
  "premium_model": {
    "add": {
      "type": "flat_hours",
      "hours": 1
    },
    "cancel": {
      "type": "lost_hours"
    },
    "shorten": {
      "type": "lost_hours"
    }
  }
}
```

**After:**
```json
{
  "ruleType": "predictive_scheduling",
  "jurisdiction": "Seattle",
  "coveredIndustries": [
    "retail",
    "food_service"
  ],
  "advanceNotice": {
    "days": 14
  },
  "restrictions": {},
  "employerSizeThreshold": 500,
  "employerSizeScope": "worldwide",
  "appliesTo": {
    "business.industry_tags": [
      "retail",
      "food_service"
    ],
    "employer.total_employees_global": ">= 500"
  }
}
```
---

#### New York City — Advance Schedule Notice (LawSource)

Changes:
- Set ruleType: "predictive_scheduling" (was: undefined)
- Set jurisdiction: "New York City"
- Renamed "covered_industries" → coveredIndustries
- Moved "advance_notice_days" → advanceNotice.days
- Preserved per-industry thresholds in industryThresholds array (2 entries)
- Generated appliesTo from coveredIndustries and employerSizeThreshold

**Before:**
```json
{
  "advance_notice_days": 14,
  "covered_industries": [
    "fast_food",
    "retail"
  ],
  "fast_food_employer_threshold": 30,
  "retail_employer_threshold": 20,
  "premium": "schedule change premium of $10-$75 depending on change type and notice"
}
```

**After:**
```json
{
  "ruleType": "predictive_scheduling",
  "jurisdiction": "New York City",
  "coveredIndustries": [
    "fast_food",
    "retail"
  ],
  "advanceNotice": {
    "days": 14
  },
  "restrictions": {},
  "industryThresholds": [
    {
      "industry": "fast_food",
      "employerSizeThreshold": 30,
      "employeeCountScope": "global_or_chain"
    },
    {
      "industry": "retail",
      "employerSizeThreshold": 20,
      "employeeCountScope": "global_or_chain"
    }
  ],
  "appliesTo": {
    "business.industry_tags": [
      "fast_food",
      "retail"
    ]
  }
}
```
---

## Skipped Records

| Source | Jurisdiction | Category | Reason |
|--------|-------------|----------|--------|
| LawSource | California | Meal Break Eligibility | Rule type "meal_break" is not yet supported for normalization. |
| LawSource | Federal | FMLA | Rule type "family_medical_leave" is not yet supported for normalization. |
| LawSource | Federal | WARN Act | Rule type "warn_act" is not yet supported for normalization. |
| LawSource | Federal | 7.3 Mass Layoffs & Closures | Rule type "warn_act" is not yet supported for normalization. |
| LawSource | Federal | 3.2 Family & Medical Leave | Rule type "family_medical_leave" is not yet supported for normalization. |
| LawSource | Federal | 6.1 Anti-Discrimination | Rule type "anti_discrimination" is not yet supported for normalization. |
| Candidate | Federal | 5.3 Worker Classification | Rule type "worker_classification" is not yet supported for normalization. |
| Candidate | Federal | 4.1 Hour Restrictions | Rule type "minor_labor" is not yet supported for normalization. |
| Candidate | Federal | 1.7 Equal Pay & Wage Protections | Rule type "equal_pay" is not yet supported for normalization. |
| Candidate | Federal | 6.4 Workplace Safety | Rule type "workplace_safety" is not yet supported for normalization. |
| Candidate | Federal | 6.1 Anti-Discrimination | Rule type "anti_discrimination" is not yet supported for normalization. |
| Candidate | Federal | 6.4 Workplace Safety | Rule type "workplace_safety" is not yet supported for normalization. |
