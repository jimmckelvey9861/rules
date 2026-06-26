/**
 * Rule Corrector
 *
 * Takes a current structured rule, the source page text, and a plain-English
 * correction description, then produces a proposed corrected structured rule JSON.
 *
 * This uses intelligent text analysis to apply corrections. For more complex
 * corrections, an LLM integration point is clearly marked.
 */

const TIMEOUT_MS = 8000;
const USER_AGENT = "ThirdRulesEngine/1.0 (rule-corrector)";

interface CorrectionResult {
  proposedRule: Record<string, unknown>;
  explanation: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Fetch page text from a URL.
 */
async function fetchPageText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,*/*" },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("html")) return null;

    const html = await res.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#?\w+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return null;
  }
}

/**
 * Extract dollar amounts with surrounding context from page text.
 */
function extractRatesWithContext(text: string): Array<{ amount: string; context: string }> {
  const rates: Array<{ amount: string; context: string }> = [];
  const pattern = /\$(\d+(?:\.\d{2})?)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const amount = `$${match[1]}`;
    const start = Math.max(0, match.index - 100);
    const end = Math.min(text.length, match.index + match[0].length + 100);
    const context = text.slice(start, end);
    rates.push({ amount, context });
  }
  return rates;
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * LLM INTEGRATION POINT:
 * For production use, replace the heuristic logic in applyCorrectionToRule
 * with an LLM call:
 *
 *   const prompt = buildCorrectionPrompt(currentRule, pageText, correction);
 *   const response = await llm.complete(prompt);
 *   const proposedRule = JSON.parse(response);
 *
 * The LLM should receive:
 *   - The current structured rule JSON
 *   - Relevant page text (trimmed to ~4000 chars)
 *   - The user's correction description
 *   - Instructions to output ONLY valid JSON matching the rule schema
 * ═══════════════════════════════════════════════════════════════════
 */
export async function applyCorrectionToRule(
  currentRule: Record<string, unknown>,
  sourceUrl: string | null,
  correction: string,
  jurisdictionName?: string | null,
): Promise<CorrectionResult> {
  // Fetch page text if URL available
  let pageText: string | null = null;
  if (sourceUrl) {
    pageText = await fetchPageText(sourceUrl);
  }

  // Clone the current rule as baseline
  const proposed = JSON.parse(JSON.stringify(currentRule)) as Record<string, unknown>;
  const corrLower = correction.toLowerCase();
  const ruleType = proposed.ruleType as string | undefined;

  // ─── Strategy 1: Rate replacement ("from $X to $Y", "increase to $Y") ──
  const rateReplacement = tryRateReplacement(proposed, correction);
  if (rateReplacement) return rateReplacement;

  // ─── Strategy 2: Direct rate statement ("rate is $X", "minimum wage is $X") ──
  const directRate = tryDirectRateStatement(proposed, correction);
  if (directRate) return directRate;

  // ─── Strategy 3: Year correction ──
  const yearCorrection = tryYearCorrection(proposed, correction);
  if (yearCorrection) return yearCorrection;

  // ─── Strategy 4: Missing condition/exception ──
  if (ruleType === "minimum_wage" && pageText) {
    const missingCondition = tryMissingCondition(proposed, pageText, correction);
    if (missingCondition) return missingCondition;
  }

  // ─── Strategy 5: Remove condition/rate ──
  const removal = tryRemoval(proposed, correction);
  if (removal) return removal;

  // ─── Strategy 6: Jurisdiction correction ──
  const jurisdictionFix = tryJurisdictionCorrection(proposed, correction);
  if (jurisdictionFix) return jurisdictionFix;

  // ─── Strategy 7: Generic dollar amount extraction from correction text ──
  // If the user mentions a dollar amount that's NOT in the current rule,
  // they probably want it added or used as a replacement.
  const genericDollar = tryGenericDollarCorrection(proposed, correction, pageText);
  if (genericDollar) return genericDollar;

  // ─── Fallback ──
  return {
    proposedRule: proposed,
    explanation: `Could not automatically apply this correction. Try being more specific, e.g.: "The rate should be $18.70" or "Add the tipped employee rate of $15.00". You can also edit the JSON directly.`,
    confidence: "low",
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Strategy implementations
// ═══════════════════════════════════════════════════════════════════════

/**
 * Strategy 1: Detect "from $X to $Y" or "increase/change to $Y" patterns.
 * Handles:
 *   - "increase from $18.20 to $18.70"
 *   - "will increase to $18.70"
 *   - "changed from $X to $Y"
 *   - "was $X, now $Y"
 *   - "from $X (old) to $Y (new)"
 */
function tryRateReplacement(proposed: Record<string, unknown>, correction: string): CorrectionResult | null {
  // Pattern: "from $X to $Y" — explicit old→new
  const fromToMatch = correction.match(/from\s+\$(\d+(?:\.\d{2})?)\s*(?:\([^)]*\))?\s*to\s+\$(\d+(?:\.\d{2})?)/i);
  if (fromToMatch) {
    const oldAmount = `$${fromToMatch[1]}`;
    const newAmount = `$${fromToMatch[2]}`;
    return applyRateChange(proposed, oldAmount, newAmount,
      `Updated rate from ${oldAmount} to ${newAmount}.`);
  }

  // Pattern: "increase/rise/change to $Y" (without explicit old value)
  const changeToMatch = correction.match(/(?:increase|rise|change|go up|adjust|update|set)\s*(?:s|d|ed)?\s*(?:from\s+\$\d+(?:\.\d{2})?\s*)?to\s+\$(\d+(?:\.\d{2})?)/i);
  if (changeToMatch) {
    const newAmount = `$${changeToMatch[1]}`;
    return applyRateChange(proposed, null, newAmount,
      `Updated rate to ${newAmount}.`);
  }

  // Pattern: "was $X, now $Y" or "$X → $Y"
  const wasNowMatch = correction.match(/(?:was|previously|old[: ]+)\s*\$(\d+(?:\.\d{2})?)[\s,;]*(?:now|new|current|→|->|becomes?)\s*\$(\d+(?:\.\d{2})?)/i);
  if (wasNowMatch) {
    const oldAmount = `$${wasNowMatch[1]}`;
    const newAmount = `$${wasNowMatch[2]}`;
    return applyRateChange(proposed, oldAmount, newAmount,
      `Updated rate from ${oldAmount} (old) to ${newAmount} (current).`);
  }

  // Pattern: "$X to $Y per hour" (contextual)
  const amountToAmount = correction.match(/\$(\d+(?:\.\d{2})?)\s*(?:\([^)]*\))?\s*to\s+\$(\d+(?:\.\d{2})?)\s*(?:per\s*hour|\/\s*h(?:ou)?r)?/i);
  if (amountToAmount) {
    const oldAmount = `$${amountToAmount[1]}`;
    const newAmount = `$${amountToAmount[2]}`;
    // Verify the old amount exists in the current rule
    const rates = proposed.rates as Array<{ amount?: string }> | undefined;
    if (rates && rates.some(r => r.amount === oldAmount)) {
      return applyRateChange(proposed, oldAmount, newAmount,
        `Replaced ${oldAmount} with ${newAmount}.`);
    }
  }

  return null;
}

/**
 * Strategy 2: Direct rate statements.
 * Handles:
 *   - "the rate is $18.70"
 *   - "minimum wage is $18.70 per hour"
 *   - "correct rate: $18.70"
 *   - "should be $18.70"
 *   - "$18.70 per hour" (if it's the only dollar amount and differs from current)
 */
function tryDirectRateStatement(proposed: Record<string, unknown>, correction: string): CorrectionResult | null {
  // Pattern: "rate/wage is/should be $X"
  const rateIsMatch = correction.match(
    /(?:(?:the\s+)?(?:correct|actual|current|new|real|right)\s+)?(?:rate|wage|minimum\s*wage|amount)\s+(?:is|should\s+be|=)\s*\$(\d+(?:\.\d{2})?)/i
  );
  if (rateIsMatch) {
    const newAmount = `$${rateIsMatch[1]}`;
    return applyRateChange(proposed, null, newAmount,
      `Set rate to ${newAmount}.`);
  }

  // Pattern: "should be $X" (without explicit "rate")
  const shouldBeMatch = correction.match(/should\s+be\s+\$(\d+(?:\.\d{2})?)/i);
  if (shouldBeMatch) {
    const newAmount = `$${shouldBeMatch[1]}`;
    return applyRateChange(proposed, null, newAmount,
      `Updated rate to ${newAmount}.`);
  }

  // Pattern: "correct rate: $X" or "actual: $X"
  const colonMatch = correction.match(/(?:correct|actual|current|new|right)\s*(?:rate|wage|amount)?[:\s]+\$(\d+(?:\.\d{2})?)/i);
  if (colonMatch) {
    const newAmount = `$${colonMatch[1]}`;
    return applyRateChange(proposed, null, newAmount,
      `Set rate to ${newAmount}.`);
  }

  // Pattern: "it's $X" or "it is $X"
  const itsMatch = correction.match(/(?:it'?s|it\s+is)\s+\$(\d+(?:\.\d{2})?)/i);
  if (itsMatch) {
    const newAmount = `$${itsMatch[1]}`;
    return applyRateChange(proposed, null, newAmount,
      `Set rate to ${newAmount}.`);
  }

  return null;
}

/**
 * Strategy 3: Year correction.
 */
function tryYearCorrection(proposed: Record<string, unknown>, correction: string): CorrectionResult | null {
  const yearMatch = correction.match(/(?:effective\s+year|year)\s+(?:should\s+be|is)\s+(\d{4})/i);
  if (yearMatch) {
    proposed.effectiveYear = yearMatch[1];
    return {
      proposedRule: proposed,
      explanation: `Updated effective year to ${yearMatch[1]}.`,
      confidence: "high",
    };
  }

  // Pattern: "effective January 1, 2026" or "as of 2026"
  const effectiveMatch = correction.match(/(?:effective|as\s+of|starting|beginning)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)?\s*\d{0,2},?\s*(\d{4})/i);
  if (effectiveMatch) {
    const year = effectiveMatch[1];
    if (proposed.effectiveYear !== year) {
      proposed.effectiveYear = year;
      return {
        proposedRule: proposed,
        explanation: `Updated effective year to ${year}.`,
        confidence: "high",
      };
    }
  }

  return null;
}

/**
 * Strategy 4: Missing condition/exception.
 */
function tryMissingCondition(
  proposed: Record<string, unknown>,
  pageText: string,
  correction: string,
): CorrectionResult | null {
  const corrLower = correction.toLowerCase();

  // Detect "missing" or "add" patterns
  const missingMatch = corrLower.match(
    /(?:missing|add|include|doesn'?t\s+(?:include|have|show)|should\s+(?:include|have|show))\s+(?:the\s+)?(.+?)(?:\s+(?:exception|condition|rate|tier|category|wage|minimum))?\s*\.?$/i
  );
  if (!missingMatch) return null;

  const missingThing = missingMatch[1].trim();
  const keywords = missingThing.split(/\s+/).filter(w => w.length > 3);
  if (keywords.length === 0) return null;

  // Search page for dollar amounts near the missing thing
  const ratesOnPage = extractRatesWithContext(pageText);
  const relevantRates = ratesOnPage.filter(r => {
    const ctx = r.context.toLowerCase();
    return keywords.some(kw => ctx.includes(kw.toLowerCase()));
  });

  if (relevantRates.length === 0) return null;

  // Deduplicate by amount
  const seen = new Set<string>();
  const unique = relevantRates.filter(r => {
    if (seen.has(r.amount)) return false;
    seen.add(r.amount);
    return true;
  });

  // Check which rates are NOT already in the rule
  const existingRates = (proposed.rates as Array<{ amount?: string }>) || [];
  const existingAmounts = new Set(existingRates.map(r => r.amount));
  const newRates = unique.filter(r => !existingAmounts.has(r.amount));

  if (newRates.length === 0) {
    // Rate already exists — maybe just needs a condition label
    const matchingExisting = existingRates.find(r => {
      const ctx = relevantRates.find(rr => rr.amount === r.amount)?.context || "";
      return keywords.some(kw => ctx.toLowerCase().includes(kw.toLowerCase()));
    }) as Record<string, unknown> | undefined;
    if (matchingExisting && !matchingExisting.condition) {
      matchingExisting.condition = missingThing.replace(/\s+/g, "_").toLowerCase();
      matchingExisting.conditionDetail = missingThing
        .split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return {
        proposedRule: proposed,
        explanation: `Added condition "${missingThing}" to existing rate ${matchingExisting.amount}.`,
        confidence: "medium",
      };
    }
    return null;
  }

  // Add the best new rate
  const bestNew = newRates[0];
  const conditionKey = missingThing.replace(/\s+/g, "_").toLowerCase();
  const conditionLabel = missingThing
    .split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const rates = [...existingRates, {
    amount: bestNew.amount,
    condition: conditionKey,
    conditionDetail: conditionLabel,
  }];
  proposed.rates = rates;
  proposed.multiRate = rates.length > 1;

  return {
    proposedRule: proposed,
    explanation: `Found ${bestNew.amount} on the source page near "${missingThing}". Added as a new rate with condition "${conditionLabel}".`,
    confidence: "medium",
  };
}

/**
 * Strategy 5: Remove a condition/rate.
 */
function tryRemoval(proposed: Record<string, unknown>, correction: string): CorrectionResult | null {
  const removeMatch = correction.toLowerCase().match(
    /(?:remove|delete|drop)\s+(?:the\s+)?(.+?)(?:\s+(?:rate|tier|condition))?\s*\.?$/i
  );
  if (!removeMatch || !Array.isArray(proposed.rates)) return null;

  const toRemove = removeMatch[1].trim().toLowerCase();
  const rates = proposed.rates as Array<{ condition?: string | null; conditionDetail?: string | null; amount?: string }>;
  const filtered = rates.filter(r => {
    const cond = (r.condition || "").toLowerCase();
    const detail = (r.conditionDetail || "").toLowerCase();
    const amount = (r.amount || "").toLowerCase();
    return !cond.includes(toRemove) && !detail.includes(toRemove) && !amount.includes(toRemove);
  });

  if (filtered.length < rates.length) {
    proposed.rates = filtered;
    proposed.multiRate = filtered.length > 1;
    if (filtered.length === 1) {
      proposed.defaultRate = (filtered[0] as any).amount;
    }
    return {
      proposedRule: proposed,
      explanation: `Removed rate matching "${toRemove}".`,
      confidence: "high",
    };
  }
  return null;
}

/**
 * Strategy 6: Jurisdiction correction.
 */
function tryJurisdictionCorrection(proposed: Record<string, unknown>, correction: string): CorrectionResult | null {
  const match = correction.match(/jurisdiction\s+(?:should\s+be|is)\s+["']?([^"'.]+)/i);
  if (match) {
    proposed.jurisdiction = match[1].trim();
    return {
      proposedRule: proposed,
      explanation: `Updated jurisdiction to "${match[1].trim()}".`,
      confidence: "high",
    };
  }
  return null;
}

/**
 * Strategy 7: Generic dollar amount extraction.
 * If the correction mentions a dollar amount that's NOT in the current rule,
 * the user likely wants to update to that amount.
 * If it mentions an amount that IS in the current rule plus a NEW amount,
 * it's likely a replacement.
 */
function tryGenericDollarCorrection(
  proposed: Record<string, unknown>,
  correction: string,
  pageText: string | null,
): CorrectionResult | null {
  // Extract all dollar amounts from the correction
  const amounts: string[] = [];
  const dollarPattern = /\$(\d+(?:\.\d{2})?)/g;
  let m: RegExpExecArray | null;
  while ((m = dollarPattern.exec(correction)) !== null) {
    amounts.push(`$${m[1]}`);
  }

  if (amounts.length === 0) return null;

  const rates = proposed.rates as Array<{ amount?: string; condition?: string | null }> | undefined;
  if (!rates || rates.length === 0) return null;

  const currentAmounts = new Set(rates.map(r => r.amount));

  // Case: Two amounts mentioned — one matches current, one is new → replacement
  if (amounts.length >= 2) {
    const oldAmount = amounts.find(a => currentAmounts.has(a));
    const newAmount = amounts.find(a => !currentAmounts.has(a));
    if (oldAmount && newAmount) {
      return applyRateChange(proposed, oldAmount, newAmount,
        `Replaced ${oldAmount} with ${newAmount} based on the correction.`);
    }
  }

  // Case: One amount that differs from all current rates → likely the correct rate
  if (amounts.length >= 1) {
    const newAmounts = amounts.filter(a => !currentAmounts.has(a));
    if (newAmounts.length === 1 && rates.length === 1) {
      // Single-rate rule, single new amount → replace
      const newAmount = newAmounts[0];
      const oldAmount = rates[0].amount!;
      return applyRateChange(proposed, oldAmount, newAmount,
        `Updated rate from ${oldAmount} to ${newAmount}.`);
    }

    if (newAmounts.length === 1 && rates.length > 1) {
      // Multi-rate rule — try to figure out which rate to replace
      // Check if one current amount is mentioned alongside the new one
      const mentionedOld = amounts.find(a => currentAmounts.has(a));
      if (mentionedOld) {
        return applyRateChange(proposed, mentionedOld, newAmounts[0],
          `Replaced ${mentionedOld} with ${newAmounts[0]}.`);
      }
      // Otherwise, check correction text for condition hints
      const corrLower = correction.toLowerCase();
      for (const rate of rates) {
        if (rate.condition) {
          const condWords = rate.condition.replace(/_/g, " ");
          if (corrLower.includes(condWords)) {
            const old = rate.amount;
            rate.amount = newAmounts[0];
            return {
              proposedRule: proposed,
              explanation: `Updated ${rate.condition} rate from ${old} to ${newAmounts[0]}.`,
              confidence: "medium",
            };
          }
        }
      }
      // Default: replace the default/general rate
      const general = rates.find(r => !r.condition) || rates[0];
      const old = general.amount;
      general.amount = newAmounts[0];
      if (proposed.defaultRate === old) proposed.defaultRate = newAmounts[0];
      return {
        proposedRule: proposed,
        explanation: `Updated default rate from ${old} to ${newAmounts[0]}.`,
        confidence: "medium",
      };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Apply a rate change to the proposed rule.
 * If oldAmount is provided, replaces that specific rate.
 * If oldAmount is null, replaces the default/general rate.
 */
function applyRateChange(
  proposed: Record<string, unknown>,
  oldAmount: string | null,
  newAmount: string,
  explanation: string,
): CorrectionResult {
  const rates = proposed.rates as Array<{ amount?: string; condition?: string | null }> | undefined;

  if (!rates || rates.length === 0) {
    // No rates yet — create one
    proposed.rates = [{ amount: newAmount, condition: null, conditionDetail: null }];
    proposed.defaultRate = newAmount;
    proposed.multiRate = false;
    return { proposedRule: proposed, explanation, confidence: "high" };
  }

  if (oldAmount) {
    // Replace specific rate
    const target = rates.find(r => r.amount === oldAmount);
    if (target) {
      target.amount = newAmount;
      if (proposed.defaultRate === oldAmount) proposed.defaultRate = newAmount;
      return { proposedRule: proposed, explanation, confidence: "high" };
    }
    // Old amount not found — replace default rate instead
    const general = rates.find(r => !r.condition) || rates[0];
    const actualOld = general.amount;
    general.amount = newAmount;
    if (proposed.defaultRate === actualOld) proposed.defaultRate = newAmount;
    return {
      proposedRule: proposed,
      explanation: `${explanation} (Note: ${oldAmount} was not found in the rule; updated the default rate instead.)`,
      confidence: "medium",
    };
  }

  // No old amount specified — replace the default/general rate
  const general = rates.find(r => !r.condition) || rates[0];
  const actualOld = general.amount;
  general.amount = newAmount;
  if (proposed.defaultRate === actualOld) proposed.defaultRate = newAmount;
  return { proposedRule: proposed, explanation, confidence: "high" };
}
