/**
 * Content actionability assessor for crawler candidates.
 *
 * Determines whether a page contains actionable legal content
 * for a given law topic using deterministic heuristics.
 *
 * Does NOT extract full law content or build compliance rules.
 * Only answers: "Does this page contain the actual law/regulation?"
 */

const TIMEOUT_MS = 8000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const MAX_TEXT_LENGTH = 50000; // Don't store huge page bodies

export type ContentAssessmentStatus = "actionable" | "not_actionable" | "unsure" | "error";

export interface ContentAssessmentResult {
  status: ContentAssessmentStatus;
  summary: string;
  actionableFacts: Record<string, unknown> | null;
  assessedAt: Date;
}

// ─── Topic-specific assessment configs ─────────────────────────────

interface TopicConfig {
  // Strong evidence terms — finding these is a good sign
  strongTerms: string[];
  // Required evidence — at least one must be present for "actionable"
  requiredPatterns: RegExp[];
  // Numeric patterns that indicate real data (dollar amounts, hours, etc.)
  dataPatterns: RegExp[];
  // Context terms that boost confidence
  contextTerms: string[];
  // Anti-patterns — if page is mostly these, it's not actionable
  antiPatterns: string[];
}

const TOPIC_CONFIGS: Record<string, TopicConfig> = {
  minimum_wage: {
    strongTerms: ["minimum wage", "wage rate", "hourly wage", "citywide minimum wage", "wage order", "wage standard"],
    requiredPatterns: [
      /\$\d+\.\d{2}/,           // Dollar amount like $19.29
      /\$\d+\s*(?:per|\/|\s)?\s*hour/i,  // $X per hour
      /\d+\.\d{2}\s*(?:per|\/|\s)?\s*hour/i, // X.XX per hour
    ],
    dataPatterns: [
      /\$\d+\.\d{2}/g,         // All dollar amounts
      /(?:20\d{2})/g,          // Years like 2024, 2025, 2026
      /effective\s+(?:date|january|february|march|april|may|june|july|august|september|october|november|december|\d)/i,
    ],
    contextTerms: ["employee", "employer", "tipped", "covered", "applies", "effective", "hourly", "per hour", "annual", "increase"],
    antiPatterns: ["contact us", "subscribe", "newsletter", "press release", "news", "blog", "career", "job opening", "apply now"],
  },
  overtime: {
    strongTerms: ["overtime", "overtime pay", "time and a half", "hours worked", "weekly hours", "overtime rate"],
    requiredPatterns: [
      /(?:40|8)\s*hours/i,
      /1\.5\s*(?:x|times)/i,
      /time\s*and\s*(?:a|one)\s*half/i,
    ],
    dataPatterns: [/\d+\s*hours/gi, /(?:20\d{2})/g],
    contextTerms: ["exempt", "non-exempt", "workweek", "daily", "weekly", "threshold", "rate"],
    antiPatterns: ["contact us", "subscribe", "newsletter", "press release"],
  },
  paid_sick_leave: {
    strongTerms: ["paid sick leave", "sick time", "earned sick", "safe time", "sick leave accrual"],
    requiredPatterns: [
      /\d+\s*hours?\s*(?:per|of|accrued)/i,
      /accrual\s*rate/i,
      /\d+\s*(?:days?|hours?)\s*(?:per|of)\s*(?:year|calendar)/i,
    ],
    dataPatterns: [/\d+\s*hours?/gi, /(?:20\d{2})/g],
    contextTerms: ["accrual", "carryover", "cap", "eligible", "covered", "employer size"],
    antiPatterns: ["contact us", "subscribe", "newsletter"],
  },
  predictive_scheduling: {
    strongTerms: ["predictive scheduling", "fair workweek", "secure scheduling", "advance notice", "schedule change"],
    requiredPatterns: [
      /\d+\s*(?:days?|hours?)['\u2019]?\s*(?:advance|notice|in advance)/i,
      /premium\s*pay/i,
      /schedule\s*change/i,
    ],
    dataPatterns: [/\d+\s*(?:days?|hours?)/gi, /(?:20\d{2})/g],
    contextTerms: ["retail", "food service", "hospitality", "employer", "employee", "covered", "industry"],
    antiPatterns: ["contact us", "subscribe", "newsletter"],
  },
  meal_break: {
    strongTerms: ["meal break", "meal period", "lunch break", "rest break", "break requirement"],
    requiredPatterns: [
      /\d+\s*minutes?/i,
      /\d+\s*hours?\s*(?:shift|worked|consecutive)/i,
    ],
    dataPatterns: [/\d+\s*minutes?/gi, /\d+\s*hours?/gi],
    contextTerms: ["waiver", "unpaid", "duty-free", "shift", "consecutive", "employee"],
    antiPatterns: ["contact us", "subscribe", "newsletter"],
  },
  tipped_compensation: {
    strongTerms: ["tip credit", "tipped employee", "cash wage", "tip pool", "service charge", "gratuity"],
    requiredPatterns: [
      /tip\s*credit/i,
      /tipped\s*employee/i,
      /\$\d+\.\d{2}/,
    ],
    dataPatterns: [/\$\d+\.\d{2}/g, /(?:20\d{2})/g],
    contextTerms: ["employer", "employee", "minimum", "wage", "tips", "service", "retain", "deduct", "notify"],
    antiPatterns: ["contact us", "subscribe", "newsletter", "press release"],
  },
  compensable_time: {
    strongTerms: ["hours worked", "compensable time", "travel time", "waiting time", "on-call", "training time", "donning and doffing"],
    requiredPatterns: [
      /hours\s*worked/i,
      /compensable/i,
      /principal\s*activit/i,
    ],
    dataPatterns: [/\d+\s*(?:hours?|minutes?)/gi],
    contextTerms: ["employer", "employee", "workweek", "continuous", "integral", "indispensable", "preliminary", "postliminary"],
    antiPatterns: ["contact us", "subscribe", "newsletter"],
  },
  equal_pay: {
    strongTerms: ["equal pay", "pay equity", "wage discrimination", "comparable worth", "pay gap", "equal pay act"],
    requiredPatterns: [
      /equal\s*pay/i,
      /sex|gender|race|national\s*origin/i,
      /discrimination/i,
    ],
    dataPatterns: [/(?:20\d{2})/g],
    contextTerms: ["employer", "employee", "substantially equal", "skill", "effort", "responsibility", "working conditions", "establishment", "bona fide"],
    antiPatterns: ["contact us", "subscribe", "newsletter", "blog"],
  },
  family_medical_leave: {
    strongTerms: ["family and medical leave", "fmla", "family leave", "medical leave", "parental leave"],
    requiredPatterns: [
      /(?:12|26)\s*(?:work\s*)?weeks/i,
      /50\s*employees/i,
      /fmla/i,
    ],
    dataPatterns: [/\d+\s*(?:weeks?|employees?|months?|miles?)/gi],
    contextTerms: ["eligible", "employer", "serious health condition", "birth", "adoption", "spouse", "parent", "child", "military"],
    antiPatterns: ["contact us", "subscribe", "newsletter"],
  },
  minor_labor: {
    strongTerms: ["child labor", "minor employment", "youth employment", "hazardous occupation", "working papers", "employment certificate"],
    requiredPatterns: [
      /(?:14|16|18)\s*years?\s*(?:of\s*age|old)/i,
      /\d+\s*hours?\s*(?:per|a|each)\s*(?:day|week|school)/i,
    ],
    dataPatterns: [/\d+\s*(?:hours?|years?)/gi],
    contextTerms: ["school", "hazardous", "occupation", "agricultural", "permit", "certificate", "employer", "minor"],
    antiPatterns: ["contact us", "subscribe", "newsletter"],
  },
  workplace_safety: {
    strongTerms: ["occupational safety", "osha", "workplace safety", "general duty clause", "hazard", "recordkeeping"],
    requiredPatterns: [
      /osha/i,
      /general\s*duty/i,
      /29\s*cfr\s*19/i,
    ],
    dataPatterns: [/\d+\s*(?:employees?|days?|hours?)/gi, /\$[\d,]+/g],
    contextTerms: ["employer", "employee", "hazard", "injury", "illness", "inspection", "citation", "penalty", "standard", "compliance"],
    antiPatterns: ["contact us", "subscribe", "newsletter"],
  },
  anti_discrimination: {
    strongTerms: ["title vii", "anti-discrimination", "protected class", "disparate treatment", "disparate impact", "eeoc"],
    requiredPatterns: [
      /(?:15|20|50)\s*(?:or\s*more\s*)?employees/i,
      /title\s*vii|civil\s*rights\s*act/i,
    ],
    dataPatterns: [/\d+\s*employees?/gi, /(?:20\d{2})/g],
    contextTerms: ["race", "color", "religion", "sex", "national origin", "age", "disability", "genetic", "employer", "charge", "complaint"],
    antiPatterns: ["contact us", "subscribe", "newsletter", "blog"],
  },
  warn_act: {
    strongTerms: ["warn act", "worker adjustment", "plant closing", "mass layoff", "60-day notice", "60 day notice"],
    requiredPatterns: [
      /100\s*(?:or\s*more\s*)?employees/i,
      /60\s*(?:calendar\s*)?days?/i,
      /plant\s*clos/i,
    ],
    dataPatterns: [/\d+\s*(?:employees?|days?|workers?)/gi],
    contextTerms: ["employer", "employee", "notice", "layoff", "closing", "reduction", "full-time", "part-time", "single site"],
    antiPatterns: ["contact us", "subscribe", "newsletter"],
  },
  posting_notice: {
    strongTerms: ["posting requirement", "workplace poster", "notice requirement", "employee notice", "required posting"],
    requiredPatterns: [
      /post(?:ing|ed)?/i,
      /notice/i,
      /conspicuous/i,
    ],
    dataPatterns: [],
    contextTerms: ["employer", "employee", "workplace", "visible", "language", "penalty", "fine", "display"],
    antiPatterns: ["contact us", "subscribe", "newsletter", "order posters"],
  },
  worker_classification: {
    strongTerms: ["independent contractor", "employee classification", "economic reality", "abc test", "misclassification"],
    requiredPatterns: [
      /independent\s*contractor/i,
      /employee\s*(?:vs?\.?|or|versus)\s*(?:independent\s*)?contractor/i,
    ],
    dataPatterns: [],
    contextTerms: ["control", "direction", "economic reality", "suffer or permit", "integral", "profit or loss", "permanence", "skill"],
    antiPatterns: ["contact us", "subscribe", "newsletter", "blog"],
  },
};

// Default config for unknown topics
const DEFAULT_CONFIG: TopicConfig = {
  strongTerms: ["law", "regulation", "ordinance", "statute", "requirement", "compliance"],
  requiredPatterns: [/\$\d+/, /\d+\s*(?:hours?|days?|weeks?)/i],
  dataPatterns: [/\$\d+\.\d{2}/g, /(?:20\d{2})/g],
  contextTerms: ["employer", "employee", "covered", "effective", "applies"],
  antiPatterns: ["contact us", "subscribe", "newsletter", "press release", "blog"],
};

// ─── Main assessment function ──────────────────────────────────────

export async function assessContent(
  url: string,
  topic: string | undefined,
  title?: string | null,
  jurisdictionName?: string | null,
): Promise<ContentAssessmentResult> {
  const now = new Date();
  const config = topic ? (TOPIC_CONFIGS[topic] || DEFAULT_CONFIG) : DEFAULT_CONFIG;

  // Fetch page text
  let text: string;
  let contentType: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,*/*" },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { status: "error", summary: `HTTP ${res.status}`, actionableFacts: null, assessedAt: now };
    }

    contentType = (res.headers.get("content-type") || "").toLowerCase();

    if (contentType.includes("pdf")) {
      // PDF — mark as unsure (no simple text extraction without dependencies)
      return {
        status: "unsure",
        summary: "PDF document — cannot assess content without PDF parser. May contain actionable data.",
        actionableFacts: { contentType: "application/pdf", title: title || null },
        assessedAt: now,
      };
    }

    if (!contentType.includes("html")) {
      return { status: "not_actionable", summary: `Non-HTML content: ${contentType}`, actionableFacts: null, assessedAt: now };
    }

    const html = await res.text();
    text = stripHtml(html).slice(0, MAX_TEXT_LENGTH);
  } catch (err: any) {
    return { status: "error", summary: err.message || "Fetch failed", actionableFacts: null, assessedAt: now };
  }

  // Assess the text
  const textLower = text.toLowerCase();
  const titleLower = (title || "").toLowerCase();

  // Count strong term matches
  let strongMatches = 0;
  const matchedStrong: string[] = [];
  for (const term of config.strongTerms) {
    if (textLower.includes(term.toLowerCase())) {
      strongMatches++;
      matchedStrong.push(term);
    }
  }

  // Check required patterns (at least one data pattern must match)
  let hasRequiredData = false;
  const dataFindings: string[] = [];
  for (const pattern of config.requiredPatterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    const m = re.exec(textLower);
    if (m) {
      hasRequiredData = true;
      dataFindings.push(m[0]);
    }
  }

  // Extract actual data values (generic)
  const extractedData: Record<string, unknown> = {};
  for (const pattern of config.dataPatterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(re);
    if (matches) {
      const key = pattern.source.includes("\\$") ? "amounts" : pattern.source.includes("20\\d") ? "dates" : "values";
      extractedData[key] = [...new Set(matches)].slice(0, 10);
    }
  }

  // ─── Topic-specific structured rule extraction ────────────────────
  let structuredRule: Record<string, unknown> | null = null;

  if (topic === "minimum_wage" && hasRequiredData) {
    const wageData = extractMinimumWageRates(text, jurisdictionName || undefined);
    if (wageData) {
      // Store raw extraction data in evidence only (never in structuredRule)
      extractedData.selectedRate = wageData.selectedRate;
      extractedData.multiRate = wageData.multiRate;
      extractedData.allRatesFound = wageData.allRatesFound;
      // The canonical rule IS the structuredRule — clean, no historical noise
      if (wageData.canonicalRule) {
        structuredRule = wageData.canonicalRule as unknown as Record<string, unknown>;
      }
    }
  }

  if (topic === "overtime" && hasRequiredData) {
    structuredRule = extractOvertimeRule(text, textLower);
  }

  if (topic === "tipped_compensation" && hasRequiredData) {
    structuredRule = extractTippedCompensationRule(text, textLower);
  }

  if (topic === "compensable_time" && hasRequiredData) {
    structuredRule = extractCompensableTimeRule(text, textLower);
  }

  if (topic === "equal_pay" && hasRequiredData) {
    structuredRule = extractEqualPayRule(text, textLower);
  }

  if (topic === "family_medical_leave" && hasRequiredData) {
    structuredRule = extractFMLARule(text, textLower);
  }

  if (topic === "minor_labor" && hasRequiredData) {
    structuredRule = extractMinorLaborRule(text, textLower);
  }

  if (topic === "warn_act" && hasRequiredData) {
    structuredRule = extractWARNRule(text, textLower);
  }

  if (topic === "anti_discrimination" && hasRequiredData) {
    structuredRule = extractAntiDiscriminationRule(text, textLower);
  }

  if (topic === "workplace_safety" && hasRequiredData) {
    structuredRule = extractWorkplaceSafetyRule(text, textLower);
  }

  if (topic === "worker_classification" && hasRequiredData) {
    structuredRule = extractWorkerClassificationRule(text, textLower);
  }

  if (topic === "predictive_scheduling" && hasRequiredData) {
    structuredRule = extractPredictiveSchedulingRule(text, textLower);
  }

  if (topic === "paid_sick_leave" && hasRequiredData) {
    structuredRule = extractPaidSickLeaveRule(text, textLower);
  }

  if (topic === "meal_break" && hasRequiredData) {
    structuredRule = extractMealBreakRule(text, textLower);
  }

  // Post-process: fill in jurisdiction name if the extractor left it as "unknown"
  if (structuredRule && structuredRule.jurisdiction === "unknown" && jurisdictionName) {
    structuredRule.jurisdiction = jurisdictionName;
  }

  // Count context terms
  let contextScore = 0;
  const matchedContext: string[] = [];
  for (const term of config.contextTerms) {
    if (textLower.includes(term)) {
      contextScore++;
      matchedContext.push(term);
    }
  }

  // Count anti-patterns
  let antiScore = 0;
  for (const term of config.antiPatterns) {
    if (textLower.includes(term)) antiScore++;
  }

  // Extract short evidence snippets (sentences containing strong terms)
  const snippets: string[] = [];
  for (const term of matchedStrong.slice(0, 3)) {
    const idx = textLower.indexOf(term.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + term.length + 80);
      snippets.push(text.slice(start, end).replace(/\s+/g, " ").trim());
    }
  }

  // ─── Scoring decision ────────────────────────────────────────────

  // Actionable: strong terms + required data + context
  if (strongMatches >= 2 && hasRequiredData && contextScore >= 2) {
    return {
      status: "actionable",
      summary: `Contains ${matchedStrong.join(", ")} with specific data (${dataFindings.slice(0, 3).join(", ")}).`,
      actionableFacts: {
        ...(structuredRule ? { structuredRule } : {}),
        evidence: {
          matchedTerms: matchedStrong,
          ...extractedData,
          contextTerms: matchedContext,
          evidenceSnippets: snippets.slice(0, 3),
        },
      },
      assessedAt: now,
    };
  }

  // Also actionable if title strongly matches + has data
  if (titleLower && config.strongTerms.some((t) => titleLower.includes(t.toLowerCase())) && hasRequiredData) {
    return {
      status: "actionable",
      summary: `Title matches topic and page contains specific data (${dataFindings.slice(0, 3).join(", ")}).`,
      actionableFacts: {
        ...(structuredRule ? { structuredRule } : {}),
        evidence: {
          matchedTerms: matchedStrong,
          ...extractedData,
          contextTerms: matchedContext,
          evidenceSnippets: snippets.slice(0, 3),
          titleMatch: true,
        },
      },
      assessedAt: now,
    };
  }

  // Not actionable: mostly anti-patterns, no strong terms, no data
  if (strongMatches === 0 && !hasRequiredData && antiScore >= 2) {
    return {
      status: "not_actionable",
      summary: "No topic-relevant terms or data found. Page appears to be generic/navigational.",
      actionableFacts: null,
      assessedAt: now,
    };
  }

  // Not actionable: has some terms but no actual data
  if (strongMatches >= 1 && !hasRequiredData && contextScore < 3) {
    return {
      status: "not_actionable",
      summary: `Mentions ${matchedStrong.join(", ")} but contains no specific data values.`,
      actionableFacts: { matchedTerms: matchedStrong, contextTerms: matchedContext },
      assessedAt: now,
    };
  }

  // Unsure: some evidence but not conclusive
  return {
    status: "unsure",
    summary: `Partial evidence: ${strongMatches} topic terms, ${hasRequiredData ? "has" : "no"} data, ${contextScore} context terms.`,
    actionableFacts: {
      matchedTerms: matchedStrong,
      ...extractedData,
      contextTerms: matchedContext,
      evidenceSnippets: snippets.slice(0, 2),
    },
    assessedAt: now,
  };
}

// ─── Minimum wage rate extraction ──────────────────────────────────

interface WageRate {
  amount: string;
  year: string | null;
  context: string;
}

/** A rate with an inferred applicability condition */
interface ConditionedRate {
  amount: string;
  condition: string | null; // e.g. "large_employer", "small_employer", "hotel_worker", "tipped"
  conditionDetail: string | null; // e.g. "26 or more employees"
}

/** The canonical structured rule for a minimum wage law */
interface MinimumWageRule {
  ruleType: "minimum_wage";
  jurisdiction: string;
  effectiveYear: string;
  rates: ConditionedRate[];
  defaultRate: string; // the primary/general rate
  multiRate: boolean;
  confidence: "high" | "medium" | "low";
  notes: string | null;
}

interface WageRateResult {
  /** All raw rates found on the page (evidence/debug only) */
  allRatesFound: WageRate[];
  /** The selected effective rate */
  selectedRate: { amount: string; year: string; reason: string } | null;
  /** Whether multiple current rates exist */
  multiRate: boolean;
  /** The canonical structured rule (clean, no historical noise) */
  canonicalRule: MinimumWageRule | null;
}

function extractMinimumWageRates(text: string, jurisdictionName?: string): WageRateResult | null {
  const currentYear = new Date().getFullYear();

  // ─── Jurisdiction isolation ──────────────────────────────────────
  // If the page is a multi-jurisdiction table (e.g., DOL state wage list),
  // try to isolate the section relevant to this jurisdiction.
  let workingText = text;
  let isMultiJurisdiction = false;

  // Detect multi-jurisdiction pages: if 5+ different state names appear, it's likely a table
  const stateNames = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
    "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
    "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri",
    "Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York",
    "North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
    "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington",
    "West Virginia","Wisconsin","Wyoming"];
  const statesFound = stateNames.filter(s => text.includes(s));
  if (statesFound.length >= 5) {
    isMultiJurisdiction = true;
  }

  if (isMultiJurisdiction && jurisdictionName) {
    // Try to isolate the relevant section
    const jurLower = jurisdictionName.toLowerCase();
    const textLower = text.toLowerCase();
    const jurIdx = textLower.indexOf(jurLower);

    if (jurIdx >= 0) {
      // Find the next state name after this jurisdiction to bound the section
      let sectionEnd = text.length;
      for (const state of stateNames) {
        if (state.toLowerCase() === jurLower) continue;
        const nextStateIdx = textLower.indexOf(state.toLowerCase(), jurIdx + jurisdictionName.length);
        if (nextStateIdx > jurIdx && nextStateIdx < sectionEnd) {
          sectionEnd = nextStateIdx;
        }
      }
      // Extract a bounded section: from jurisdiction name to next state (max 500 chars)
      const sectionStart = Math.max(0, jurIdx - 20);
      const maxEnd = Math.min(sectionEnd, jurIdx + 500);
      workingText = text.slice(sectionStart, maxEnd);
    } else {
      // Jurisdiction name not found on a multi-jurisdiction page — can't isolate
      // Return a simple federal fallback if this is likely a "no state law" situation
      if (text.toLowerCase().includes("no state minimum wage") ||
          text.toLowerCase().includes("federal minimum wage applies") ||
          text.toLowerCase().includes("same as federal")) {
        const rule: MinimumWageRule = {
          ruleType: "minimum_wage",
          jurisdiction: jurisdictionName || "unknown",
          effectiveYear: String(currentYear),
          rates: [{ amount: "$7.25", condition: null, conditionDetail: "Federal minimum wage applies (no state law)" }],
          defaultRate: "$7.25",
          multiRate: false,
          confidence: "medium",
          notes: "No state minimum wage law; federal rate applies.",
        };
        return {
          allRatesFound: [{ amount: "$7.25", year: null, context: "Federal minimum wage applies (no state law)" }],
          selectedRate: { amount: "$7.25", year: String(currentYear), reason: "federal_fallback" },
          multiRate: false,
          canonicalRule: rule,
        };
      }
      return null; // Can't determine from this page
    }
  }

  // Find all dollar amounts that look like hourly wages ($7.25 – $50.00 range)
  const amountRegex = /\$(\d{1,2}\.\d{2})/g;
  const amounts: { amount: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = amountRegex.exec(workingText)) !== null) {
    const val = parseFloat(m[1]);
    // Filter to plausible hourly wage range
    if (val >= 7.0 && val <= 50.0) {
      amounts.push({ amount: m[0], index: m.index });
    }
  }

  if (amounts.length === 0) return null;

  // Find all 4-digit years (2020–2030 range)
  const yearRegex = /\b(20[2-3]\d)\b/g;
  const years: { year: string; index: number }[] = [];
  while ((m = yearRegex.exec(workingText)) !== null) {
    years.push({ year: m[1], index: m.index });
  }

  // Also detect date-formatted years like "01/01/2025" which are common on state pages
  const dateYearRegex = /(?:\d{1,2}\/\d{1,2}\/)(20[2-3]\d)/g;
  while ((m = dateYearRegex.exec(workingText)) !== null) {
    // Add these as year markers too (at the position of the year within the date)
    const yearPos = m.index + m[0].length - 4;
    // Avoid duplicates at same position
    if (!years.some(y => Math.abs(y.index - yearPos) < 5 && y.year === m![1])) {
      years.push({ year: m[1], index: yearPos });
    }
  }

  // Pair each amount with the nearest PRECEDING year within a proximity window.
  // Pattern on most gov pages: "2026 Minimum Wage $21.30"
  // The year comes BEFORE the amount. Only fall back to a following year
  // if no preceding year is found.
  const LOOK_BACK = 200;
  const LOOK_AHEAD = 100;

  const rates: WageRate[] = [];
  for (const amt of amounts) {
    let bestYear: string | null = null;
    let bestDist = Infinity;

    // First pass: prefer years that appear BEFORE the amount (closest wins)
    for (const yr of years) {
      const dist = amt.index - yr.index; // positive means year is before amount
      if (dist > 0 && dist <= LOOK_BACK && dist < bestDist) {
        bestDist = dist;
        bestYear = yr.year;
      }
    }

    // Second pass: only if no preceding year found, look AFTER the amount
    if (!bestYear) {
      for (const yr of years) {
        const dist = yr.index - amt.index; // positive means year is after amount
        if (dist > 0 && dist <= LOOK_AHEAD && dist < bestDist) {
          bestDist = dist;
          bestYear = yr.year;
        }
      }
    }

    // Extract context snippet around the amount (wider for condition extraction)
    const ctxStart = Math.max(0, amt.index - 100);
    const ctxEnd = Math.min(workingText.length, amt.index + 60);
    const context = workingText.slice(ctxStart, ctxEnd).replace(/\s+/g, " ").trim();

    rates.push({ amount: amt.amount, year: bestYear, context });
  }

  // Deduplicate rates by amount+year, preferring the occurrence with
  // the richest context (contains employer size info, "per hour for", etc.)
  const rateMap = new Map<string, WageRate>();
  for (const r of rates) {
    const key = `${r.amount}|${r.year}`;
    const existing = rateMap.get(key);
    if (!existing) {
      rateMap.set(key, r);
    } else {
      // Prefer context that contains condition-relevant keywords
      const score = (ctx: string) => {
        let s = 0;
        const cl = ctx.toLowerCase();
        if (/per\s*hour\s*for/i.test(cl)) s += 10;
        if (/employee/i.test(cl)) s += 5;
        if (/business|employer/i.test(cl)) s += 5;
        if (/large|small|very large/i.test(cl)) s += 5;
        if (/tipped|hotel|fast food/i.test(cl)) s += 5;
        // Penalize table-like contexts (many dollar amounts close together)
        const dollarCount = (cl.match(/\$\d+/g) || []).length;
        if (dollarCount > 3) s -= 10;
        return s;
      };
      if (score(r.context) > score(existing.context)) {
        rateMap.set(key, r);
      }
    }
  }
  const uniqueRates = Array.from(rateMap.values());

  // ─── Select the effective year ───────────────────────────────────
  // Determine which year represents the "current law"
  let effectiveYear: string | null = null;

  // Prefer current calendar year
  const hasCurrentYear = uniqueRates.some(r => r.year === String(currentYear));
  if (hasCurrentYear) {
    effectiveYear = String(currentYear);
  }

  // If no current year, try next year (laws often set in advance)
  if (!effectiveYear) {
    const hasNextYear = uniqueRates.some(r => r.year === String(currentYear + 1));
    if (hasNextYear) effectiveYear = String(currentYear + 1);
  }

  // If still nothing, find the latest year available
  if (!effectiveYear) {
    const datedRates = uniqueRates
      .filter(r => r.year !== null)
      .sort((a, b) => parseInt(b.year!) - parseInt(a.year!));
    if (datedRates.length > 0) {
      effectiveYear = datedRates[0].year!;
    }
  }

  // ─── Select the best rate ────────────────────────────────────────
  let selectedRate: { amount: string; year: string; reason: string } | null = null;

  if (effectiveYear) {
    const effectiveRates = uniqueRates.filter(r => r.year === effectiveYear);
    if (effectiveRates.length > 0) {
      // Pick the highest amount for the effective year as the primary/default rate
      const sorted = [...effectiveRates].sort((a, b) => parseFloat(b.amount.slice(1)) - parseFloat(a.amount.slice(1)));
      const reason = effectiveYear === String(currentYear) ? "current_year" :
                     effectiveYear === String(currentYear + 1) ? "next_year" : "latest_available_year";
      selectedRate = { amount: sorted[0].amount, year: effectiveYear, reason };
    }
  }

  // If no year context at all, pick the highest amount
  if (!selectedRate && uniqueRates.length > 0) {
    const sorted = [...uniqueRates].sort((a, b) => parseFloat(b.amount.slice(1)) - parseFloat(a.amount.slice(1)));
    selectedRate = { amount: sorted[0].amount, year: "unknown", reason: "highest_amount" };
    effectiveYear = "unknown";
  }

  if (!selectedRate) return null;

  // ─── Filter to ONLY current/effective rates ──────────────────────
  // This is the key fix: only rates from the effective year (or rates
  // that are clearly about the current law) belong in the canonical rule.
  const currentRates = uniqueRates.filter(r => {
    // Include rates from the effective year
    if (r.year === effectiveYear) return true;
    // Include null-year rates that appear to be current (not historical)
    if (r.year === null && effectiveYear !== "unknown") {
      const contextLower = r.context.toLowerCase();
      // Strong signal: context mentions employer size tiers (multi-rate page)
      const hasEmployerSizeContext = /(?:employee|employer|business)/.test(contextLower) &&
        (/(?:large|small|very large|\d+\s*(?:or\s*more|or\s*fewer|\+)|\d+\s*[-–]\s*\d+)/.test(contextLower));
      // Strong signal: "per hour for" pattern (current rate listing)
      const hasPerHourFor = /per\s*hour\s*for/.test(contextLower);
      // Moderate signal: context suggests current rate
      const isLikelyCurrent = contextLower.includes("current") ||
        contextLower.includes("effective") ||
        contextLower.includes(String(currentYear)) ||
        (contextLower.includes("per hour") && !contextLower.includes("was ") && !contextLower.includes("previous"));

      // Include if context clearly indicates a current tiered rate
      if (hasEmployerSizeContext || hasPerHourFor) return true;
      // Also include if rate >= selected and context suggests current (original logic)
      const rateVal = parseFloat(r.amount.slice(1));
      const selectedVal = parseFloat(selectedRate!.amount.slice(1));
      if (rateVal >= selectedVal && isLikelyCurrent) return true;
    }
    return false;
  });

  // ─── Detect sequential vs. tiered rates ──────────────────────────
  // If multiple rates exist for the effective year, determine whether they
  // represent SEQUENTIAL changes (e.g., $11.91 on Jan 1, $13.00 on Jul 1)
  // or TIERED rates (e.g., $17.79 for large employers, $16.90 for small).
  //
  // Sequential pattern: rates appear in a chronological list with dates,
  // all for the same jurisdiction with no condition differentiators.
  // In this case, only the LAST (most recent) rate is currently active.
  //
  // Tiered pattern: rates appear with different condition labels (employer
  // size, industry, etc.) — all are simultaneously active.
  let filteredCurrentRates = currentRates;

  if (currentRates.length > 1) {
    // Check if all rates for the effective year appear to be sequential
    // (i.e., they're in a chronological table with no condition differentiators)
    const conditions = currentRates.map(r => inferRateCondition(r.context));
    const allUnconditioned = conditions.every(c => c.type === null);
    
    // Detect chronological list pattern: dates like "01/01/2025 $X 07/01/2025 $Y"
    // or "January 1, 2025... July 1, 2025..." appearing in order
    const hasChronologicalDates = currentRates.length >= 2 && currentRates.every(r => {
      // Check if context contains a specific date (MM/DD/YYYY or month+day+year)
      return /\d{1,2}\/\d{1,2}\/\d{4}/.test(r.context) ||
             /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i.test(r.context);
    });

    if (allUnconditioned && hasChronologicalDates) {
      // Sequential rates — keep only the highest amount (most recent effective date)
      const sorted = [...currentRates].sort((a, b) => parseFloat(b.amount.slice(1)) - parseFloat(a.amount.slice(1)));
      filteredCurrentRates = [sorted[0]];
    } else if (allUnconditioned && !hasChronologicalDates) {
      // Multiple rates without conditions or dates — ambiguous.
      // If they're close in value (within $2), might be sequential; keep highest.
      // If far apart, might be different tiers; keep all.
      const values = currentRates.map(r => parseFloat(r.amount.slice(1)));
      const maxVal = Math.max(...values);
      const minVal = Math.min(...values);
      if (maxVal - minVal < 2.0 && currentRates.length <= 3) {
        // Likely sequential — keep highest
        const sorted = [...currentRates].sort((a, b) => parseFloat(b.amount.slice(1)) - parseFloat(a.amount.slice(1)));
        filteredCurrentRates = [sorted[0]];
      }
      // Otherwise keep all (they may be genuinely different tiers)
    }
  }

  // ─── Extract conditions for multi-rate jurisdictions ─────────────
  const conditionedRates: ConditionedRate[] = [];
  for (const rate of filteredCurrentRates) {
    const condition = inferRateCondition(rate.context);
    conditionedRates.push({
      amount: rate.amount,
      condition: condition.type,
      conditionDetail: condition.detail,
    });
  }

  // Deduplicate conditioned rates by amount (keep the one with a condition)
  const seenAmounts = new Set<string>();
  const dedupedRates = conditionedRates.filter(r => {
    if (seenAmounts.has(r.amount)) return false;
    seenAmounts.add(r.amount);
    return true;
  });

  // Determine multiRate
  const distinctAmounts = new Set(dedupedRates.map(r => r.amount));
  const multiRate = distinctAmounts.size > 1;

  // ─── Determine confidence ────────────────────────────────────────
  let confidence: "high" | "medium" | "low" = "medium";
  if (effectiveYear === String(currentYear) && dedupedRates.length >= 1) {
    confidence = "high";
  } else if (effectiveYear === "unknown" || selectedRate.reason === "highest_amount") {
    confidence = "low";
  }

  // ─── Detect if page is purely historical ─────────────────────────
  // Only flag as historical if the page is PRIMARILY about past rates
  // (e.g., a "wage history" page with no current-year data).
  // Merely mentioning "history" in passing doesn't count.
  const textLower = workingText.toLowerCase();
  const isHistoryPage = (
    // URL or title strongly suggests history
    /history|historical/i.test(workingText.slice(0, 200)) ||
    /past\s*rates|previous\s*rates|wage\s*history|rate\s*history/i.test(textLower)
  ) && effectiveYear !== String(currentYear) && effectiveYear !== String(currentYear + 1);
  if (isHistoryPage) {
    confidence = "low";
  }

  // ─── Determine the default (general) rate ─────────────────────────
  // The default rate is the unconditioned/general rate. If all rates have
  // conditions, fall back to the highest amount.
  const generalRate = dedupedRates.find(r => r.condition === null);
  const defaultRate = generalRate?.amount || selectedRate.amount;

  // ─── Build canonical rule ────────────────────────────────────────
  // The canonical rule contains ONLY what's needed to evaluate the current law
  const canonicalRule: MinimumWageRule = {
    ruleType: "minimum_wage",
    jurisdiction: jurisdictionName || "unknown",
    effectiveYear: effectiveYear || "unknown",
    rates: dedupedRates,
    defaultRate,
    multiRate,
    confidence,
    notes: isHistoryPage ? "Source page appears to be historical; rate may need verification." : null,
  };

  return {
    allRatesFound: uniqueRates.slice(0, 10),
    selectedRate,
    multiRate,
    canonicalRule,
  };
}

