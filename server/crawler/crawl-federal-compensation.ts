/**
 * Bounded federal compensation source inventory.
 *
 * Discovers authoritative federal URLs for Compensation & Pay categories only.
 * Creates CrawlerCandidate records. Does NOT promote or create LawSource records.
 *
 * Usage:
 *   npm run crawl:federal-compensation
 */

import { PrismaClient } from "@prisma/client";
import { checkUrl } from "./url-checker.js";
import { assessContent } from "./content-assessor.js";

const prisma = new PrismaClient();

const FEDERAL_JURISDICTION_ID = "cmprbbn3u00028sdlzfu2ur0y";

// Known authoritative federal URLs for each compensation category
// These are curated from DOL/WHD/EEOC official pages
const FEDERAL_SOURCES: {
  category: string;
  categoryId: string;
  topic: string;
  urls: { url: string; title: string; authority: string; confidence: number }[];
}[] = [
  {
    category: "1.1 Minimum Wage",
    categoryId: "cmprbbn5f009l8sdlrhxb5esn",
    topic: "minimum_wage",
    urls: [
      {
        url: "https://www.dol.gov/agencies/whd/minimum-wage",
        title: "Federal Minimum Wage — WHD",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.95,
      },
      {
        url: "https://www.dol.gov/agencies/whd/fact-sheets/2-flsa-restaurants",
        title: "FLSA Fact Sheet #2 — Restaurants/Hotels",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.7,
      },
      {
        url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-531",
        title: "29 CFR Part 531 — Wage Payments Under FLSA",
        authority: "Electronic Code of Federal Regulations",
        confidence: 0.85,
      },
    ],
  },
  {
    category: "1.2 Tipped Compensation",
    categoryId: "cmprbbn5i00a18sdlpfidoarg",
    topic: "minimum_wage", // assessor uses minimum_wage heuristics for dollar amounts
    urls: [
      {
        url: "https://www.dol.gov/agencies/whd/fact-sheets/15-flsa-tipped-employees",
        title: "FLSA Fact Sheet #15 — Tipped Employees",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.95,
      },
      {
        url: "https://www.dol.gov/agencies/whd/fact-sheets/15a-flsa-tip-credit",
        title: "FLSA Fact Sheet #15A — Tip Credit",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.9,
      },
      {
        url: "https://www.dol.gov/agencies/whd/flsa/tips",
        title: "WHD Tips Guidance",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.9,
      },
      {
        url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-531/subpart-D",
        title: "29 CFR Part 531 Subpart D — Tipped Employees",
        authority: "Electronic Code of Federal Regulations",
        confidence: 0.85,
      },
    ],
  },
  {
    category: "1.3 Overtime",
    categoryId: "cmprbbn5k00af8sdlzh12koub",
    topic: "overtime",
    urls: [
      {
        url: "https://www.dol.gov/agencies/whd/overtime",
        title: "Federal Overtime Pay — WHD",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.95,
      },
      {
        url: "https://www.dol.gov/agencies/whd/fact-sheets/23-flsa-overtime-pay",
        title: "FLSA Fact Sheet #23 — Overtime Pay",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.9,
      },
      {
        url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-541",
        title: "29 CFR Part 541 — Overtime Exemptions",
        authority: "Electronic Code of Federal Regulations",
        confidence: 0.85,
      },
      {
        url: "https://www.dol.gov/agencies/whd/overtime/salary-level",
        title: "WHD Overtime Salary Threshold",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.85,
      },
    ],
  },
  {
    category: "1.4 Premium Pay",
    categoryId: "cmprbbn5m00av8sdl30ymv7xq",
    topic: "overtime", // closest assessor topic
    urls: [
      {
        url: "https://www.dol.gov/agencies/whd/fact-sheets/22-flsa-hours-worked",
        title: "FLSA Fact Sheet #22 — Hours Worked (includes premium pay context)",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.6,
      },
      {
        url: "https://www.opm.gov/policy-data-oversight/pay-leave/pay-administration/fact-sheets/premium-pay/",
        title: "OPM Premium Pay Fact Sheet (federal employees)",
        authority: "U.S. Office of Personnel Management",
        confidence: 0.5,
      },
    ],
  },
  {
    category: "1.5 Compensable Time",
    categoryId: "cmprbbn5o00bb8sdlx5nkqqu7",
    topic: "overtime", // hours worked topic
    urls: [
      {
        url: "https://www.dol.gov/agencies/whd/fact-sheets/22-flsa-hours-worked",
        title: "FLSA Fact Sheet #22 — Hours Worked Under FLSA",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.95,
      },
      {
        url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-B/part-785",
        title: "29 CFR Part 785 — Hours Worked",
        authority: "Electronic Code of Federal Regulations",
        confidence: 0.9,
      },
      {
        url: "https://www.dol.gov/agencies/whd/fact-sheets/53-flsa-travel-time",
        title: "FLSA Fact Sheet #53 — Travel Time",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.8,
      },
    ],
  },
  {
    category: "1.6 Reimbursements & Allowances",
    categoryId: "cmprbbn5r00bt8sdld4nrww7m",
    topic: "minimum_wage", // wage deduction context
    urls: [
      {
        url: "https://www.dol.gov/agencies/whd/fact-sheets/16-flsa-deductions",
        title: "FLSA Fact Sheet #16 — Deductions From Wages",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.85,
      },
      {
        url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-531/subpart-C",
        title: "29 CFR Part 531 Subpart C — Payments to Employees",
        authority: "Electronic Code of Federal Regulations",
        confidence: 0.8,
      },
      {
        url: "https://www.irs.gov/tax-professionals/standard-mileage-rates",
        title: "IRS Standard Mileage Rates",
        authority: "Internal Revenue Service",
        confidence: 0.7,
      },
    ],
  },
  {
    category: "1.7 Equal Pay & Wage Protections",
    categoryId: "cmprbbn5t00c78sdl7fgyo5j1",
    topic: "minimum_wage", // closest available
    urls: [
      {
        url: "https://www.eeoc.gov/equal-paycompensation-discrimination",
        title: "EEOC Equal Pay/Compensation Discrimination",
        authority: "U.S. Equal Employment Opportunity Commission",
        confidence: 0.95,
      },
      {
        url: "https://www.dol.gov/agencies/oasam/civil-rights-center/internal/policies/equal-pay-act",
        title: "DOL Equal Pay Act Overview",
        authority: "U.S. Department of Labor",
        confidence: 0.85,
      },
      {
        url: "https://www.dol.gov/agencies/whd/fact-sheets/56c-bonafide-factors",
        title: "FLSA Fact Sheet #56C — Bona Fide Factors (Equal Pay)",
        authority: "U.S. Department of Labor, Wage and Hour Division",
        confidence: 0.8,
      },
      {
        url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XIV/part-1620",
        title: "29 CFR Part 1620 — Equal Pay Act",
        authority: "Electronic Code of Federal Regulations",
        confidence: 0.85,
      },
    ],
  },
];

