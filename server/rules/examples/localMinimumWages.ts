/**
 * Local Minimum Wage Rules
 *
 * City/county minimum wages that exceed the state rate.
 * Each locality gets its own rule with city-level geographic condition.
 */

import type { Rule } from "../types.js";
import { createRule } from "../createRule.js";

// ─── Helper to reduce boilerplate ──────────────────────────────────

function localMinWageRule(opts: {
  id: string;
  city: string;
  state: string;
  minimum: number;
  effectiveFrom: string;
  citationSource: string;
  citationUrl?: string;
  citationSection?: string;
  title?: string;
}): Rule {
  return createRule({
    id: opts.id,
    title: opts.title || `${opts.city} Minimum Wage`,
    jurisdiction: opts.city,
    topic: "minimum_wage",
    effectiveFrom: opts.effectiveFrom,
    status: "active",

    appliesWhen: {
      all: [
        { fact: "location.state", op: "=", value: opts.state },
        { fact: "location.city", op: "=", value: opts.city },
        { fact: "employee.exempt_status", op: "=", value: "non_exempt" },
      ],
    },

    result: {
      type: "minimum_required_value",
      targetFact: "employee.regular_hourly_rate",
      minimum: opts.minimum,
      unit: "USD/hour",
    },

    citations: [
      {
        source: opts.citationSource,
        url: opts.citationUrl,
        section: opts.citationSection,
      },
    ],
  });
}

// ─── California Cities ─────────────────────────────────────────────

export const belmontMinimumWage = localMinWageRule({
  id: "belmont-ca-mw-2026",
  city: "Belmont", state: "CA", minimum: 18.95, effectiveFrom: "2026-01-01",
  citationSource: "Belmont Municipal Code Ch. 8.10",
  citationUrl: "https://www.belmont.gov/city-hall/finance/minimum-wage",
});

export const dalyCityMinimumWage = localMinWageRule({
  id: "daly-city-ca-mw-2026",
  city: "Daly City", state: "CA", minimum: 17.50, effectiveFrom: "2026-01-01",
  citationSource: "Daly City Municipal Code Ch. 2.110",
  citationUrl: "https://www.dalycity.org/minimumwage",
});

export const fremontMinimumWage = localMinWageRule({
  id: "fremont-ca-mw-2026",
  city: "Fremont", state: "CA", minimum: 18.05, effectiveFrom: "2026-01-01",
  citationSource: "Fremont Municipal Code Ch. 4.120",
  citationUrl: "https://www.fremont.gov/government/departments/human-services/minimum-wage",
});

export const halfMoonBayMinimumWage = localMinWageRule({
  id: "half-moon-bay-ca-mw-2026",
  city: "Half Moon Bay", state: "CA", minimum: 17.91, effectiveFrom: "2026-01-01",
  citationSource: "Half Moon Bay Municipal Code Ch. 5.30",
  citationUrl: "https://www.half-moon-bay.ca.us/minimumwage",
});

export const losAngelesMinimumWage = localMinWageRule({
  id: "los-angeles-ca-mw-2026",
  city: "Los Angeles", state: "CA", minimum: 18.42, effectiveFrom: "2026-01-01",
  citationSource: "Los Angeles Municipal Code §187.00 et seq.",
  citationUrl: "https://wagesla.lacity.org/",
});

export const malibuMinimumWage = localMinWageRule({
  id: "malibu-ca-mw-2026",
  city: "Malibu", state: "CA", minimum: 17.91, effectiveFrom: "2026-01-01",
  citationSource: "Malibu Municipal Code Ch. 5.25",
  citationUrl: "https://www.malibucity.org/minimumwage",
});

export const novatoMinimumWage = localMinWageRule({
  id: "novato-ca-mw-2026",
  city: "Novato", state: "CA", minimum: 17.73, effectiveFrom: "2026-01-01",
  citationSource: "Novato Municipal Code Ch. V Art. 3",
  citationUrl: "https://www.novato.org/government/city-manager/minimum-wage",
});