// ─── Employer size detection helper ────────────────────────────────

/**
 * Detects employer size conditions from a text fragment.
 * Handles patterns like:
 *   - "100 or more employees" / "26+ employees"
 *   - "25 or fewer employees" / "1-25 employees"
 *   - "26-99 employees" (mid-range)
 *   - "very large businesses" / "large businesses" / "small businesses"
 *   - "large employer" / "small employer"
 */
function detectEmployerSize(text: string): { type: string; detail: string } | null {
  const lower = text.toLowerCase();

  // "very large business" with explicit threshold (e.g., "100 or more")
  const veryLargeMatch = lower.match(/very\s*large\s*(?:business|employer)(?:es)?\s*(?:with\s*)?(\d+)\s*(?:or\s*more|\+)/);
  if (veryLargeMatch) {
    return { type: "large_employer", detail: `${veryLargeMatch[1]} or more employees` };
  }

  // Explicit "N or more employees"
  const orMoreMatch = text.match(/(\d+)\s*(?:or\s*more|\+)\s*employee/i);
  if (orMoreMatch && parseInt(orMoreMatch[1]) > 1) {
    const n = parseInt(orMoreMatch[1]);
    if (n >= 100) return { type: "large_employer", detail: `${n} or more employees` };
    if (n >= 26) return { type: "large_employer", detail: `${n} or more employees` };
    return { type: "small_employer", detail: `${n} or more employees` };
  }

  // Explicit "N or fewer/less employees"
  const orFewerMatch = text.match(/(\d+)\s*(?:or\s*fewer|or\s*less)\s*employee/i);
  if (orFewerMatch) {
    const n = parseInt(orFewerMatch[1]);
    if (n <= 25) return { type: "small_employer", detail: `${n} or fewer employees` };
    if (n <= 99) return { type: "large_employer", detail: `${n} or fewer employees` };
    return { type: "large_employer", detail: `${n} or fewer employees` };
  }

  // Range pattern: "N-M employees" (e.g., "26-99 employees", "1-25 employees")
  const rangeMatch = text.match(/(\d+)\s*[-–]\s*(\d+)\s*employee/i);
  if (rangeMatch) {
    const low = parseInt(rangeMatch[1]);
    const high = parseInt(rangeMatch[2]);
    if (low <= 1 && high <= 25) return { type: "small_employer", detail: `${low}-${high} employees` };
    if (low >= 26 && high <= 99) return { type: "large_employer", detail: `${low}-${high} employees` };
    if (low >= 100) return { type: "large_employer", detail: `${low}-${high} employees` };
    // Ambiguous range
    return { type: high <= 25 ? "small_employer" : "large_employer", detail: `${low}-${high} employees` };
  }

  // "fewer than N" / "less than N" / "under N" employees
  const fewerThanMatch = text.match(/(?:fewer\s*than|less\s*than|under)\s*(\d+)\s*employee/i);
  if (fewerThanMatch) {
    const n = parseInt(fewerThanMatch[1]);
    if (n <= 26) return { type: "small_employer", detail: `fewer than ${n} employees` };
    return { type: "large_employer", detail: `fewer than ${n} employees` };
  }

  // "more than N" / "over N" / "exceeding N" employees
  const moreThanMatch = text.match(/(?:more\s*than|over|exceeding)\s*(\d+)\s*employee/i);
  if (moreThanMatch) {
    const n = parseInt(moreThanMatch[1]);
    return { type: "large_employer", detail: `more than ${n} employees` };
  }

  // Named size categories: "very large business(es)", "large business(es)", "small business(es)"
  if (/(?:for|per\s*hour\s*for)\s*(?:very\s*large)\s*(?:business|employer)/i.test(text)) {
    return { type: "large_employer", detail: "Very large employer (100+ employees)" };
  }
  if (/(?:for|per\s*hour\s*for)\s*large\s*(?:business|employer)/i.test(text)) {
    return { type: "large_employer", detail: "Large employer (26+ employees)" };
  }
  if (/(?:for|per\s*hour\s*for)\s*small\s*(?:business|employer)/i.test(text)) {
    return { type: "small_employer", detail: "Small employer (1-25 employees)" };
  }

  // Standalone "large employer" / "small employer" labels (weaker signal)
  if (/large\s*employer/i.test(text) && !/small/i.test(text)) {
    return { type: "large_employer", detail: "Large employer" };
  }
  if (/small\s*employer/i.test(text) && !/large/i.test(text)) {
    return { type: "small_employer", detail: "Small employer" };
  }

  return null;
}