interface CandidateResult {
  category: string;
  title: string;
  url: string;
  urlHealth: string;
  contentAssessment: string;
  confidence: number;
  notes: string;
  rejected: boolean;
}

async function main() {
  console.log("═══ Federal Compensation Source Inventory ═══\n");

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
    console.log(`\n── ${source.category} ──`);
    let categoryCreated = 0;

    for (const entry of source.urls) {
      // Dedup check
      if (existingUrls.has(entry.url)) {
        console.log(`  · [SKIP] ${entry.url.slice(0, 60)} (duplicate)`);
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
          notes: `Federal compensation inventory: ${source.category}`,
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
      if (!isBroken && (urlResult.urlHealthStatus === "ok" || urlResult.urlHealthStatus === "redirected")) {
        const assessUrl = urlResult.finalUrl || entry.url;
        const assessment = await assessContent(assessUrl, source.topic, entry.title);

        // Adjust confidence
        let adjConf = entry.confidence;
        if (assessment.status === "actionable") adjConf = Math.min(0.95, adjConf + 0.1);
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

      const icon = urlResult.urlHealthStatus === "ok" ? "✓" :
        urlResult.urlHealthStatus === "redirected" ? "→" : "✗";
      const assessIcon = assessmentStatus === "actionable" ? "★" :
        assessmentStatus === "not_actionable" ? "·" :
        assessmentStatus === "unsure" ? "?" : " ";

      const rejected = isBroken;
      if (rejected) totalRejected++;

      console.log(`  ${icon}${assessIcon} [${urlResult.httpStatus || "ERR"}] ${entry.url.slice(0, 60)}${rejected ? " [REJECTED]" : ""}`);

      results.push({
        category: source.category,
        title: entry.title,
        url: entry.url,
        urlHealth: urlResult.urlHealthStatus,
        contentAssessment: assessmentStatus,
        confidence: entry.confidence,
        notes: rejected ? "Broken URL" : "",
        rejected,
      });

      totalCreated++;
      categoryCreated++;
    }

    if (categoryCreated === 0) {
      console.log("  (all URLs already existed)");
    }
  }

  console.log(`\n═══ Summary ═══`);
  console.log(`  Created: ${totalCreated}`);
  console.log(`  Skipped (duplicates): ${totalSkipped}`);
  console.log(`  Rejected (broken): ${totalRejected}`);
  console.log(`  Total candidates in DB: ${await prisma.crawlerCandidate.count()}`);

  // Self-check: verify results
  console.log(`\n═══ Self-Check ═══`);
  for (const source of FEDERAL_SOURCES) {
    const catResults = results.filter((r) => r.category === source.category && !r.rejected);
    const actionable = catResults.filter((r) => r.contentAssessment === "actionable");
    const healthy = catResults.filter((r) => r.urlHealth === "ok" || r.urlHealth === "redirected");

    if (healthy.length === 0) {
      console.log(`  ⚠ ${source.category}: NO healthy URLs found`);
    } else if (actionable.length === 0) {
      console.log(`  ? ${source.category}: ${healthy.length} healthy URLs but none assessed as actionable`);
    } else {
      console.log(`  ✓ ${source.category}: ${actionable.length} actionable, ${healthy.length} healthy`);
    }
  }

  // Print best candidate per category
  console.log(`\n═══ Best Candidate Per Category ═══`);
  for (const source of FEDERAL_SOURCES) {
    const catResults = results.filter((r) => r.category === source.category && !r.rejected);
    const best = catResults.sort((a, b) => {
      // Prefer actionable > unsure > not_actionable
      const assessOrder: Record<string, number> = { actionable: 3, unsure: 2, not_actionable: 1, unchecked: 0 };
      const aScore = (assessOrder[a.contentAssessment] || 0) * 10 + a.confidence * 10;
      const bScore = (assessOrder[b.contentAssessment] || 0) * 10 + b.confidence * 10;
      return bScore - aScore;
    })[0];

    if (best) {
      console.log(`  ${source.category}:`);
      console.log(`    ${best.title}`);
      console.log(`    ${best.url}`);
      console.log(`    health=${best.urlHealth} content=${best.contentAssessment} conf=${best.confidence}`);
    } else {
      console.log(`  ${source.category}: NO CANDIDATE`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