export const pasadenaMinimumWage = localMinWageRule({
  id: "pasadena-ca-mw-2026",
  city: "Pasadena", state: "CA", minimum: 18.57, effectiveFrom: "2026-01-01",
  citationSource: "Pasadena Municipal Code Ch. 5.09",
  citationUrl: "https://www.cityofpasadena.net/minimum-wage/",
});

export const redwoodCityMinimumWage = localMinWageRule({
  id: "redwood-city-ca-mw-2026",
  city: "Redwood City", state: "CA", minimum: 18.65, effectiveFrom: "2026-01-01",
  citationSource: "Redwood City Municipal Code Ch. 30",
  citationUrl: "https://www.redwoodcity.org/departments/city-manager/minimum-wage",
});

export const richmondMinimumWage = localMinWageRule({
  id: "richmond-ca-mw-2026",
  city: "Richmond", state: "CA", minimum: 19.18, effectiveFrom: "2026-01-01",
  citationSource: "Richmond Municipal Code Ch. 7.108",
  citationUrl: "https://www.ci.richmond.ca.us/minimumwage",
});

export const sanCarlosMinimumWage = localMinWageRule({
  id: "san-carlos-ca-mw-2026",
  city: "San Carlos", state: "CA", minimum: 17.75, effectiveFrom: "2026-01-01",
  citationSource: "San Carlos Municipal Code Ch. 8.20",
  citationUrl: "https://www.cityofsancarlos.org/government/departments/city-manager/minimum-wage",
});

export const sanFranciscoMinimumWage = localMinWageRule({
  id: "san-francisco-ca-mw-2026",
  city: "San Francisco", state: "CA", minimum: 19.61, effectiveFrom: "2026-01-01",
  citationSource: "San Francisco Administrative Code Ch. 12R",
  citationUrl: "https://sfgov.org/olse/minimum-wage-ordinance",
});

export const sanJoseMinimumWage = localMinWageRule({
  id: "san-jose-ca-mw-2025",
  city: "San Jose", state: "CA", minimum: 18.45, effectiveFrom: "2025-01-01",
  citationSource: "San Jose Municipal Code Ch. 4.100",
  citationUrl: "https://www.sanjoseca.gov/your-government/departments-offices/office-of-equality-assurance/minimum-wage",
});

export const santaClaraMinimumWage = localMinWageRule({
  id: "santa-clara-ca-mw-2026",
  city: "Santa Clara", state: "CA", minimum: 18.70, effectiveFrom: "2026-01-01",
  citationSource: "Santa Clara City Code Ch. 3.20",
  citationUrl: "https://www.santaclaraca.gov/our-city/departments-a-f/city-manager/minimum-wage",
});

export const sunnyvaleMinimumWage = localMinWageRule({
  id: "sunnyvale-ca-mw-2026",
  city: "Sunnyvale", state: "CA", minimum: 19.50, effectiveFrom: "2026-01-01",
  citationSource: "Sunnyvale Municipal Code Ch. 4.08",
  citationUrl: "https://www.sunnyvale.ca.gov/property-and-environment/business/minimum-wage",
});

export const westHollywoodMinimumWage = localMinWageRule({
  id: "west-hollywood-ca-mw-2026",
  city: "West Hollywood", state: "CA", minimum: 20.25, effectiveFrom: "2026-01-01",
  citationSource: "West Hollywood Municipal Code Ch. 5.50",
  citationUrl: "https://www.weho.org/business/minimum-wage",
});

// ─── Colorado ──────────────────────────────────────────────────────

export const boulderMinimumWage = localMinWageRule({
  id: "boulder-co-mw-2026",
  city: "Boulder", state: "CO", minimum: 15.57, effectiveFrom: "2026-01-01",
  citationSource: "Boulder Revised Code Ch. 12-1",
  citationUrl: "https://bouldercolorado.gov/services/minimum-wage",
});

export const denverMinimumWage = localMinWageRule({
  id: "denver-co-mw-2025",
  city: "Denver", state: "CO", minimum: 19.29, effectiveFrom: "2025-01-01",
  citationSource: "Denver Revised Municipal Code §58-15",
  citationUrl: "https://www.denvergov.org/Government/Agencies-Departments-Offices/Auditors-Office/Denver-Minimum-Wage",
});

