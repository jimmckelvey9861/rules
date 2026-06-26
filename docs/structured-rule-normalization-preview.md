# Structured Rule Normalization Preview

**Generated**: 2026-06-05
**Mode**: Dry run (no database changes)
**Total rules processed**: 95
**Successfully normalized**: 83 (0 with warnings)
**Failed**: 0
**Skipped (unsupported type)**: 12

## Summary by Rule Type

| Rule Type | Success | With Warnings | Failed | Skipped | Total |
|-----------|---------|---------------|--------|---------|-------|
| `minimum_wage` | 71 | 0 | 0 | 0 | 71 |
| `overtime` | 9 | 0 | 0 | 0 | 9 |
| `predictive_scheduling` | 3 | 0 | 0 | 0 | 3 |
| `meal_break` | 0 | 0 | 0 | 1 | 1 |
| `family_medical_leave` | 0 | 0 | 0 | 2 | 2 |
| `warn_act` | 0 | 0 | 0 | 2 | 2 |
| `anti_discrimination` | 0 | 0 | 0 | 2 | 2 |
| `worker_classification` | 0 | 0 | 0 | 1 | 1 |
| `minor_labor` | 0 | 0 | 0 | 1 | 1 |
| `equal_pay` | 0 | 0 | 0 | 1 | 1 |
| `workplace_safety` | 0 | 0 | 0 | 2 | 2 |

---

## Before/After Examples

### `minimum_wage` (71 normalized)

#### Example 1: Georgia — State Minimum Wage (Candidate)

**Changes applied:**

- Recovered rate from defaultRate: "$7.25" (rates array was empty)

**Before:**

```json
{
  "notes": null,
  "rates": [],
  "ruleType": "minimum_wage",
  "multiRate": false,
  "confidence": "low",
  "defaultRate": "$7.25",
  "jurisdiction": "Georgia",
  "effectiveYear": "unknown"
}
```

**After:**

```json
{
  "ruleType": "minimum_wage",
  "jurisdiction": "Georgia",
  "effectiveYear": "unknown",
  "rates": [
    {
      "amount": "$7.25",
      "condition": null,
      "conditionDetail": null
    }
  ],
  "defaultRate": "$7.25",
  "multiRate": false,
  "confidence": "low",
  "notes": null
}
```

#### Example 2: North Carolina — State Minimum Wage (Candidate)

**Changes applied:**

- Recovered rate from defaultRate: "$7.25" (rates array was empty)

**Before:**

```json
{
  "notes": null,
  "rates": [],
  "ruleType": "minimum_wage",
  "multiRate": false,
  "confidence": "low",
  "defaultRate": "$7.25",
  "jurisdiction": "North Carolina",
  "effectiveYear": "unknown"
}
```

**After:**

```json
{
  "ruleType": "minimum_wage",
  "jurisdiction": "North Carolina",
  "effectiveYear": "unknown",
  "rates": [
    {
      "amount": "$7.25",
      "condition": null,
      "conditionDetail": null
    }
  ],
  "defaultRate": "$7.25",
  "multiRate": false,
  "confidence": "low",
  "notes": null
}
```

#### Example 3: Pennsylvania — State Minimum Wage (Candidate)

**Changes applied:**

- Recovered rate from defaultRate: "$7.25" (rates array was empty)

**Before:**

```json
{
  "notes": null,
  "rates": [],
  "ruleType": "minimum_wage",
  "multiRate": false,
  "confidence": "low",
  "defaultRate": "$7.25",
  "jurisdiction": "Pennsylvania",
  "effectiveYear": "unknown"
}
```

**After:**

```json
{
  "ruleType": "minimum_wage",
  "jurisdiction": "Pennsylvania",
  "effectiveYear": "unknown",
  "rates": [
    {
      "amount": "$7.25",
      "condition": null,
      "conditionDetail": null
    }
  ],
  "defaultRate": "$7.25",
  "multiRate": false,
  "confidence": "low",
  "notes": null
}
```

---

### `overtime` (9 normalized)

#### Example 1: Washington — Weekly Overtime (LawSource)

**No changes needed** — already in canonical form.

**Before:**

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

#### Example 2: Federal — 1.3 Overtime (LawSource)

**No changes needed** — already in canonical form.

**Before:**

```json
{
  "ruleType": "overtime",
  "jurisdiction": "federal",
  "basis": "weekly_hours",
  "threshold": {
    "hours": 40,
    "period": "workweek"
  },
  "premiumRate": 1.5,
  "appliesTo": {
    "employee.exemption_status": "non_exempt"
  },
  "calculation": {
    "overtimeHours": "max(0, hours_worked_in_workweek - 40)",
    "overtimePay": "overtimeHours * regular_rate * 1.5"
  }
}
```

**After:**

```json
{
  "ruleType": "overtime",
  "jurisdiction": "federal",
  "basis": "weekly_hours",
  "threshold": {
    "hours": 40,
    "period": "workweek"
  },
  "premiumRate": 1.5,
  "appliesTo": {
    "employee.exemption_status": "non_exempt"
  },
  "calculation": {
    "overtimeHours": "max(0, hours_worked_in_workweek - 40)",
    "overtimePay": "overtimeHours * regular_rate * 1.5"
  }
}
```

#### Example 3: California — Daily Overtime (LawSource)

**No changes needed** — already in canonical form.

**Before:**

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

### `predictive_scheduling` (3 normalized)

#### Example 1: Seattle — Advance Schedule Notice (LawSource)

**No changes needed** — already in canonical form.

**Before:**

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

#### Example 2: New York City — Advance Schedule Notice (LawSource)

**No changes needed** — already in canonical form.

**Before:**

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

**After:**

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

#### Example 3: New York City — Advance Schedule Notice (LawSource)

**No changes needed** — already in canonical form.

**Before:**

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

## Skipped (Unsupported Types)

These rule types are not yet supported for normalization:

- **`meal_break`** (1 records): California / Meal Break Eligibility
- **`family_medical_leave`** (2 records): Federal / FMLA, Federal / 3.2 Family & Medical Leave
- **`warn_act`** (2 records): Federal / WARN Act, Federal / 7.3 Mass Layoffs & Closures
- **`anti_discrimination`** (2 records): Federal / 6.1 Anti-Discrimination, Federal / 6.1 Anti-Discrimination
- **`worker_classification`** (1 records): Federal / 5.3 Worker Classification
- **`minor_labor`** (1 records): Federal / 4.1 Hour Restrictions
- **`equal_pay`** (1 records): Federal / 1.7 Equal Pay & Wage Protections
- **`workplace_safety`** (2 records): Federal / 6.4 Workplace Safety, Federal / 6.4 Workplace Safety
