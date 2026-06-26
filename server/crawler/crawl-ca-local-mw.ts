/**
 * Targeted California local minimum wage crawler.
 *
 * For each CA municipality in the ontology, attempts to find the official
 * city minimum wage page and create a CrawlerCandidate.
 *
 * Does NOT auto-promote. Does NOT expand the ontology.
 *
 * Usage:
 *   npm run crawl:ca-local-mw
 */

import { PrismaClient } from "@prisma/client";
import { checkUrl } from "./url-checker.js";
import { assessContent } from "./content-assessor.js";

const prisma = new PrismaClient();

const LOCAL_MW_CATEGORY_ID = "cmprbbn5g009p8sdl0ak943ld";

// Known official city minimum wage URLs — curated from official sources
// These are the actual city government pages for minimum wage ordinances
const KNOWN_URLS: Record<string, { url: string; authority: string }[]> = {
  "Alameda": [{ url: "https://www.alamedaca.gov/Departments/Finance/Minimum-Wage", authority: "City of Alameda" }],
  "Belmont": [{ url: "https://www.belmont.gov/city-hall/finance/minimum-wage", authority: "City of Belmont" }],
  "Berkeley": [{ url: "https://berkeleyca.gov/doing-business/operating-berkeley/minimum-wage", authority: "City of Berkeley" }],
  "Burlingame": [{ url: "https://www.burlingame.org/departments/community-development/minimum-wage", authority: "City of Burlingame" }],
  "Cupertino": [{ url: "https://www.cupertino.org/our-city/departments/community-development/minimum-wage", authority: "City of Cupertino" }],
  "Daly City": [{ url: "https://www.dalycity.org/minimumwage", authority: "City of Daly City" }],
  "East Palo Alto": [{ url: "https://www.cityofepa.org/econdev/page/minimum-wage", authority: "City of East Palo Alto" }],
  "Emeryville": [{ url: "https://www.ci.emeryville.ca.us/1024/Minimum-Wage-Ordinance", authority: "City of Emeryville" }],
  "Foster City": [{ url: "https://www.fostercity.org/finance/page/minimum-wage", authority: "City of Foster City" }],
  "Fremont": [{ url: "https://www.fremont.gov/government/departments/human-services/minimum-wage", authority: "City of Fremont" }],
  "Half Moon Bay": [{ url: "https://www.half-moon-bay.ca.us/minimumwage", authority: "City of Half Moon Bay" }],
  "Hayward": [{ url: "https://www.hayward-ca.gov/your-government/departments/city-manager/minimum-wage", authority: "City of Hayward" }],
  "Los Altos": [{ url: "https://www.losaltosca.gov/economicdevelopment/page/minimum-wage", authority: "City of Los Altos" }],
  "Los Angeles": [{ url: "https://wagesla.lacity.org/", authority: "City of Los Angeles" }],
  "Malibu": [{ url: "https://www.malibucity.org/minimumwage", authority: "City of Malibu" }],
  "Menlo Park": [{ url: "https://www.menlopark.gov/Government/Departments/City-Manager/Minimum-Wage", authority: "City of Menlo Park" }],
  "Milpitas": [{ url: "https://www.milpitas.gov/milpitas/departments/city-manager/minimum-wage/", authority: "City of Milpitas" }],
  "Mountain View": [{ url: "https://www.mountainview.gov/our-city/departments/community-development/minimum-wage", authority: "City of Mountain View" }],
  "Novato": [{ url: "https://www.novato.org/government/city-manager/minimum-wage", authority: "City of Novato" }],
  "Oakland": [{ url: "https://www.oaklandca.gov/topics/minimum-wage-702", authority: "City of Oakland" }],
  "Palo Alto": [{ url: "https://www.cityofpaloalto.org/Departments/Administrative-Services/Minimum-Wage", authority: "City of Palo Alto" }],
  "Pasadena": [{ url: "https://www.cityofpasadena.net/finance/minimum-wage/", authority: "City of Pasadena" }],
  "Petaluma": [{ url: "https://cityofpetaluma.org/minimum-wage/", authority: "City of Petaluma" }],
  "Redwood City": [{ url: "https://www.redwoodcity.org/departments/city-manager/minimum-wage", authority: "City of Redwood City" }],
  "Richmond": [{ url: "https://www.ci.richmond.ca.us/3476/Minimum-Wage", authority: "City of Richmond" }],
  "San Carlos": [{ url: "https://www.cityofsancarlos.org/government/departments/city-manager/minimum-wage", authority: "City of San Carlos" }],
  "San Diego": [{ url: "https://www.sandiego.gov/treasurer/minimum-wage", authority: "City of San Diego" }],
  "San Francisco": [{ url: "https://sf.gov/information/minimum-wage", authority: "City of San Francisco" }],
  "San Jose": [{ url: "https://www.sanjoseca.gov/your-government/departments-offices/office-of-equality-assurance/minimum-wage-ordinance", authority: "City of San Jose" }],
  "San Mateo": [{ url: "https://www.cityofsanmateo.org/4014/Minimum-Wage", authority: "City of San Mateo" }],
  "Santa Clara": [{ url: "https://www.santaclaraca.gov/our-city/departments-a-f/finance/minimum-wage", authority: "City of Santa Clara" }],
  "Santa Monica": [{ url: "https://santamonica.gov/minimum-wage", authority: "City of Santa Monica" }],
  "Santa Rosa": [{ url: "https://www.srcity.org/3287/Minimum-Wage", authority: "City of Santa Rosa" }],
  "Sonoma": [{ url: "https://www.sonomacity.org/minimum-wage/", authority: "City of Sonoma" }],
  "South San Francisco": [{ url: "https://www.ssf.net/departments/city-manager/minimum-wage", authority: "City of South San Francisco" }],
  "Sunnyvale": [{ url: "https://www.sunnyvale.ca.gov/your-government/departments/finance/minimum-wage", authority: "City of Sunnyvale" }],
  "West Hollywood": [{ url: "https://www.weho.org/business/minimum-wage", authority: "City of West Hollywood" }],
};