// ─── Condition inference from context ──────────────────────────────

/**
 * Infers the applicability condition for a wage rate from its surrounding context.
 *
 * IMPORTANT: Only assigns a condition if the context clearly indicates the rate
 * IS FOR that category. Merely mentioning another category nearby (e.g., "Fast food
 * workers have different rates") does NOT mean this rate is for fast food workers.
 *
 * Heuristic: The condition keyword must appear BEFORE the dollar amount in the
 * context string, or the rate must be explicitly described as being "for" that group.
 */
function inferRateCondition(context: string): { type: string | null; detail: string | null } {
  // Split context at the dollar amount to get text BEFORE and AFTER
  const dollarIdx = context.search(/\$\d+\.\d{2}/);
  const beforeAmount = dollarIdx >= 0 ? context.slice(0, dollarIdx).toLowerCase() : context.toLowerCase();
  const afterAmount = dollarIdx >= 0 ? context.slice(dollarIdx).toLowerCase() : "";

  // Helper: check if a pattern clearly ATTRIBUTES the rate to a specific group.
  // Must appear in a structure like "X rate is $Y" or "$Y for X" or "X minimum wage: $Y"
  // or "minimum wage for X ... $Y"
  // NOT in a general description like "sets general and hotel worker wages"
  function isConditionFor(pattern: RegExp): boolean {
    // Strong signal 1: "for [condition] ... [will be / is / rise to] $X"
    // The "for [condition]" phrase appears before the amount with a verb connecting them
    const forConditionPattern = new RegExp(
      `(?:for|for\\s+qualified)\\s+[^.]*?(?:${pattern.source})[^.]*?(?:will|is|are|rise|increase|be|set\\s+at|:)`,
      'i'
    );
    if (forConditionPattern.test(beforeAmount)) return true;

    // Strong signal 2: "[condition] minimum wage/rate ... $X" (condition directly modifies wage)
    const conditionWagePattern = new RegExp(
      `(?:${pattern.source})\\s+(?:minimum\\s*wage|wage\\s*rate|rate|hourly\\s*rate|minimum)`,
      'i'
    );
    if (conditionWagePattern.test(beforeAmount)) return true;

    // Strong signal 3: "$X ... for [condition]" immediately after the amount
    const attributiveAfterPattern = new RegExp(
      `^[^.]{0,40}?(?:for|applies\\s*to|covers?)\\s+[^.]*?(?:${pattern.source})`,
      'i'
    );
    if (attributiveAfterPattern.test(afterAmount.slice(0, 80))) return true;

    // Weak signal that should NOT trigger: pattern appears in a general description
    // like "sets general and hotel worker wages and mandates..."
    // These are just describing the law's scope, not attributing this specific rate.
    return false;
  }

  // ─── Employer size conditions ──────────────────────────────────────
  // On pages listing rates sequentially ("$X for large... $Y for small..."),
  // the condition for THIS rate appears AFTER the dollar amount.
  // Prefer afterAmount matches over beforeAmount to avoid cross-contamination.

  // First, check afterAmount for employer size (most reliable for sequential listings)
  const afterEmployerSize = detectEmployerSize(afterAmount.slice(0, 120));
  if (afterEmployerSize) return afterEmployerSize;

  // Fall back to beforeAmount only if afterAmount has no employer size info
  const beforeEmployerSize = detectEmployerSize(beforeAmount);
  if (beforeEmployerSize) return beforeEmployerSize;

  // Hotel workers — only if clearly before the amount or attributed
  // Exclude "non-hotel" which indicates the OPPOSITE (general rate)
  if (isConditionFor(/(?<!non[- ]?)hotel/i)) {
    return { type: "hotel_worker", detail: "Hotel industry employees" };
  }
  // Non-hotel employees — this is the general/default rate, no special condition
  if (/non[- ]?hotel/i.test(beforeAmount)) {
    return { type: null, detail: null };
  }

  // Fast food workers — only if clearly before the amount or attributed
  if (isConditionFor(/fast\s*food/i)) {
    return { type: "fast_food_worker", detail: "Fast food restaurant employees" };
  }

  // Healthcare workers — only if clearly before the amount or attributed
  if (isConditionFor(/health\s*care|healthcare/i)) {
    return { type: "healthcare_worker", detail: "Healthcare industry employees" };
  }

  // Tipped employees — only if clearly before the amount or attributed
  if (isConditionFor(/tipped|tip\s*credit|cash\s*wage/i)) {
    return { type: "tipped_employee", detail: "Tipped employees (tip credit applies)" };
  }

  // Learner / trainee / youth / subminimum wage
  if (isConditionFor(/learner|trainee|training\s*wage|youth|subminimum|sub[- ]minimum|opportunity\s*wage|student\s*(?:worker|employee)/i) ||
      /learner'?s?\s*wage/i.test(beforeAmount + afterAmount) ||
      /85\s*%\s*(?:of\s*)?(?:the\s*)?(?:minimum|wage)/i.test(beforeAmount + afterAmount)) {
    return { type: "learner", detail: "Learner/trainee wage (reduced rate)" };
  }

  // Non-profit
  if (isConditionFor(/non-?profit|not-?for-?profit/i)) {
    return { type: "nonprofit_employer", detail: "Non-profit organization employees" };
  }

  // State minimum (reference to state rate on a local page)
  if (/state\s*minimum/i.test(beforeAmount) || /ca\s*state/i.test(beforeAmount) || /california\s*state/i.test(beforeAmount)) {
    return { type: "state_minimum_reference", detail: "State minimum wage (reference)" };
  }

  // Very large employers (specific thresholds)
  if (/very\s*large/i.test(beforeAmount)) {
    return { type: "very_large_employer", detail: "Very large employer" };
  }

  // No condition detected — this is the general/default rate
  return { type: null, detail: null };
}

