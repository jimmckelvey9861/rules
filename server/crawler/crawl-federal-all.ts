/**
 * Bounded federal crawl for ALL law categories.
 *
 * Discovers authoritative federal URLs, checks health, assesses content,
 * generates structuredRule where possible.
 *
 * Creates CrawlerCandidate records ONLY. Does NOT promote or create LawSource.
 *
 * Usage:
 *   npm run crawl:federal-all
 */

import { PrismaClient } from "@prisma/client";
import { checkUrl } from "./url-checker.js";
import { assessContent } from "./content-assessor.js";

const prisma = new PrismaClient();

const FEDERAL_JURISDICTION_ID = "cmprbbn3u00028sdlzfu2ur0y";

interface SourceEntry {
  url: string;
  title: string;
  authority: string;
  confidence: number;
}

interface CategorySource {
  categoryName: string;
  categoryId: string;
  topic: string;
  urls: SourceEntry[];
}

// ─── Federal source URLs by category ───────────────────────────────
// These are curated from official .gov sources only.
// No legal values are hard-coded — the assessor extracts from page content.

const FEDERAL_SOURCES: CategorySource[] = [
  // 1. Compensation & Pay
  {
    categoryName: "1.1 Minimum Wage",
    categoryId: "cmprbbn5f009l8sdlrhxb5esn",
    topic: "minimum_wage",
    urls: [
      { url: "https://www.dol.gov/agencies/whd/minimum-wage", title: "Federal Minimum Wage — WHD", authority: "U.S. Department of Labor, Wage and Hour Division", confidence: 0.95 },
      { url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-531", title: "29 CFR Part 531 — Wage Payments Under FLSA", authority: "Electronic Code of Federal Regulations", confidence: 0.85 },
    ],
  },
  {
    categoryName: "1.2 Tipped Compensation",
    categoryId: "cmprbbn5i00a18sdlpfidoarg",
    topic: "tipped_compensation",
    urls: [
      { url: "https://www.dol.gov/agencies/whd/flsa/tips", title: "WHD Tips Guidance", authority: "U.S. Department of Labor, Wage and Hour Division", confidence: 0.9 },
      { url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-531/subpart-D", title: "29 CFR Part 531 Subpart D — Tipped Employees", authority: "Electronic Code of Federal Regulations", confidence: 0.85 },
    ],
  },
  {
    categoryName: "1.3 Overtime",
    categoryId: "cmprbbn5k00af8sdlzh12koub",
    topic: "overtime",
    urls: [
      { url: "https://www.dol.gov/agencies/whd/overtime", title: "Federal Overtime Pay — WHD", authority: "U.S. Department of Labor, Wage and Hour Division", confidence: 0.95 },
      { url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-541", title: "29 CFR Part 541 — Overtime Exemptions", authority: "Electronic Code of Federal Regulations", confidence: 0.85 },
    ],
  },
  {
    categoryName: "1.5 Compensable Time",
    categoryId: "cmprbbn5o00bb8sdlx5nkqqu7",
    topic: "compensable_time",
    urls: [
      { url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-B/part-785", title: "29 CFR Part 785 — Hours Worked", authority: "Electronic Code of Federal Regulations", confidence: 0.95 },
    ],
  },
  {
    categoryName: "1.7 Equal Pay & Wage Protections",
    categoryId: "cmprbbn5t00c78sdl7fgyo5j1",
    topic: "equal_pay",
    urls: [
      { url: "https://www.eeoc.gov/equal-paycompensation-discrimination", title: "EEOC Equal Pay/Compensation Discrimination", authority: "U.S. Equal Employment Opportunity Commission", confidence: 0.9 },
      { url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XIV/part-1620", title: "29 CFR Part 1620 — Equal Pay Act", authority: "Electronic Code of Federal Regulations", confidence: 0.85 },
    ],
  },

  // 3. Leave & Time Off
  {
    categoryName: "3.2 Family & Medical Leave",
    categoryId: "cmprbbn6600ep8sdlwxdg2nvl",
    topic: "family_medical_leave",
    urls: [
      { url: "https://www.dol.gov/agencies/whd/fmla", title: "Family and Medical Leave Act — WHD", authority: "U.S. Department of Labor, Wage and Hour Division", confidence: 0.95 },
      { url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-C/part-825", title: "29 CFR Part 825 — FMLA Regulations", authority: "Electronic Code of Federal Regulations", confidence: 0.9 },
    ],
  },

  // 4. Minor Employment
  {
    categoryName: "4.1 Hour Restrictions (Minors)",
    categoryId: "cmprbbn6d00g88sdll276vfqq",
    topic: "minor_labor",
    urls: [
      { url: "https://www.dol.gov/agencies/whd/child-labor", title: "Child Labor — WHD", authority: "U.S. Department of Labor, Wage and Hour Division", confidence: 0.95 },
      { url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570", title: "29 CFR Part 570 — Child Labor Regulations", authority: "Electronic Code of Federal Regulations", confidence: 0.9 },
    ],
  },
  {
    categoryName: "4.5 Restricted Occupations",
    categoryId: "cmprbbn6h00h08sdlvrhwhouz",
    topic: "minor_labor",
    urls: [
      { url: "https://www.dol.gov/agencies/whd/child-labor/hazardous", title: "Hazardous Occupations — WHD", authority: "U.S. Department of Labor, Wage and Hour Division", confidence: 0.9 },
    ],
  },

  // 5. Hiring & Onboarding
  {
    categoryName: "5.3 Worker Classification",
    categoryId: "cmprbbn6m00hv8sdlag80w41x",
    topic: "worker_classification",
    urls: [
      { url: "https://www.dol.gov/agencies/whd/flsa/misclassification", title: "Worker Misclassification — WHD", authority: "U.S. Department of Labor, Wage and Hour Division", confidence: 0.9 },
      { url: "https://www.irs.gov/businesses/small-businesses-self-employed/independent-contractor-self-employed-or-employee", title: "IRS Worker Classification", authority: "Internal Revenue Service", confidence: 0.85 },
    ],
  },
  {
    categoryName: "5.5 Employment Eligibility",
    categoryId: "cmprbbn6p00if8sdlljd2vai5",
    topic: "worker_classification", // closest available
    urls: [
      { url: "https://www.uscis.gov/i-9", title: "Form I-9 Employment Eligibility Verification", authority: "U.S. Citizenship and Immigration Services", confidence: 0.9 },
    ],
  },

  // 6. Workplace Protections
  {
    categoryName: "6.1 Anti-Discrimination",
    categoryId: "cmprbbn6r00io8sdl8r9s1fj3",
    topic: "anti_discrimination",
    urls: [
      { url: "https://www.eeoc.gov/statutes/title-vii-civil-rights-act-1964", title: "Title VII — EEOC", authority: "U.S. Equal Employment Opportunity Commission", confidence: 0.95 },
      { url: "https://www.eeoc.gov/laws/guidance/employment-discrimination-overview", title: "EEOC Employment Discrimination Overview", authority: "U.S. Equal Employment Opportunity Commission", confidence: 0.85 },
    ],
  },
  {
    categoryName: "6.4 Workplace Safety",
    categoryId: "cmprbbn6u00je8sdll0n6gg6i",
    topic: "workplace_safety",
    urls: [
      { url: "https://www.osha.gov/laws-regs/oshact/completeoshact", title: "OSH Act Full Text", authority: "Occupational Safety and Health Administration", confidence: 0.9 },
      { url: "https://www.osha.gov/workers/employer-responsibilities", title: "OSHA Employer Responsibilities", authority: "Occupational Safety and Health Administration", confidence: 0.85 },
    ],
  },
  {
    categoryName: "6.6 Whistleblower Protections",
    categoryId: "cmprbbn6x00jy8sdloa8rla8r",
    topic: "workplace_safety", // closest
    urls: [
      { url: "https://www.osha.gov/whistleblower", title: "OSHA Whistleblower Protection Programs", authority: "Occupational Safety and Health Administration", confidence: 0.85 },
    ],
  },

  // 7. Separation & Final Pay
  {
    categoryName: "7.3 Mass Layoffs & Closures (WARN)",
    categoryId: "cmprbbn7200kp8sdl3igkbi4b",
    topic: "warn_act",
    urls: [
      { url: "https://www.dol.gov/agencies/eta/layoffs/warn", title: "WARN Act — DOL ETA", authority: "U.S. Department of Labor, Employment and Training Administration", confidence: 0.95 },
      { url: "https://www.ecfr.gov/current/title-20/chapter-V/part-639", title: "20 CFR Part 639 — WARN Act Regulations", authority: "Electronic Code of Federal Regulations", confidence: 0.9 },
    ],
  },

  // 8. Employer Coverage & Compliance
  {
    categoryName: "8.2 Posting & Notice Requirements",
    categoryId: "cmprbbn7700lo8sdl9li2mbbn",
    topic: "posting_notice",
    urls: [
      { url: "https://www.dol.gov/agencies/whd/posters", title: "Workplace Posters — WHD", authority: "U.S. Department of Labor, Wage and Hour Division", confidence: 0.9 },
    ],
  },
];

interface CandidateResult {
  category: string;
  title: string;
  url: string;
  urlHealth: string;
  contentAssessment: string;
  hasStructuredRule: boolean;
  confidence: number;
  notes: string;
  rejected: boolean;
}

async function main() {
  console.log("═══ Federal All-Categories Source Inventory ═══\n");
  console.log(`Categories to crawl: ${FEDERAL_SOURCES.length}`);
  console.log(`Max candidates per category: 5`);
  console.log("");

  // Deduplicate against existing candidates
  const existing = await prisma.crawlerCandidate.findMany({
    select: { sourceUrl: true, finalUrl: true },
  });
  const existingUrls = new Set<string>();
  for (const e of existing) {
    existingUrls.add(e.sourceUrl);
    if (e.finalUrl) existingUrls.add(e.finalUrl);
  }

  const results: CandidateResult[] = [];
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalRejected = 0;

  for (const source of FEDERAL_SOURCES) {
    console.log(`\n── ${source.categoryName} (topic: ${source.topic}) ──`);
    let categoryCreated = 0;

    for (const entry of source.urls) {
      if (categoryCreated >= 5) break;

      // Dedup check
      if (existingUrls.has(entry.url)) {
        console.log(`  · [SKIP] ${entry.url.slice(0, 65)} (exists)`);
        totalSkipped++;
        continue;
      }

      // Create candidate
      const record = await prisma.crawlerCandidate.create({
        data: {
          sourceUrl: entry.url,
          title: entry.title,
          sourceAuthority: entry.authority,
          guessedJurisdictionId: FEDERAL_JURISDICTION_ID,
          guessedLawCategoryId: source.categoryId,
          confidence: entry.confidence,
          notes: `Federal all-categories inventory: ${source.categoryName}`,
          status: "new",
        },
      });

      existingUrls.add(entry.url);

      // Check URL health
      const urlResult = await checkUrl(entry.url);
      const isBroken = urlResult.urlHealthStatus === "broken_url";

      await prisma.crawlerCandidate.update({
        where: { id: record.id },
        data: {
          originalUrl: urlResult.finalUrl ? entry.url : null,
          finalUrl: urlResult.finalUrl,
          httpStatus: urlResult.httpStatus,
          urlHealthStatus: urlResult.urlHealthStatus,
          checkedAt: urlResult.checkedAt,
          lastError: urlResult.lastError,
          failureReason: urlResult.failureReason,
          checkedMethod: urlResult.checkedMethod,
          contentType: urlResult.contentType,
          contentLength: urlResult.contentLength,
          retryCount: 1,
          ...(isBroken ? { status: "rejected" } : {}),
        },
      });

      if (urlResult.finalUrl) existingUrls.add(urlResult.finalUrl);

      // Content assessment for healthy URLs
      let assessmentStatus = "unchecked";
      let hasStructuredRule = false;
      if (!isBroken && (urlResult.urlHealthStatus === "ok" || urlResult.urlHealthStatus === "redirected")) {
        const assessUrl = urlResult.finalUrl || entry.url;
        const assessment = await assessContent(assessUrl, source.topic, entry.title);

        // Check for structuredRule
        const facts = assessment.actionableFacts as Record<string, unknown> | null;
        hasStructuredRule = !!(facts && facts.structuredRule);

        // Adjust confidence
        let adjConf = entry.confidence;
        if (assessment.status === "actionable" && hasStructuredRule) adjConf = Math.min(0.98, adjConf + 0.1);
        else if (assessment.status === "actionable") adjConf = Math.min(0.95, adjConf + 0.05);
        else if (assessment.status === "not_actionable") adjConf = Math.max(0.2, adjConf - 0.15);

        await prisma.crawlerCandidate.update({
          where: { id: record.id },
          data: {
            contentAssessmentStatus: assessment.status,
            contentAssessmentSummary: assessment.summary,
            actionableFacts: (assessment.actionableFacts as any) || undefined,
            assessedAt: assessment.assessedAt,
            confidence: parseFloat(adjConf.toFixed(2)),
          },
        });

        assessmentStatus = assessment.status;
      }

      const healthIcon = urlResult.urlHealthStatus === "ok" ? "✓" :
        urlResult.urlHealthStatus === "redirected" ? "→" :
        urlResult.urlHealthStatus === "manual_review" ? "⚠" : "✗";
      const assessIcon = assessmentStatus === "actionable" ? (hasStructuredRule ? "★" : "☆") :
        assessmentStatus === "not_actionable" ? "·" :
        assessmentStatus === "unsure" ? "?" : " ";

      const rejected = isBroken;
      if (rejected) totalRejected++;

      console.log(`  ${healthIcon}${assessIcon} [${urlResult.httpStatus || "ERR"}] ${entry.title.slice(0, 55)}${rejected ? " [REJECTED]" : ""}${hasStructuredRule ? " [RULE]" : ""}`);

      results.push({
        category: source.categoryName,
        title: entry.title,
        url: entry.url,
        urlHealth: urlResult.urlHealthStatus,
        contentAssessment: assessmentStatus,
        hasStructuredRule,
        confidence: entry.confidence,
        notes: rejected ? "Broken URL" : hasStructuredRule ? "Has structured rule" : "",
        rejected,
      });

      totalCreated++;
      categoryCreated++;
    }

    if (categoryCreated === 0) {
      console.log("  (all URLs already existed — skipped)");
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────

  console.log(`\n\n═══ SUMMARY ═══`);
  console.log(`  Created: ${totalCreated}`);
  console.log(`  Skipped (duplicates): ${totalSkipped}`);
  console.log(`  Rejected (broken): ${totalRejected}`);
  console.log(`  With structured rule: ${results.filter(r => r.hasStructuredRule).length}`);
  console.log(`  Total candidates in DB: ${await prisma.crawlerCandidate.count()}`);
  console.log(`  LawSource count (unchanged): ${await prisma.lawSource.count()}`);

  // Self-check
  console.log(`\n═══ SELF-CHECK ═══`);
  for (const source of FEDERAL_SOURCES) {
    const catResults = results.filter(r => r.category === source.categoryName && !r.rejected);
    const withRule = catResults.filter(r => r.hasStructuredRule);
    const actionable = catResults.filter(r => r.contentAssessment === "actionable");
    const healthy = catResults.filter(r => r.urlHealth === "ok" || r.urlHealth === "redirected");

    let status: string;
    if (withRule.length > 0) status = `✓ RULE (${withRule.length} with structuredRule)`;
    else if (actionable.length > 0) status = `☆ ACTIONABLE but no structuredRule`;
    else if (healthy.length > 0) status = `? HEALTHY but not actionable`;
    else if (catResults.length === 0 && results.filter(r => r.category === source.categoryName).length > 0) status = `✗ ALL BROKEN`;
    else status = `· SKIPPED (already existed)`;

    console.log(`  ${source.categoryName}: ${status}`);
  }

  // Best candidate per category
  console.log(`\n═══ BEST CANDIDATE PER CATEGORY ═══`);
  for (const source of FEDERAL_SOURCES) {
    const catResults = results.filter(r => r.category === source.categoryName && !r.rejected);
    const best = catResults.sort((a, b) => {
      if (a.hasStructuredRule !== b.hasStructuredRule) return a.hasStructuredRule ? -1 : 1;
      const assessOrder: Record<string, number> = { actionable: 3, unsure: 2, not_actionable: 1, unchecked: 0 };
      const aScore = (assessOrder[a.contentAssessment] || 0) * 10 + a.confidence * 10;
      const bScore = (assessOrder[b.contentAssessment] || 0) * 10 + b.confidence * 10;
      return bScore - aScore;
    })[0];

    if (best) {
      console.log(`  ${source.categoryName}:`);
      console.log(`    ${best.title}`);
      console.log(`    rule=${best.hasStructuredRule} content=${best.contentAssessment} health=${best.urlHealth}`);
    } else {
      console.log(`  ${source.categoryName}: (all skipped/existed)`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