interface Result {
  city: string;
  url: string;
  urlHealth: string;
  contentAssessment: string;
  hasStructuredRule: boolean;
  selectedRate: string | null;
  confidence: number;
  notes: string;
}

async function main() {
  console.log("═══ California Local Minimum Wage Inventory ═══\n");

  // Get all CA municipalities from ontology
  const caLocals = await prisma.jurisdiction.findMany({
    where: { state: "CA", type: { in: ["city", "municipality"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  console.log(`CA municipalities in ontology: ${caLocals.length}`);
  console.log(`Known URLs: ${Object.keys(KNOWN_URLS).length}`);

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
  let created = 0;
  let skipped = 0;
  let rejected = 0;
  let noSource = 0;

  for (const jur of caLocals) {
    const urls = KNOWN_URLS[jur.name];
    if (!urls || urls.length === 0) {
      noSource++;
      results.push({
        city: jur.name,
        url: "",
        urlHealth: "n/a",
        contentAssessment: "n/a",
        hasStructuredRule: false,
        selectedRate: null,
        confidence: 0,
        notes: "No known official URL",
      });
      continue;
    }

    for (const entry of urls) {
      if (existingUrls.has(entry.url)) {
        console.log(`  · [SKIP] ${jur.name}: ${entry.url.slice(0, 55)}`);
        skipped++;
        continue;
      }

      // Create candidate
      const record = await prisma.crawlerCandidate.create({
        data: {
          sourceUrl: entry.url,
          title: `${jur.name} Minimum Wage`,
          sourceAuthority: entry.authority,
          guessedJurisdictionId: jur.id,
          guessedLawCategoryId: LOCAL_MW_CATEGORY_ID,
          confidence: 0.85,
          notes: `CA local minimum wage inventory: ${jur.name}`,
          status: "new",
        },
      });

      existingUrls.add(entry.url);

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

      // Content assessment for healthy URLs
      let assessmentStatus = "unchecked";
      let hasStructuredRule = false;
      let selectedRate: string | null = null;

      if (!isBroken && (urlResult.urlHealthStatus === "ok" || urlResult.urlHealthStatus === "redirected")) {
        const assessUrl = urlResult.finalUrl || entry.url;
        const assessment = await assessContent(assessUrl, "minimum_wage", `${jur.name} Minimum Wage`, jur.name);

        const facts = assessment.actionableFacts as Record<string, unknown> | null;
        hasStructuredRule = !!(facts && facts.structuredRule);
        if (hasStructuredRule) {
          const rule = (facts!.structuredRule as any);
          selectedRate = rule.selectedRate?.amount || null;
        }

        let adjConf = 0.85;
        if (assessment.status === "actionable" && hasStructuredRule) adjConf = 0.95;
        else if (assessment.status === "actionable") adjConf = 0.90;
        else if (assessment.status === "not_actionable") adjConf = 0.4;

        await prisma.crawlerCandidate.update({
          where: { id: record.id },
          data: {
            contentAssessmentStatus: assessment.status,
            contentAssessmentSummary: assessment.summary,
            actionableFacts: (assessment.actionableFacts as any) || undefined,
            assessedAt: assessment.assessedAt,
            confidence: adjConf,
          },
        });

        assessmentStatus = assessment.status;
      }

      if (isBroken) rejected++;

      const icon = isBroken ? "✗" :
        hasStructuredRule ? "★" :
        assessmentStatus === "actionable" ? "☆" :
        assessmentStatus === "unsure" ? "?" : "·";

      console.log(`  ${icon} ${jur.name}: ${urlResult.urlHealthStatus} | ${assessmentStatus}${selectedRate ? ` | ${selectedRate}` : ""}${isBroken ? " [REJECTED]" : ""}`);

      results.push({
        city: jur.name,
        url: entry.url,
        urlHealth: urlResult.urlHealthStatus,
        contentAssessment: assessmentStatus,
        hasStructuredRule,
        selectedRate,
        confidence: hasStructuredRule ? 0.95 : 0.85,
        notes: isBroken ? `Broken (${urlResult.failureReason || urlResult.httpStatus})` : "",
      });

      created++;
    }
  }

  // Summary
  console.log(`\n\n═══ SUMMARY ═══`);
  console.log(`  Cities attempted: ${caLocals.length}`);
  console.log(`  Candidates created: ${created}`);
  console.log(`  Skipped (duplicates): ${skipped}`);
  console.log(`  Rejected (broken): ${rejected}`);
  console.log(`  No known URL: ${noSource}`);
  console.log(`  With structured rule: ${results.filter(r => r.hasStructuredRule).length}`);
  console.log(`  Actionable: ${results.filter(r => r.contentAssessment === "actionable").length}`);
  console.log(`  LawSources (unchanged): ${await prisma.lawSource.count()}`);

  // Cities with rules
  console.log(`\n═══ CITIES WITH STRUCTURED RULES ═══`);
  for (const r of results.filter(r => r.hasStructuredRule)) {
    console.log(`  ★ ${r.city}: ${r.selectedRate}`);
  }

  // Cities needing review
  console.log(`\n═══ CITIES NEEDING REVIEW ═══`);
  for (const r of results.filter(r => r.urlHealth === "broken_url" || r.urlHealth === "manual_review")) {
    console.log(`  ⚠ ${r.city}: ${r.notes}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