// ─── Overtime structured rule extraction ───────────────────────────

function extractOvertimeRule(text: string, textLower: string): Record<string, unknown> | null {
  // Determine basis: weekly vs daily
  const hasWeekly = /40\s*hours?\s*(?:per|in|a|each)?\s*(?:work\s*)?week/i.test(text) ||
    /workweek/i.test(text) ||
    /exceed(?:s|ing)?\s*(?:40|forty)\s*hours/i.test(text);
  const hasDaily = /(?:8|eight)\s*hours?\s*(?:per|in|a|each)?\s*(?:work\s*)?day/i.test(text) ||
    /exceed(?:s|ing)?\s*(?:8|eight)\s*hours?\s*(?:in|per|a)?\s*(?:work\s*)?day/i.test(text);

  // Determine threshold
  let weeklyThreshold: number | null = null;
  let dailyThreshold: number | null = null;

  if (hasWeekly) {
    const m = text.match(/(\d+)\s*hours?\s*(?:per|in|a|each)?\s*(?:work\s*)?week/i);
    weeklyThreshold = m ? parseInt(m[1]) : 40;
  }
  if (hasDaily) {
    const m = text.match(/(\d+)\s*hours?\s*(?:per|in|a|each)?\s*(?:work\s*)?day/i);
    dailyThreshold = m ? parseInt(m[1]) : 8;
  }

  // If neither found, not enough data
  if (!weeklyThreshold && !dailyThreshold) return null;

  // Determine premium rate
  let premiumRate = 1.5; // default
  if (/double\s*time/i.test(text) || /2\.0\s*(?:x|times)/i.test(text)) {
    // Page mentions double time — but 1.5 is still the standard first tier
    // Keep 1.5 as primary unless only double time is mentioned
    if (!/1\.5|one\s*and\s*(?:a|one)\s*half|time\s*and\s*(?:a|one)\s*half/i.test(text)) {
      premiumRate = 2.0;
    }
  }

  // Determine applicability
  const appliesTo: Record<string, string> = {};
  if (/non-?exempt/i.test(text) || /covered\s*(?:non-?exempt\s*)?employees/i.test(text)) {
    appliesTo["employee.exemption_status"] = "non_exempt";
  }

  // Determine jurisdiction context
  let jurisdiction = "unknown";
  if (/fair\s*labor\s*standards\s*act|flsa/i.test(text)) {
    jurisdiction = "federal";
  } else if (/federal/i.test(text) && /department\s*of\s*labor|dol|wage\s*and\s*hour/i.test(text)) {
    jurisdiction = "federal";
  }

  // Build the rule
  const basis = weeklyThreshold ? "weekly_hours" : "daily_hours";
  const threshold = weeklyThreshold
    ? { hours: weeklyThreshold, period: "workweek" }
    : { hours: dailyThreshold!, period: "workday" };

  const rule: Record<string, unknown> = {
    ruleType: "overtime",
    jurisdiction,
    basis,
    threshold,
    premiumRate,
    appliesTo: Object.keys(appliesTo).length > 0 ? appliesTo : { "employee.exemption_status": "non_exempt" },
    calculation: basis === "weekly_hours"
      ? {
          overtimeHours: `max(0, hours_worked_in_workweek - ${threshold.hours})`,
          overtimePay: `overtimeHours * regular_rate * ${premiumRate}`,
        }
      : {
          overtimeHours: `max(0, hours_worked_in_workday - ${threshold.hours})`,
          overtimePay: `overtimeHours * regular_rate * ${premiumRate}`,
        },
  };

  return rule;
}