// ─── Minnesota ─────────────────────────────────────────────────────

export const minneapolisMinimumWage = localMinWageRule({
  id: "minneapolis-mn-mw-2026",
  city: "Minneapolis", state: "MN", minimum: 16.37, effectiveFrom: "2026-01-01",
  citationSource: "Minneapolis Code of Ordinances Title 2 Ch. 40",
  citationUrl: "https://www.minneapolismn.gov/government/government-data/datasource/minimum-wage/",
});

// ─── Oregon ────────────────────────────────────────────────────────

export const portlandMetroMinimumWage = localMinWageRule({
  id: "portland-metro-or-mw-2024",
  city: "Portland Metro Area", state: "OR", minimum: 15.95, effectiveFrom: "2024-07-01",
  citationSource: "ORS 653.025 (Portland Metro standard)",
  citationUrl: "https://www.oregon.gov/boli/workers/pages/minimum-wage.aspx",
});

// ─── Washington ────────────────────────────────────────────────────

export const seattleMinimumWage = localMinWageRule({
  id: "seattle-wa-mw-2026",
  city: "Seattle", state: "WA", minimum: 20.76, effectiveFrom: "2026-01-01",
  citationSource: "Seattle Municipal Code Ch. 14.19",
  citationUrl: "https://www.seattle.gov/laborstandards/ordinances/minimum-wage",
});

// ─── California: Hayward (multi-rate — large employer) ─────────────

export const haywardMinimumWageLarge = localMinWageRule({
  id: "hayward-ca-mw-large-2026",
  city: "Hayward", state: "CA", minimum: 17.79, effectiveFrom: "2026-01-01",
  citationSource: "Hayward Municipal Code Ch. 5 Art. 12",
  citationUrl: "https://www.hayward-ca.gov/your-government/programs/minimum-wage",
  title: "Hayward Minimum Wage (26+ employees)",
});

// ─── Illinois Cities ───────────────────────────────────────────────

export const chicagoMinimumWage = localMinWageRule({
  id: "chicago-il-mw-2025",
  city: "Chicago",
  state: "IL",
  minimum: 16.20,
  effectiveFrom: "2025-07-01",
  citationSource: "Chicago Minimum Wage Ordinance",
  citationUrl: "https://www.chicago.gov/city/en/depts/bacp/supp_info/minimumwageinformation.html",
  citationSection: "MCC §1-24-020",
  title: "Chicago Minimum Wage ($16.20/hr)",
});

// ─── New York Cities ───────────────────────────────────────────────

export const newYorkCityMinimumWage = localMinWageRule({
  id: "nyc-ny-mw-2026",
  city: "New York City",
  state: "NY",
  minimum: 17.00,
  effectiveFrom: "2026-01-01",
  citationSource: "NYC Minimum Wage (NY Labor Law §652)",
  citationUrl: "https://dol.ny.gov/minimum-wage-0",
  citationSection: "NY Labor Law §652(a)(ii)",
  title: "New York City Minimum Wage ($17.00/hr)",
});

// ─── All local minimum wage rules ──────────────────────────────────

export const ALL_LOCAL_MINIMUM_WAGES: readonly Rule[] = [
  belmontMinimumWage,
  dalyCityMinimumWage,
  fremontMinimumWage,
  halfMoonBayMinimumWage,
  losAngelesMinimumWage,
  malibuMinimumWage,
  novatoMinimumWage,
  pasadenaMinimumWage,
  redwoodCityMinimumWage,
  richmondMinimumWage,
  sanCarlosMinimumWage,
  sanFranciscoMinimumWage,
  sanJoseMinimumWage,
  santaClaraMinimumWage,
  sunnyvaleMinimumWage,
  westHollywoodMinimumWage,
  boulderMinimumWage,
  denverMinimumWage,
  minneapolisMinimumWage,
  portlandMetroMinimumWage,
  seattleMinimumWage,
  haywardMinimumWageLarge,
  chicagoMinimumWage,
  newYorkCityMinimumWage,
];
