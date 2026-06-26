/**
 * Bounded jurisdiction inventory for AL, AK, AZ, AR, CA + CA locals.
 *
 * Creates CrawlerCandidate records ONLY. Does NOT promote or create LawSource.
 *
 * Usage:
 *   npm run crawl:states-ac
 */

import { PrismaClient } from "@prisma/client";
import { checkUrl } from "./url-checker.js";
import { assessContent } from "./content-assessor.js";

const prisma = new PrismaClient();

interface SourceEntry {
  url: string;
  title: string;
  authority: string;
  confidence: number;
  topic: string;
}

interface JurisdictionSources {
  jurisdictionId: string;
  jurisdictionName: string;
  state: string;
  categoryId: string;
  categoryName: string;
  sources: SourceEntry[];
}

// ─── Source data ───────────────────────────────────────────────────
// Curated from official state labor department and legislative sources.
// No legal values are hard-coded — the assessor extracts from page content.

const INVENTORY: JurisdictionSources[] = [
  // ═══ ALABAMA ═══
  {
    jurisdictionId: "cmprbbn3x000g8sdltzc081yj",
    jurisdictionName: "Alabama", state: "AL",
    categoryId: "cmprbbn5g009n8sdl4aw29iq5", categoryName: "State Minimum Wage",
    sources: [
      { url: "https://www.dol.gov/agencies/whd/minimum-wage/state#al", title: "DOL State Minimum Wage — Alabama", authority: "U.S. Department of Labor", confidence: 0.7, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3x000g8sdltzc081yj",
    jurisdictionName: "Alabama", state: "AL",
    categoryId: "cmprbbn5k00ah8sdlin3kyopu", categoryName: "Weekly Overtime",
    sources: [
      { url: "https://www.dol.gov/agencies/whd/state/overtime#al", title: "DOL State Overtime — Alabama", authority: "U.S. Department of Labor", confidence: 0.6, topic: "overtime" },
    ],
  },

  // ═══ ALASKA ═══
  {
    jurisdictionId: "cmprbbn3y000i8sdlpv5nlp5n",
    jurisdictionName: "Alaska", state: "AK",
    categoryId: "cmprbbn5g009n8sdl4aw29iq5", categoryName: "State Minimum Wage",
    sources: [
      { url: "https://labor.alaska.gov/lss/whact.htm", title: "Alaska Wage and Hour Act", authority: "Alaska Department of Labor", confidence: 0.9, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3y000i8sdlpv5nlp5n",
    jurisdictionName: "Alaska", state: "AK",
    categoryId: "cmprbbn5k00ah8sdlin3kyopu", categoryName: "Weekly Overtime",
    sources: [
      { url: "https://labor.alaska.gov/lss/whact.htm", title: "Alaska Wage and Hour Act — Overtime", authority: "Alaska Department of Labor", confidence: 0.85, topic: "overtime" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3y000i8sdlpv5nlp5n",
    jurisdictionName: "Alaska", state: "AK",
    categoryId: "cmprbbn5v00cm8sdlqs1uhof2", categoryName: "Meal Breaks",
    sources: [
      { url: "https://labor.alaska.gov/lss/whact.htm", title: "Alaska Wage and Hour — Breaks", authority: "Alaska Department of Labor", confidence: 0.7, topic: "meal_break" },
    ],
  },

  // ═══ ARIZONA ═══
  {
    jurisdictionId: "cmprbbn3y000k8sdlzj6fcshk",
    jurisdictionName: "Arizona", state: "AZ",
    categoryId: "cmprbbn5g009n8sdl4aw29iq5", categoryName: "State Minimum Wage",
    sources: [
      { url: "https://www.azica.gov/labor-minimum-wage-main-page", title: "Arizona Minimum Wage", authority: "Arizona Industrial Commission", confidence: 0.9, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3y000k8sdlzj6fcshk",
    jurisdictionName: "Arizona", state: "AZ",
    categoryId: "cmprbbn6400ef8sdlngv1evkc", categoryName: "Paid Sick Leave",
    sources: [
      { url: "https://www.azica.gov/labor-paid-sick-leave-background", title: "Arizona Paid Sick Leave", authority: "Arizona Industrial Commission", confidence: 0.9, topic: "paid_sick_leave" },
    ],
  },
  // Tucson
  {
    jurisdictionId: "cmprbbn3y000m8sdltbmuqnzx",
    jurisdictionName: "Tucson", state: "AZ",
    categoryId: "cmprbbn5g009p8sdl0ak943ld", categoryName: "Local Minimum Wage",
    sources: [
      { url: "https://www.tucsonaz.gov/hcd/minimum-wage", title: "Tucson Minimum Wage", authority: "City of Tucson", confidence: 0.85, topic: "minimum_wage" },
    ],
  },

  // ═══ ARKANSAS ═══
  {
    jurisdictionId: "cmprbbn3z000o8sdl5dgp7o44",
    jurisdictionName: "Arkansas", state: "AR",
    categoryId: "cmprbbn5g009n8sdl4aw29iq5", categoryName: "State Minimum Wage",
    sources: [
      { url: "https://www.labor.arkansas.gov/labor/labor-standards/minimum-wage-information/", title: "Arkansas Minimum Wage", authority: "Arkansas Department of Labor", confidence: 0.9, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3z000o8sdl5dgp7o44",
    jurisdictionName: "Arkansas", state: "AR",
    categoryId: "cmprbbn5k00ah8sdlin3kyopu", categoryName: "Weekly Overtime",
    sources: [
      { url: "https://www.labor.arkansas.gov/labor/labor-standards/overtime/", title: "Arkansas Overtime", authority: "Arkansas Department of Labor", confidence: 0.85, topic: "overtime" },
    ],
  },

  // ═══ CALIFORNIA (State) ═══
  {
    jurisdictionId: "cmprbbn3z000q8sdl90o76cud",
    jurisdictionName: "California", state: "CA",
    categoryId: "cmprbbn5g009n8sdl4aw29iq5", categoryName: "State Minimum Wage",
    sources: [
      { url: "https://www.dir.ca.gov/dlse/faq_minimumwage.htm", title: "California Minimum Wage FAQ", authority: "California DIR/DLSE", confidence: 0.95, topic: "minimum_wage" },
      { url: "https://www.dir.ca.gov/iwc/minimumwagehistory.htm", title: "California Minimum Wage History", authority: "California DIR", confidence: 0.8, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3z000q8sdl90o76cud",
    jurisdictionName: "California", state: "CA",
    categoryId: "cmprbbn5l00aj8sdl5q76tc5i", categoryName: "Daily Overtime",
    sources: [
      { url: "https://www.dir.ca.gov/dlse/faq_overtime.htm", title: "California Overtime FAQ", authority: "California DIR/DLSE", confidence: 0.95, topic: "overtime" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3z000q8sdl90o76cud",
    jurisdictionName: "California", state: "CA",
    categoryId: "cmprbbn5v00cm8sdlqs1uhof2", categoryName: "Meal Breaks",
    sources: [
      { url: "https://www.dir.ca.gov/dlse/faq_mealperiods.htm", title: "California Meal Period FAQ", authority: "California DIR/DLSE", confidence: 0.95, topic: "meal_break" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3z000q8sdl90o76cud",
    jurisdictionName: "California", state: "CA",
    categoryId: "cmprbbn5x00cy8sdld2ia4db1", categoryName: "Rest Breaks",
    sources: [
      { url: "https://www.dir.ca.gov/dlse/faq_restperiods.htm", title: "California Rest Period FAQ", authority: "California DIR/DLSE", confidence: 0.95, topic: "meal_break" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3z000q8sdl90o76cud",
    jurisdictionName: "California", state: "CA",
    categoryId: "cmprbbn5n00ax8sdlcl6nc33k", categoryName: "Split Shift Premium",
    sources: [
      { url: "https://www.dir.ca.gov/dlse/faq_splitshift.htm", title: "California Split Shift FAQ", authority: "California DIR/DLSE", confidence: 0.9, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3z000q8sdl90o76cud",
    jurisdictionName: "California", state: "CA",
    categoryId: "cmprbbn6400ef8sdlngv1evkc", categoryName: "Paid Sick Leave",
    sources: [
      { url: "https://www.dir.ca.gov/dlse/paid_sick_days.htm", title: "California Paid Sick Leave", authority: "California DIR/DLSE", confidence: 0.95, topic: "paid_sick_leave" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3z000q8sdl90o76cud",
    jurisdictionName: "California", state: "CA",
    categoryId: "cmprbbn6z00k78sdl0u186pa1", categoryName: "Final Pay Timing",
    sources: [
      { url: "https://www.dir.ca.gov/dlse/faq_finalpay.htm", title: "California Final Pay FAQ", authority: "California DIR/DLSE", confidence: 0.9, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn3z000q8sdl90o76cud",
    jurisdictionName: "California", state: "CA",
    categoryId: "cmprbbn5r00bt8sdld4nrww7m", categoryName: "Reimbursements & Allowances",
    sources: [
      { url: "https://www.dir.ca.gov/dlse/LC2802.html", title: "California Labor Code 2802 — Expense Reimbursement", authority: "California DIR", confidence: 0.85, topic: "compensable_time" },
    ],
  },

  // ═══ CALIFORNIA LOCAL — Key cities with known minimum wage ordinances ═══
  {
    jurisdictionId: "cmprbbn4800228sdl903u04k1",
    jurisdictionName: "San Francisco", state: "CA",
    categoryId: "cmprbbn5g009p8sdl0ak943ld", categoryName: "Local Minimum Wage",
    sources: [
      { url: "https://sfgov.org/olse/minimum-wage-ordinance", title: "San Francisco Minimum Wage Ordinance", authority: "SF Office of Labor Standards Enforcement", confidence: 0.95, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn4800228sdl903u04k1",
    jurisdictionName: "San Francisco", state: "CA",
    categoryId: "cmprbbn6400ef8sdlngv1evkc", categoryName: "Paid Sick Leave",
    sources: [
      { url: "https://sfgov.org/olse/paid-sick-leave-ordinance", title: "San Francisco Paid Sick Leave Ordinance", authority: "SF Office of Labor Standards Enforcement", confidence: 0.9, topic: "paid_sick_leave" },
    ],
  },
  {
    jurisdictionId: "cmprbbn44001i8sdljju1ooi3",
    jurisdictionName: "Los Angeles", state: "CA",
    categoryId: "cmprbbn5g009p8sdl0ak943ld", categoryName: "Local Minimum Wage",
    sources: [
      { url: "https://wagesla.lacity.org/", title: "Los Angeles Minimum Wage", authority: "City of Los Angeles", confidence: 0.9, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn43001c8sdl3nibnbz7",
    jurisdictionName: "Oakland", state: "CA",
    categoryId: "cmprbbn5g009p8sdl0ak943ld", categoryName: "Local Minimum Wage",
    sources: [
      { url: "https://www.oaklandca.gov/topics/minimum-wage-702", title: "Oakland Minimum Wage", authority: "City of Oakland", confidence: 0.9, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn4e00348sdlfjv75wsb",
    jurisdictionName: "San Jose", state: "CA",
    categoryId: "cmprbbn5g009p8sdl0ak943ld", categoryName: "Local Minimum Wage",
    sources: [
      { url: "https://www.sanjoseca.gov/your-government/departments-offices/office-of-equality-assurance/minimum-wage-ordinance", title: "San Jose Minimum Wage", authority: "City of San Jose", confidence: 0.9, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn43001c8sdl3nibnbz7",
    jurisdictionName: "Oakland", state: "CA",
    categoryId: "cmprbbn6400ef8sdlngv1evkc", categoryName: "Paid Sick Leave",
    sources: [
      { url: "https://www.oaklandca.gov/topics/paid-sick-leave", title: "Oakland Paid Sick Leave", authority: "City of Oakland", confidence: 0.85, topic: "paid_sick_leave" },
    ],
  },
  {
    jurisdictionId: "cmprbbn4200168sdlkr4fzlga",
    jurisdictionName: "Emeryville", state: "CA",
    categoryId: "cmprbbn5g009p8sdl0ak943ld", categoryName: "Local Minimum Wage",
    sources: [
      { url: "https://www.ci.emeryville.ca.us/1024/Minimum-Wage-Ordinance", title: "Emeryville Minimum Wage", authority: "City of Emeryville", confidence: 0.85, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn43001c8sdl3nibnbz7",
    jurisdictionName: "Berkeley", state: "CA",
    categoryId: "cmprbbn5g009p8sdl0ak943ld", categoryName: "Local Minimum Wage",
    sources: [
      { url: "https://www.cityofberkeley.info/minimumwage/", title: "Berkeley Minimum Wage", authority: "City of Berkeley", confidence: 0.85, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn45001o8sdly1vi8v1z",
    jurisdictionName: "Santa Monica", state: "CA",
    categoryId: "cmprbbn5g009p8sdl0ak943ld", categoryName: "Local Minimum Wage",
    sources: [
      { url: "https://santamonica.gov/minimum-wage", title: "Santa Monica Minimum Wage", authority: "City of Santa Monica", confidence: 0.85, topic: "minimum_wage" },
    ],
  },
  {
    jurisdictionId: "cmprbbn46001q8sdlfybmcill",
    jurisdictionName: "West Hollywood", state: "CA",
    categoryId: "cmprbbn5g009p8sdl0ak943ld", categoryName: "Local Minimum Wage",
    sources: [
      { url: "https://www.weho.org/business/minimum-wage", title: "West Hollywood Minimum Wage", authority: "City of West Hollywood", confidence: 0.85, topic: "minimum_wage" },
    ],
  },
];

// ─── Main execution ────────────────────────────────────────────────

interface Result {
  jurisdiction: string;
  state: string;
  category: string;
  title: string;
  url: string;
  urlHealth: string;
  contentAssessment: string;
  hasStructuredRule: boolean;
  confidence: number;
  rejected: boolean;
}

async function main() {
  console.log("═══ State Inventory: AL, AK, AZ, AR, CA ═══\n");

  // Deduplicate
  const existing = await prisma.crawlerCandidate.findMany({
    select: { sourceUrl: true, finalUrl: true },
  });
  const existingUrls = new Set<string>();
  for (const e of existing) {
    existingUrls.add(e.sourceUrl);
    if (e.finalUrl) existingUrls.add(e.finalUrl);
  }

  const results: Result[] = [];
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalRejected = 0;
  const byState: Record<string, number> = {};

  for (const item of INVENTORY) {
    for (const entry of item.sources) {
      if (existingUrls.has(entry.url)) {
        console.log(`  · [SKIP] ${entry.url.slice(0, 60)}`);
        totalSkipped++;
        continue;
      }

      // Create candidate
      const record = await prisma.crawlerCandidate.create({
        data: {
          sourceUrl: entry.url,
          title: entry.title,
          sourceAuthority: entry.authority,
          guessedJurisdictionId: item.jurisdictionId,
          guessedLawCategoryId: item.categoryId,
          confidence: entry.confidence,
          notes: `State inventory: ${item.jurisdictionName} (${item.state}) — ${item.categoryName}`,
          status: "new",
        },
      });

      existingUrls.add(entry.url);
      byState[item.state] = (byState[item.state] || 0) + 1;

      // URL health check
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

      // Content assessment
      let assessmentStatus = "unchecked";
      let hasStructuredRule = false;
      if (!isBroken && (urlResult.urlHealthStatus === "ok" || urlResult.urlHealthStatus === "redirected")) {
        const assessUrl = urlResult.finalUrl || entry.url;
        const assessment = await assessContent(assessUrl, entry.topic, entry.title, item.jurisdictionName);

        const facts = assessment.actionableFacts as Record<string, unknown> | null;
        hasStructuredRule = !!(facts && facts.structuredRule);

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
      const assessIcon = hasStructuredRule ? "★" :
        assessmentStatus === "actionable" ? "☆" :
        assessmentStatus === "not_actionable" ? "·" :
        assessmentStatus === "unsure" ? "?" : " ";

      if (isBroken) totalRejected++;

      console.log(`  ${healthIcon}${assessIcon} ${item.state} | ${item.jurisdictionName} | ${item.categoryName} | ${entry.title.slice(0, 40)}${isBroken ? " [REJECTED]" : ""}${hasStructuredRule ? " [RULE]" : ""}`);

      results.push({
        jurisdiction: item.jurisdictionName,
        state: item.state,
        category: item.categoryName,
        title: entry.title,
        url: entry.url,
        urlHealth: urlResult.urlHealthStatus,
        contentAssessment: assessmentStatus,
        hasStructuredRule,
        confidence: entry.confidence,
        rejected: isBroken,
      });

      totalCreated++;
    }
  }

  // Summary
  console.log(`\n\n═══ SUMMARY ═══`);
  console.log(`  Created: ${totalCreated}`);
  console.log(`  Skipped (duplicates): ${totalSkipped}`);
  console.log(`  Rejected (broken): ${totalRejected}`);
  console.log(`  With structured rule: ${results.filter(r => r.hasStructuredRule).length}`);
  console.log(`  By state:`, byState);
  console.log(`  LawSources (unchanged): ${await prisma.lawSource.count()}`);

  // Per-state summary
  console.log(`\n═══ BY STATE ═══`);
  for (const state of ["AL", "AK", "AZ", "AR", "CA"]) {
    const stateResults = results.filter(r => r.state === state && !r.rejected);
    const withRule = stateResults.filter(r => r.hasStructuredRule);
    const actionable = stateResults.filter(r => r.contentAssessment === "actionable");
    console.log(`  ${state}: ${stateResults.length} healthy, ${withRule.length} with rule, ${actionable.length} actionable`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