// ─── Tipped Compensation extraction ────────────────────────────────

function extractTippedCompensationRule(text: string, textLower: string): Record<string, unknown> | null {
  // Extract cash wage amount
  let cashWage: string | null = null;
  const cashWageMatch = text.match(/cash\s*wage[^$]*(\$\d+\.\d{2})/i) ||
    text.match(/(\$\d+\.\d{2})\s*(?:per\s*hour)?\s*(?:in\s*)?(?:direct\s*)?(?:cash\s*)?wage/i);
  if (cashWageMatch) cashWage = cashWageMatch[1];

  // Extract tip credit amount
  let tipCredit: string | null = null;
  const tipCreditMatch = text.match(/tip\s*credit[^$]*(\$\d+\.\d{2})/i) ||
    text.match(/(\$\d+\.\d{2})\s*(?:per\s*hour)?\s*(?:as\s*)?(?:a\s*)?tip\s*credit/i) ||
    text.match(/credit\s*(?:of|up\s*to)\s*(\$\d+\.\d{2})/i);
  if (tipCreditMatch) tipCredit = tipCreditMatch[1];

  // Extract minimum wage reference
  let minimumWage: string | null = null;
  const mwMatch = text.match(/(?:federal\s*)?minimum\s*wage[^$]*(\$\d+\.\d{2})/i);
  if (mwMatch) minimumWage = mwMatch[1];

  // Must find structural content — either dollar amounts or strong rule concepts
  const hasTipCreditConcept = /tip\s*credit/i.test(textLower) && /employer/i.test(textLower);
  const hasTipPoolConcept = /tip\s*pool/i.test(textLower);
  const hasNotificationConcept = /(?:inform|notify|notice).*tip\s*credit/i.test(textLower);
  if (!cashWage && !tipCredit && !hasTipCreditConcept && !hasTipPoolConcept) return null;

  const rule: Record<string, unknown> = {
    ruleType: "tipped_compensation",
    jurisdiction: /flsa|fair\s*labor\s*standards/i.test(text) ? "federal" : "unknown",
  };

  if (cashWage) rule.cashWage = cashWage;
  if (tipCredit) rule.tipCredit = tipCredit;
  if (minimumWage) rule.minimumWageReference = minimumWage;

  // Tip pooling rules
  if (/tip\s*pool/i.test(textLower)) {
    rule.tipPooling = /permitted|allowed|may\s*(?:require|implement)/i.test(textLower) ? "permitted_with_conditions" : "referenced";
  }

  // Notification requirement
  if (/inform|notify|notice/i.test(textLower) && /tip\s*credit/i.test(textLower)) {
    rule.notificationRequired = true;
  }

  rule.appliesTo = { "employee.tipped_status": "tipped" };
  rule.calculation = {
    minimumGuarantee: `cash_wage + tips >= minimum_wage`,
    tipCredit: tipCredit ? `employer may credit up to ${tipCredit} of tips toward minimum wage` : "varies",
  };

  return rule;
}

// ─── Compensable Time extraction ───────────────────────────────────

