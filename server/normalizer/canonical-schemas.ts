/**
 * Canonical Structured Rule Schemas
 *
 * These are the target shapes for normalized rule JSON.
 * Derived from docs/structured-rule-inventory.md analysis.
 */

// ─── Minimum Wage ──────────────────────────────────────────────────

export interface MinimumWageRate {
  amount: string;                    // "$19.61"
  condition: string | null;          // "large_employer", "tipped_employee", etc.
  conditionDetail: string | null;    // Human-readable: "26 or more employees"
}

export interface MinimumWageRule {
  ruleType: "minimum_wage";
  jurisdiction: string;
  effectiveYear: string;             // "2026" or "unknown"
  rates: MinimumWageRate[];
  defaultRate: string;               // The general/unconditioned rate
  multiRate: boolean;
  confidence: "high" | "medium" | "low";
  notes: string | null;
}

// ─── Overtime ──────────────────────────────────────────────────────

export interface OvertimeRule {
  ruleType: "overtime";
  jurisdiction: string;
  basis: "weekly_hours" | "daily_hours" | "both";
  threshold: {
    hours: number;                   // 40 (weekly) or 8 (daily)
    period: "workweek" | "workday";
  };
  premiumRate: number;               // 1.5
  doubleTimeRate?: number;           // 2.0 (California)
  doubleTimeThreshold?: {
    hours: number;
    period: "workweek" | "workday";
  };
  appliesTo: {
    "employee.exemption_status"?: string;
    [key: string]: unknown;
  };
  calculation: {
    overtimeHours: string;
    overtimePay: string;
  };
}

// ─── Predictive Scheduling ─────────────────────────────────────────

export interface ScheduleChangePenaltyTier {
  industry?: string;
  advanceNotice?: { days?: number; hours?: number };
  premiumPay?: { type: string; amount?: string };
}

export interface PremiumPayConfig {
  type: "fixed" | "tiered" | "required";
  amount?: string;
  detail?: string;
  tiers?: Array<{ trigger: string; penalty: string }>;
}

export interface ClopeningRestriction {
  minimumRestHours?: number;
  premium?: string;
  penalty?: string;
  rightToRefuse?: boolean;
  restricted?: boolean;
}

export interface PredictiveSchedulingRule {
  ruleType: "predictive_scheduling";
  jurisdiction: string;
  coveredIndustries: string[];
  advanceNotice?: {
    days?: number;
    hours?: number;
  };
  scheduleChangePenalties?: ScheduleChangePenaltyTier[];
  premiumPay?: PremiumPayConfig;
  restrictions: {
    onCallBan?: boolean;
    clopening?: ClopeningRestriction;
    justCauseRequired?: boolean;
    accessToHoursRequired?: boolean;
  };
  employerSizeThreshold?: number;
  employerSizeScope?: "worldwide" | "local";
  industryThresholds?: Array<{
    industry: string;
    employerSizeThreshold: number;
    employeeCountScope?: string;
  }>;
  appliesTo: Record<string, unknown>;
}

// ─── Union type ────────────────────────────────────────────────────

export type CanonicalRule = MinimumWageRule | OvertimeRule | PredictiveSchedulingRule;
