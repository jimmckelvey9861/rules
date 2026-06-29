/**
 * Spread of Hours (NY) & Split Shift Premium (CA, NV)
 *
 * NY:  12 NYCRR §142-2.4 — extra hour at min wage when spread > 10 hrs
 * CA:  IWC Wage Orders §4(C) — extra hour at min wage for split shifts
 * NV:  NRS §608.160 — extra hour at min wage when spread > 10 hrs (split shift)
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ═══════════════════════════════════════════════════════════════════
// NEW YORK — Spread of Hours (12 NYCRR §142-2.4)
// ═══════════════════════════════════════════════════════════════════

/**
 * NY: When a non-exempt employee's workday spans more than 10 hours
 * (measured from first clock-in to last clock-out, including breaks
 * and meal periods), the employer must pay an additional hour at the
 * applicable minimum wage rate.
 */
export const nySpreadOfHours: Rule = createRule({
  id: "ny-spread-of-hours",
  title: "New York Spread of Hours Pay (>10 hr span = +1 hr at min wage)",
  jurisdiction: "NY",
  topic: "premium_pay",
  effectiveFrom: "2011-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NY" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.spread_of_hours", op: ">", value: 10 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "spread_of_hours",
    amount: 1,
    formula: "1 additional hour at the applicable minimum wage rate",
  },

  citations: [
    {
      source: "12 NYCRR §142-2.4",
      url: "https://www.nysenate.gov/legislation/laws/LAB/A6",
      section: "12 NYCRR §142-2.4",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// CALIFORNIA — Split Shift Premium (IWC Wage Orders §4(C))
// ═══════════════════════════════════════════════════════════════════

/**
 * CA: When a non-exempt employee works a split shift (two distinct
 * work periods separated by more than a meal break), the employer
 * must pay an additional hour at the state minimum wage rate.
 *
 * Exception: If the employee's total daily earnings already exceed
 * the minimum wage for all hours worked PLUS one additional hour,
 * no extra pay is required.
 */
export const caSplitShiftPremium: Rule = createRule({
  id: "ca-split-shift-premium",
  title: "California Split Shift Premium (+1 hr at state minimum wage)",
  jurisdiction: "CA",
  topic: "split_shift_premium",
  effectiveFrom: "2001-01-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "CA" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.is_split_shift", op: "=", value: true },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "split_shift_premium",
    amount: 1,
    formula: "1 additional hour at the state minimum wage rate (unless total daily earnings already exceed min wage × (hours worked + 1))",
  },

  citations: [
    {
      source: "IWC Wage Order 5-2001, §4(C)",
      url: "https://www.dir.ca.gov/iwc/wageorderindustries.htm",
      section: "§4(C) Split Shift Premium",
    },
  ],
});

// ═══════════════════════════════════════════════════════════════════
// NEVADA — Split Shift / Spread of Hours (NRS §608.160)
// ═══════════════════════════════════════════════════════════════════

/**
 * NV: When a non-exempt employee works a split shift and the total
 * spread of hours exceeds 10, the employer must pay an additional
 * hour at the minimum wage rate.
 */
export const nvSplitShiftPremium: Rule = createRule({
  id: "nv-split-shift-premium",
  title: "Nevada Split Shift Premium (spread >10 hrs = +1 hr at min wage)",
  jurisdiction: "NV",
  topic: "split_shift_premium",
  effectiveFrom: "2007-07-01",
  status: "active",

  appliesWhen: {
    all: [
      { fact: "location.state", op: "=", value: "NV" },
      { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      { fact: "shift.is_split_shift", op: "=", value: true },
      { fact: "shift.spread_of_hours", op: ">", value: 10 },
    ],
  },

  result: {
    type: "premium_required",
    premiumType: "split_shift_premium",
    amount: 1,
    formula: "1 additional hour at the applicable minimum wage rate",
  },

  citations: [
    {
      source: "NRS §608.160",
      url: "https://www.leg.state.nv.us/nrs/nrs-608.html#NRS608Sec160",
      section: "NRS §608.160",
    },
  ],
});

// ─── Export ────────────────────────────────────────────────────────

export const ALL_SPREAD_AND_SPLIT_SHIFT_RULES: readonly Rule[] = [
  nySpreadOfHours,
  caSplitShiftPremium,
  nvSplitShiftPremium,
];