function extractCompensableTimeRule(text: string, textLower: string): Record<string, unknown> | null {
  const categories: { type: string; compensable: string; conditions: string }[] = [];

  // Travel time
  if (/travel\s*time/i.test(textLower)) {
    let compensable = "conditional";
    if (/home\s*to\s*work.*not\s*compensable|normal\s*commut.*not\s*compensable/i.test(textLower)) {
      compensable = "not_compensable_for_normal_commute";
    }
    categories.push({ type: "travel_time", compensable, conditions: "Travel during workday or to distant job site may be compensable" });
  }

  // Waiting time
  if (/waiting\s*time|wait(?:ing)?\s*to\s*be\s*engaged/i.test(textLower)) {
    categories.push({ type: "waiting_time", compensable: "depends_on_control", conditions: "Engaged to wait = compensable; waiting to be engaged = not compensable" });
  }

  // On-call time
  if (/on-?\s*call/i.test(textLower)) {
    categories.push({ type: "on_call", compensable: "depends_on_restrictions", conditions: "Restricted on-call may be compensable" });
  }

  // Training time
  if (/training\s*time|training\s*(?:is|not)\s*compensable/i.test(textLower)) {
    categories.push({ type: "training_time", compensable: "conditional", conditions: "Voluntary + outside hours + unrelated to job + no productive work = not compensable" });
  }

  // Donning/doffing
  if (/donning|doffing|changing\s*clothes|protective\s*(?:gear|equipment)/i.test(textLower)) {
    categories.push({ type: "donning_doffing", compensable: "integral_and_indispensable", conditions: "Compensable if integral and indispensable to principal activity" });
  }

  if (categories.length === 0) return null;

  return {
    ruleType: "compensable_time",
    jurisdiction: /flsa|fair\s*labor\s*standards|29\s*cfr\s*785/i.test(text) ? "federal" : "unknown",
    principalActivityDoctrine: /principal\s*activit/i.test(textLower),
    continuousWorkdayRule: /continuous\s*workday/i.test(textLower),
    categories,
    appliesTo: { "employee.exemption_status": "non_exempt" },
  };
}

// ─── Equal Pay extraction ──────────────────────────────────────────

function extractEqualPayRule(text: string, textLower: string): Record<string, unknown> | null {
  if (!/equal\s*pay/i.test(textLower) && !/pay\s*(?:equity|discrimination)/i.test(textLower)) return null;

  const protectedClasses: string[] = [];
  if (/\bsex\b|gender/i.test(textLower)) protectedClasses.push("sex");
  if (/\brace\b/i.test(textLower)) protectedClasses.push("race");
  if (/national\s*origin/i.test(textLower)) protectedClasses.push("national_origin");
  if (/\bcolor\b/i.test(textLower)) protectedClasses.push("color");
  if (/\breligion\b/i.test(textLower)) protectedClasses.push("religion");

  const defenses: string[] = [];
  if (/seniority/i.test(textLower)) defenses.push("seniority_system");
  if (/merit/i.test(textLower)) defenses.push("merit_system");
  if (/quantity\s*or\s*quality/i.test(textLower)) defenses.push("quantity_or_quality_of_production");
  if (/bona\s*fide\s*factor/i.test(textLower)) defenses.push("bona_fide_factor_other_than_sex");

  const comparison = /substantially\s*equal/i.test(textLower) ? "substantially_equal_work" : "equal_work";

  return {
    ruleType: "equal_pay",
    jurisdiction: /equal\s*pay\s*act|29\s*u\.?s\.?c|epa/i.test(text) ? "federal" : "unknown",
    statute: /equal\s*pay\s*act/i.test(text) ? "Equal Pay Act of 1963" : undefined,
    protectedClasses: protectedClasses.length > 0 ? protectedClasses : ["sex"],
    comparisonStandard: comparison,
    factors: ["skill", "effort", "responsibility", "working_conditions"],
    affirmativeDefenses: defenses.length > 0 ? defenses : undefined,
    appliesTo: { "employer.covered": true },
    requirement: "Employers must pay equal wages for substantially equal work regardless of protected class",
  };
}

// ─── FMLA extraction ───────────────────────────────────────────────

function extractFMLARule(text: string, textLower: string): Record<string, unknown> | null {
  // Extract leave duration
  let leaveWeeks: number | null = null;
  const weeksMatch = text.match(/(\d+)\s*(?:work\s*)?weeks?\s*(?:of\s*)?(?:unpaid\s*)?(?:leave|fmla)/i);
  if (weeksMatch) leaveWeeks = parseInt(weeksMatch[1]);

  // Extract employer threshold
  let employerThreshold: number | null = null;
  const empMatch = text.match(/(\d+)\s*(?:or\s*more\s*)?employees/i);
  if (empMatch) employerThreshold = parseInt(empMatch[1]);

  // Extract employee eligibility
  let monthsEmployed: number | null = null;
  let hoursWorked: number | null = null;
  const monthsMatch = text.match(/(\d+)\s*months?\s*(?:of\s*)?(?:employment|employed|service)/i);
  if (monthsMatch) monthsEmployed = parseInt(monthsMatch[1]);
  const hoursMatch = text.match(/(1,?250|1250)\s*hours/i);
  if (hoursMatch) hoursWorked = 1250;

  if (!leaveWeeks && !employerThreshold) return null;

  const qualifyingReasons: string[] = [];
  if (/birth|newborn|son\s*or\s*daughter/i.test(textLower)) qualifyingReasons.push("birth_or_placement");
  if (/serious\s*health\s*condition/i.test(textLower)) qualifyingReasons.push("serious_health_condition");
  if (/spouse|parent|child/i.test(textLower) && /care/i.test(textLower)) qualifyingReasons.push("care_for_family_member");
  if (/military|servicemember/i.test(textLower)) qualifyingReasons.push("military_family");

  return {
    ruleType: "family_medical_leave",
    jurisdiction: /fmla|family\s*and\s*medical\s*leave\s*act/i.test(text) ? "federal" : "unknown",
    leaveDuration: leaveWeeks ? { weeks: leaveWeeks, period: "12_month_period", paid: false } : undefined,
    employerCoverage: employerThreshold ? { minimumEmployees: employerThreshold, scope: "within_75_miles" } : undefined,
    employeeEligibility: {
      ...(monthsEmployed ? { monthsEmployed } : {}),
      ...(hoursWorked ? { hoursWorked } : {}),
    },
    qualifyingReasons: qualifyingReasons.length > 0 ? qualifyingReasons : undefined,
    jobProtection: /restor|reinstat|return\s*to/i.test(textLower),
    benefitsContinuation: /health\s*(?:insurance|benefits?|coverage)/i.test(textLower),
    appliesTo: {
      "employer.total_employees_global": `>= ${employerThreshold || 50}`,
      "employee.tenure_months": `>= ${monthsEmployed || 12}`,
    },
  };
}

// ─── Minor Labor extraction ────────────────────────────────────────

function extractMinorLaborRule(text: string, textLower: string): Record<string, unknown> | null {
  const ageGroups: { ageRange: string; maxHoursDay?: number; maxHoursWeek?: number; conditions?: string }[] = [];

  // 14-15 year olds
  const match14 = text.match(/14\s*(?:and|&|-)\s*15\s*year/i);
  if (match14) {
    const hoursDay = text.match(/(?:14.*?15.*?)(\d+)\s*hours?\s*(?:per|a|each|in\s*a)\s*(?:school\s*)?day/i);
    const hoursWeek = text.match(/(?:14.*?15.*?)(\d+)\s*hours?\s*(?:per|a|each|in\s*a)\s*(?:school\s*)?week/i);
    ageGroups.push({
      ageRange: "14-15",
      maxHoursDay: hoursDay ? parseInt(hoursDay[1]) : undefined,
      maxHoursWeek: hoursWeek ? parseInt(hoursWeek[1]) : undefined,
    });
  }

  // 16-17 year olds
  const match16 = text.match(/16\s*(?:and|&|-)\s*17\s*year/i);
  if (match16) {
    ageGroups.push({ ageRange: "16-17", conditions: "No federal hour limits but hazardous occupation restrictions apply" });
  }

  // General hour limits
  if (ageGroups.length === 0) {
    const generalHoursDay = text.match(/(\d+)\s*hours?\s*(?:per|a|each|in\s*a)\s*(?:school\s*)?day/i);
    const generalHoursWeek = text.match(/(\d+)\s*hours?\s*(?:per|a|each|in\s*a)\s*(?:school\s*)?week/i);
    if (generalHoursDay || generalHoursWeek) {
      ageGroups.push({
        ageRange: "under_18",
        maxHoursDay: generalHoursDay ? parseInt(generalHoursDay[1]) : undefined,
        maxHoursWeek: generalHoursWeek ? parseInt(generalHoursWeek[1]) : undefined,
      });
    }
  }

  const hasHazardous = /hazardous\s*occupation/i.test(textLower);
  const minimumAge = /14\s*years?\s*(?:of\s*age|old|minimum)/i.test(textLower) ? 14 : undefined;

  if (ageGroups.length === 0 && !hasHazardous && !minimumAge) return null;

  return {
    ruleType: "minor_labor",
    jurisdiction: /flsa|fair\s*labor\s*standards|child\s*labor/i.test(text) ? "federal" : "unknown",
    minimumEmploymentAge: minimumAge,
    ageGroups: ageGroups.length > 0 ? ageGroups : undefined,
    hazardousOccupationRestrictions: hasHazardous,
    schoolHourRestrictions: /school/i.test(textLower),
    appliesTo: { "employee.age": "< 18" },
  };
}

// ─── WARN Act extraction ───────────────────────────────────────────

function extractWARNRule(text: string, textLower: string): Record<string, unknown> | null {
  let employerThreshold: number | null = null;
  const empMatch = text.match(/(\d+)\s*(?:or\s*more\s*)?(?:full-?time\s*)?employees/i);
  if (empMatch) employerThreshold = parseInt(empMatch[1]);

  let noticeDays: number | null = null;
  const noticeMatch = text.match(/(\d+)\s*(?:calendar\s*)?days?(?:\s*(?:advance|written|prior))?\s*notice/i) ||
    text.match(/notice\s*(?:of\s*)?(?:at\s*least\s*)?(\d+)\s*(?:calendar\s*)?days/i);
  if (noticeMatch) noticeDays = parseInt(noticeMatch[1]);

  if (!employerThreshold && !noticeDays) return null;

  const triggers: string[] = [];
  if (/plant\s*clos/i.test(textLower)) triggers.push("plant_closing");
  if (/mass\s*layoff/i.test(textLower)) triggers.push("mass_layoff");
  if (/reduction\s*in\s*force/i.test(textLower)) triggers.push("reduction_in_force");

  return {
    ruleType: "warn_act",
    jurisdiction: /worker\s*adjustment|warn\s*act/i.test(text) ? "federal" : "unknown",
    employerCoverage: employerThreshold ? { minimumEmployees: employerThreshold, type: "full_time_equivalent" } : undefined,
    noticeRequirement: noticeDays ? { days: noticeDays, type: "calendar_days", written: true } : undefined,
    triggers: triggers.length > 0 ? triggers : undefined,
    exceptions: /faltering\s*company|unforeseeable|natural\s*disaster/i.test(textLower)
      ? ["faltering_company", "unforeseeable_business_circumstances", "natural_disaster"].filter(e =>
          textLower.includes(e.replace(/_/g, " ").split("_")[0]))
      : undefined,
    appliesTo: {
      "employer.total_employees_global": `>= ${employerThreshold || 100}`,
    },
  };
}

// ─── Anti-Discrimination extraction ────────────────────────────────

function extractAntiDiscriminationRule(text: string, textLower: string): Record<string, unknown> | null {
  let employerThreshold: number | null = null;
  const empMatch = text.match(/(\d+)\s*(?:or\s*more\s*)?employees/i);
  if (empMatch) employerThreshold = parseInt(empMatch[1]);

  const protectedClasses: string[] = [];
  if (/\brace\b/i.test(textLower)) protectedClasses.push("race");
  if (/\bcolor\b/i.test(textLower)) protectedClasses.push("color");
  if (/\breligion\b/i.test(textLower)) protectedClasses.push("religion");
  if (/\bsex\b|gender/i.test(textLower)) protectedClasses.push("sex");
  if (/national\s*origin/i.test(textLower)) protectedClasses.push("national_origin");
  if (/\bage\b/i.test(textLower) && /discrimination/i.test(textLower)) protectedClasses.push("age");
  if (/disabilit/i.test(textLower)) protectedClasses.push("disability");
  if (/genetic/i.test(textLower)) protectedClasses.push("genetic_information");
  if (/pregnan/i.test(textLower)) protectedClasses.push("pregnancy");

  if (protectedClasses.length === 0 && !employerThreshold) return null;

  const statutes: string[] = [];
  if (/title\s*vii/i.test(text)) statutes.push("Title VII of the Civil Rights Act of 1964");
  if (/age\s*discrimination.*employment|adea/i.test(textLower)) statutes.push("Age Discrimination in Employment Act");
  if (/americans?\s*with\s*disabilities|ada\b/i.test(textLower)) statutes.push("Americans with Disabilities Act");
  if (/genetic\s*information.*nondiscrimination|gina/i.test(textLower)) statutes.push("Genetic Information Nondiscrimination Act");

  return {
    ruleType: "anti_discrimination",
    jurisdiction: /eeoc|title\s*vii|civil\s*rights\s*act/i.test(text) ? "federal" : "unknown",
    statutes: statutes.length > 0 ? statutes : undefined,
    protectedClasses,
    employerCoverage: employerThreshold ? { minimumEmployees: employerThreshold } : undefined,
    prohibitedActions: ["hiring", "firing", "compensation", "terms_and_conditions", "harassment", "retaliation"],
    enforcementAgency: /eeoc/i.test(text) ? "EEOC" : undefined,
    appliesTo: {
      "employer.total_employees_global": `>= ${employerThreshold || 15}`,
    },
  };
}

// ─── Workplace Safety extraction ───────────────────────────────────

function extractWorkplaceSafetyRule(text: string, textLower: string): Record<string, unknown> | null {
  if (!/osha|occupational\s*safety/i.test(textLower)) return null;

  const obligations: string[] = [];
  if (/general\s*duty/i.test(textLower)) obligations.push("general_duty_clause");
  if (/record\s*keep/i.test(textLower)) obligations.push("recordkeeping");
  if (/report/i.test(textLower) && /injur|fatalit|hospitaliz/i.test(textLower)) obligations.push("injury_reporting");
  if (/training/i.test(textLower)) obligations.push("safety_training");
  if (/poster|posting/i.test(textLower)) obligations.push("poster_display");

  // Extract penalty amounts
  const penalties: Record<string, string> = {};
  const seriousMatch = text.match(/serious.*?\$([0-9,]+)/i) || text.match(/\$([0-9,]+).*?(?:per|each)\s*(?:serious|violation)/i);
  if (seriousMatch) penalties.serious = `$${seriousMatch[1]}`;
  const willfulMatch = text.match(/willful.*?\$([0-9,]+)/i);
  if (willfulMatch) penalties.willful = `$${willfulMatch[1]}`;

  return {
    ruleType: "workplace_safety",
    jurisdiction: "federal",
    statute: "Occupational Safety and Health Act of 1970",
    enforcementAgency: "OSHA",
    obligations: obligations.length > 0 ? obligations : undefined,
    penalties: Object.keys(penalties).length > 0 ? penalties : undefined,
    generalDutyClause: /general\s*duty/i.test(textLower)
      ? "Employer shall furnish a place of employment free from recognized hazards causing or likely to cause death or serious physical harm"
      : undefined,
    appliesTo: { "employer.type": "private_sector_or_federal_agency" },
  };
}

// ─── Worker Classification extraction ──────────────────────────────

function extractWorkerClassificationRule(text: string, textLower: string): Record<string, unknown> | null {
  if (!/independent\s*contractor|classification/i.test(textLower)) return null;

  const tests: string[] = [];
  if (/economic\s*reality/i.test(textLower)) tests.push("economic_reality_test");
  if (/abc\s*test/i.test(textLower)) tests.push("abc_test");
  if (/common\s*law/i.test(textLower)) tests.push("common_law_test");
  if (/right\s*to\s*control/i.test(textLower)) tests.push("right_to_control");

  const factors: string[] = [];
  if (/(?:degree\s*of\s*)?control/i.test(textLower)) factors.push("behavioral_control");
  if (/financial\s*control|profit\s*or\s*loss/i.test(textLower)) factors.push("financial_control");
  if (/relationship|permanence|integral/i.test(textLower)) factors.push("type_of_relationship");
  if (/skill|initiative|judgment/i.test(textLower)) factors.push("skill_and_initiative");
  if (/investment/i.test(textLower)) factors.push("investment_in_equipment");

  if (tests.length === 0 && factors.length === 0) return null;

  return {
    ruleType: "worker_classification",
    jurisdiction: /flsa|dol|department\s*of\s*labor/i.test(text) ? "federal" : "unknown",
    classificationTests: tests.length > 0 ? tests : undefined,
    factors: factors.length > 0 ? factors : undefined,
    consequence: "Misclassified workers entitled to FLSA protections including minimum wage and overtime",
    appliesTo: { "employee.classification": "requires_determination" },
  };
}

// ─── Predictive Scheduling / Fair Workweek extraction ──────────────

function extractPredictiveSchedulingRule(text: string, textLower: string): Record<string, unknown> | null {
  // Detect advance notice requirement
  let advanceNoticeHours: number | null = null;
  let advanceNoticeDays: number | null = null;

  // Match patterns like:
  //   "14 days' advance notice of work schedule"
  //   "14 days in advance"
  //   "at least 14 days in advance"
  //   "post schedules 14 days before"
  //   "72 hours' advance notice"
  const daysPatterns = [
    /(\d+)\s*days?['\u2019]?\s*(?:advance|written)?\s*notice/i,
    /(\d+)\s*days?\s*in\s*advance/i,
    /(?:at\s*least|minimum\s*(?:of)?)\s*(\d+)\s*days?['\u2019]?\s*(?:in\s*advance|advance|before|prior)/i,
    /(?:post|provide|give)\s*(?:\w+\s*){0,4}(?:at\s*least\s*)?(\d+)\s*days?/i,
  ];
  for (const pat of daysPatterns) {
    const m = text.match(pat);
    if (m) {
      const val = parseInt(m[1] || m[2]);
      if (val >= 7 && val <= 30) { // reasonable advance notice range
        advanceNoticeDays = val;
        break;
      }
    }
  }

  const hoursPatterns = [
    /(\d+)\s*hours?['\u2019]?\s*(?:advance|written)?\s*notice/i,
    /(\d+)\s*hours?\s*in\s*advance/i,
    /(?:at\s*least|minimum\s*(?:of)?)\s*(\d+)\s*hours?['\u2019]?\s*(?:in\s*advance|advance|before|prior)/i,
  ];
  for (const pat of hoursPatterns) {
    const m = text.match(pat);
    if (m) {
      const val = parseInt(m[1] || m[2]);
      if (val >= 24 && val <= 336) { // reasonable advance notice range (1-14 days in hours)
        advanceNoticeHours = val;
        break;
      }
    }
  }

  if (!advanceNoticeHours && !advanceNoticeDays) return null;

  // Detect covered industries
  const industries: string[] = [];
  if (/fast\s*food/i.test(text)) industries.push("fast_food");
  if (/retail/i.test(text)) industries.push("retail");
  if (/utility\s*safety/i.test(text)) industries.push("utility_safety");
  if (/hospitality/i.test(text)) industries.push("hospitality");
  if (/food\s*service/i.test(text) && !industries.includes("fast_food")) industries.push("food_service");

  // Detect premium pay / schedule change compensation
  let premiumPay: Record<string, unknown> | null = null;
  const premiumDollarMatch = text.match(/\$(\d+(?:\.\d{2})?)\s*(?:premium|penalty|per\s*(?:shift|change))/i);
  if (premiumDollarMatch) {
    premiumPay = { type: "fixed", amount: `$${premiumDollarMatch[1]}` };
  }
  // Detect tiered schedule change penalties (Seattle style: "one hour of pay for added hours, half for cancelled")
  if (!premiumPay) {
    const hasAddedPenalty = /(?:one|1)\s*hour\s*(?:of\s*)?pay\s*(?:for|when)\s*(?:hours?\s*)?(?:added|shift.*changed)/i.test(text);
    const hasCancelledPenalty = /half\s*(?:of\s*)?(?:the\s*)?hours?\s*(?:not\s*worked|scheduled|cancelled)/i.test(text);
    if (hasAddedPenalty || hasCancelledPenalty) {
      premiumPay = {
        type: "tiered",
        tiers: [
          ...(hasAddedPenalty ? [{ trigger: "hours_added_or_changed", penalty: "1 hour of pay" }] : []),
          ...(hasCancelledPenalty ? [{ trigger: "hours_subtracted_or_cancelled", penalty: "half of scheduled hours pay" }] : []),
        ],
      };
    }
  }
  if (/premium\s*pay\s*(?:for|when)/i.test(text) && !premiumPay) {
    premiumPay = { type: "required", detail: "Premium pay for schedule changes" };
  }
  // Detect "compensation for each employer-requested schedule change"
  if (!premiumPay && /compensation\s*(?:for\s*)?(?:each\s*)?(?:employer[- ]requested\s*)?schedule\s*change/i.test(text)) {
    premiumPay = { type: "required", detail: "Compensation for employer-requested schedule changes" };
  }

  // Detect clopening / close-open shift restrictions
  let clopeningRestriction: Record<string, unknown> | null = null;
  // Pattern: "$100 premium to work clopening shifts"
  const clopeningDollarMatch = text.match(/\$(\d+(?:\.\d{2})?)\s*(?:premium|pay)?\s*(?:to|for)?\s*(?:work\s*)?["\u201c]?clopen/i)
    || text.match(/clopen["\u201d]?\s*(?:ing)?\s*(?:shift|schedule)?[^.]*?\$(\d+(?:\.\d{2})?)/i);
  if (clopeningDollarMatch) {
    clopeningRestriction = {
      premium: `$${clopeningDollarMatch[1]}`,
      rightToRefuse: true,
    };
  }
  // Pattern: "closing and opening shifts separated by less than 10 hours" (Seattle style)
  if (!clopeningRestriction) {
    const restBetweenMatch = text.match(/(?:closing\s*and\s*opening|back[- ]?to[- ]?back|consecutive)\s*shifts?\s*(?:that\s*are\s*)?(?:separated|less\s*than|fewer\s*than|within)\s*(?:by\s*)?(?:less\s*than\s*)?(\d+)\s*hours?/i)
      || text.match(/less\s*than\s*(\d+)\s*hours?\s*(?:between|separating)\s*(?:shifts|closing\s*and\s*opening)/i);
    if (restBetweenMatch) {
      const restHours = parseInt(restBetweenMatch[1]);
      const hasPremium = /time[- ]?and[- ]?(?:a[- ])?half|1\.5\s*(?:x|times)/i.test(text);
      clopeningRestriction = {
        minimumRestHours: restHours,
        penalty: hasPremium ? "time_and_a_half" : "premium_pay",
        rightToRefuse: /right\s*to\s*(?:say\s*no|refuse|decline)/i.test(text),
      };
    }
  }
  // Generic "clopening" mention
  if (!clopeningRestriction && /clopen/i.test(text)) {
    clopeningRestriction = { restricted: true, rightToRefuse: /right\s*to\s*(?:say\s*no|refuse|decline)/i.test(text) };
  }

  // Detect on-call ban
  const onCallBan = /no\s*on[- ]?call\s*(?:shift|scheduling)/i.test(text);

  // Detect just cause requirement
  const justCause = /just\s*cause/i.test(text) || /without\s*just\s*cause/i.test(text);

  // Detect access to hours (offering existing workers hours first)
  const accessToHours = /existing\s*workers?\s*(?:the\s*)?chance\s*to\s*work\s*more\s*hours/i.test(text)
    || /priority\s*(?:to\s*)?(?:laid[- ]?off|current)\s*workers/i.test(text)
    || /offer\s*(?:existing|current)\s*(?:employees|workers)\s*(?:additional|more|available)\s*(?:hours|shifts)/i.test(text);

  // Detect employer size threshold
  let employerSizeThreshold: number | null = null;
  let employerSizeScope: string | null = null;
  const sizeMatch = text.match(/(\d+)\s*(?:\+|or\s*more)?\s*(?:employees|workers)\s*(?:worldwide|globally|nationally)?/i);
  if (sizeMatch && parseInt(sizeMatch[1]) >= 10) {
    employerSizeThreshold = parseInt(sizeMatch[1]);
    if (/worldwide|globally|nationally/i.test(sizeMatch[0])) {
      employerSizeScope = "worldwide";
    }
  }

  // Build schedule change penalty tiers if multiple notice periods exist
  const scheduleChangePenalties: Array<Record<string, unknown>> = [];
  if (advanceNoticeDays && advanceNoticeHours && advanceNoticeDays !== Math.round(advanceNoticeHours / 24)) {
    // Two different notice periods — likely different industries
    scheduleChangePenalties.push({
      industry: industries.includes("fast_food") ? "fast_food" : industries[0] || "covered",
      advanceNotice: { days: advanceNoticeDays },
      premiumPay: premiumPay,
    });
    scheduleChangePenalties.push({
      industry: industries.includes("retail") ? "retail" : industries[1] || "covered",
      advanceNotice: { hours: advanceNoticeHours },
    });
  }

  // Build the rule
  const rule: Record<string, unknown> = {
    ruleType: "predictive_scheduling",
    jurisdiction: "unknown", // will be filled by caller context
    coveredIndustries: industries.length > 0 ? industries : ["covered_employers"],
    advanceNotice: scheduleChangePenalties.length > 0 ? undefined : {
      ...(advanceNoticeDays ? { days: advanceNoticeDays } : {}),
      ...(advanceNoticeHours ? { hours: advanceNoticeHours } : {}),
    },
    scheduleChangePenalties: scheduleChangePenalties.length > 0 ? scheduleChangePenalties : undefined,
    premiumPay: scheduleChangePenalties.length === 0 ? premiumPay : undefined,
    restrictions: {
      ...(onCallBan ? { onCallBan: true } : {}),
      ...(clopeningRestriction ? { clopening: clopeningRestriction } : {}),
      ...(justCause ? { justCauseRequired: true } : {}),
      ...(accessToHours ? { accessToHoursRequired: true } : {}),
    },
    ...(employerSizeThreshold ? { employerSizeThreshold, ...(employerSizeScope ? { employerSizeScope } : {}) } : {}),
    appliesTo: {
      "business.industry_tags": industries.length > 0 ? industries : ["covered_employers"],
      ...(employerSizeThreshold ? { "employer.total_employees_global": `>= ${employerSizeThreshold}` } : {}),
    },
  };

  // Clean up undefined values
  if (!rule.advanceNotice) delete rule.advanceNotice;
  if (!rule.scheduleChangePenalties) delete rule.scheduleChangePenalties;
  if (!rule.premiumPay) delete rule.premiumPay;

  return rule;
}

// ─── Paid Sick Leave extraction ────────────────────────────────────

function extractPaidSickLeaveRule(text: string, textLower: string): Record<string, unknown> | null {
  // Detect accrual rate
  let accrualRate: string | null = null;
  const accrualMatch = text.match(/(?:accrue|earn|accumulate)\s*(?:up\s*to\s*)?\d*\s*(?:hour|day)s?\s*(?:of\s*)?(?:paid\s*)?(?:sick|safe)\s*(?:leave|time)\s*(?:for\s*every|per)\s*(\d+)\s*hours?\s*(?:worked)?/i)
    || text.match(/1\s*hour\s*(?:of\s*)?(?:paid\s*)?(?:sick|safe)\s*(?:leave|time)\s*(?:for\s*every|per)\s*(\d+)\s*hours?\s*(?:worked)?/i);
  if (accrualMatch) {
    accrualRate = `1 hour per ${accrualMatch[1]} hours worked`;
  }

  // Detect annual cap
  let annualCap: string | null = null;
  const capMatch = text.match(/(?:up\s*to|maximum\s*(?:of)?|cap\s*(?:of|at)?)\s*(\d+)\s*(?:hours|days)\s*(?:of\s*)?(?:paid\s*)?(?:sick|safe)\s*(?:leave|time)\s*(?:per\s*year|annually|each\s*year)?/i);
  if (capMatch) {
    annualCap = `${capMatch[1]} ${text.match(/hours/i) ? "hours" : "days"} per year`;
  }

  // Detect employer size thresholds
  const smallEmployerMatch = text.match(/(?:fewer\s*than|under|less\s*than)\s*(\d+)\s*(?:employees|workers)/i);
  const largeEmployerMatch = text.match(/(\d+)\s*(?:or\s*more|\+)\s*(?:employees|workers)/i);

  if (!accrualRate && !annualCap) return null;

  return {
    ruleType: "paid_sick_leave",
    jurisdiction: "unknown",
    accrualRate,
    annualCap,
    ...(smallEmployerMatch ? { smallEmployerThreshold: parseInt(smallEmployerMatch[1]) } : {}),
    ...(largeEmployerMatch ? { largeEmployerThreshold: parseInt(largeEmployerMatch[1]) } : {}),
    appliesTo: {
      "employee.employment_status": "active",
    },
  };
}

// ─── Meal/Break extraction ─────────────────────────────────────────

function extractMealBreakRule(text: string, textLower: string): Record<string, unknown> | null {
  // Detect meal break duration
  const mealMatch = text.match(/(\d+)\s*[-–]?\s*minute\s*(?:meal|lunch|dinner)\s*(?:break|period)/i)
    || text.match(/(?:meal|lunch|dinner)\s*(?:break|period)\s*(?:of\s*)?(?:at\s*least\s*)?(\d+)\s*minutes/i);

  // Detect rest break
  const restMatch = text.match(/(\d+)\s*[-–]?\s*minute\s*(?:rest|paid)\s*(?:break|period)/i)
    || text.match(/(?:rest|paid)\s*(?:break|period)\s*(?:of\s*)?(?:at\s*least\s*)?(\d+)\s*minutes/i);

  // Detect trigger (hours worked before break required)
  const triggerMatch = text.match(/(?:work|shift)\s*(?:of\s*)?(?:more\s*than|over|exceeding|at\s*least)?\s*(\d+(?:\.\d+)?)\s*hours/i)
    || text.match(/(\d+(?:\.\d+)?)\s*(?:consecutive\s*)?hours?\s*(?:of\s*work|worked|shift)/i);

  if (!mealMatch && !restMatch) return null;

  return {
    ruleType: "meal_break",
    jurisdiction: "unknown",
    ...(mealMatch ? { mealBreak: { durationMinutes: parseInt(mealMatch[1]), paid: /paid\s*meal/i.test(text) } } : {}),
    ...(restMatch ? { restBreak: { durationMinutes: parseInt(restMatch[1]), paid: true } } : {}),
    ...(triggerMatch ? { triggerHours: parseFloat(triggerMatch[1]) } : {}),
    appliesTo: {
      "employee.exemption_status": "non_exempt",
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────

function stripHtml(html: string): string {
  // Remove script/style blocks
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common entities
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "\u2019").replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D").replace(/&ldquo;/g, "\u201C")
    .replace(/&mdash;/g, "\u2014").replace(/&ndash;/g, "\u2013")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&\w+;/g, " "); // Remove any remaining unrecognized entities
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
}
