/**
 * California local minimum wage crawler v2.
 *
 * Uses city homepage → refiner approach to discover actual minimum wage pages.
 * For cities where the previous crawl failed (404), this script:
 * 1. Starts from the city's official homepage
 * 2. Uses the refiner to find minimum-wage-related subpages
 * 3. Creates CrawlerCandidate records for discovered pages
 *
 * Does NOT auto-promote. Does NOT expand the ontology.
 *
 * Usage:
 *   npm run crawl:ca-local-mw-v2
 */

import { PrismaClient } from "@prisma/client";
import { checkUrl } from "./url-checker.js";
import { assessContent } from "./content-assessor.js";
import { refineLinks } from "./refiner.js";

const prisma = new PrismaClient();

const LOCAL_MW_CATEGORY_ID = "cmprbbn5g009p8sdl0ak943ld";

// City homepages for discovery — only cities that failed in v1
const CITY_HOMEPAGES: Record<string, { homepage: string; authority: string; jurisdictionId: string }> = {
  "Alameda": { homepage: "https://www.alamedaca.gov", authority: "City of Alameda", jurisdictionId: "cmprbbn4100128sdlqgvu8dtt" },
  "Belmont": { homepage: "https://www.belmont.gov", authority: "City of Belmont", jurisdictionId: "cmprbbn4800268sdl7fl68gik" },
  "Berkeley": { homepage: "https://berkeleyca.gov", authority: "City of Berkeley", jurisdictionId: "cmprbbn4200148sdlv5r5chrs" },
  "Burlingame": { homepage: "https://www.burlingame.org", authority: "City of Burlingame", jurisdictionId: "cmprbbn4900288sdl3ooz800z" },
  "Cupertino": { homepage: "https://www.cupertino.org", authority: "City of Cupertino", jurisdictionId: "cmprbbn4d002u8sdln11omyty" },
  "East Palo Alto": { homepage: "https://www.cityofepa.org", authority: "City of East Palo Alto", jurisdictionId: "cmprbbn4a002c8sdlw9xbm3ft" },
  "Emeryville": { homepage: "https://www.ci.emeryville.ca.us", authority: "City of Emeryville", jurisdictionId: "cmprbbn4200168sdlkr4fzlga" },
  "Foster City": { homepage: "https://www.fostercity.org", authority: "City of Foster City", jurisdictionId: "cmprbbn4a002e8sdl3st7w5i2" },
  "Fremont": { homepage: "https://www.fremont.gov", authority: "City of Fremont", jurisdictionId: "cmprbbn4200188sdliulaj886" },
  "Hayward": { homepage: "https://www.hayward-ca.gov", authority: "City of Hayward", jurisdictionId: "cmprbbn43001a8sdlfgoa9yam" },
  "Los Altos": { homepage: "https://www.losaltosca.gov", authority: "City of Los Altos", jurisdictionId: "cmprbbn4d002w8sdlhkji9k32" },
  "Menlo Park": { homepage: "https://www.menlopark.gov", authority: "City of Menlo Park", jurisdictionId: "cmprbbn4a002i8sdlo197ypmk" },
  "Milpitas": { homepage: "https://www.milpitas.gov", authority: "City of Milpitas", jurisdictionId: "cmprbbn4d002y8sdlwrglbbht" },
  "Mountain View": { homepage: "https://www.mountainview.gov", authority: "City of Mountain View", jurisdictionId: "cmprbbn4e00308sdlin7l1rix" },
  "Novato": { homepage: "https://www.novato.org", authority: "City of Novato", jurisdictionId: "cmprbbn46001u8sdl4jznae0t" },
  "Oakland": { homepage: "https://www.oaklandca.gov", authority: "City of Oakland", jurisdictionId: "cmprbbn43001c8sdl3nibnbz7" },
  "Palo Alto": { homepage: "https://www.cityofpaloalto.org", authority: "City of Palo Alto", jurisdictionId: "cmprbbn4e00328sdl9sveo0l5" },
  "Pasadena": { homepage: "https://www.cityofpasadena.net", authority: "City of Pasadena", jurisdictionId: "cmprbbn45001m8sdlf5gashrj" },
  "Redwood City": { homepage: "https://www.redwoodcity.org", authority: "City of Redwood City", jurisdictionId: "cmprbbn4b002k8sdlkemro40m" },
  "San Carlos": { homepage: "https://www.cityofsancarlos.org", authority: "City of San Carlos", jurisdictionId: "cmprbbn4b002m8sdlwmv77bga" },
  "San Diego": { homepage: "https://www.sandiego.gov", authority: "City of San Diego", jurisdictionId: "cmprbbn47001y8sdl1pjlkb8y" },
  "San Francisco": { homepage: "https://sf.gov", authority: "City of San Francisco", jurisdictionId: "cmprbbn4800228sdl903u04k1" },
  "San Jose": { homepage: "https://www.sanjoseca.gov", authority: "City of San Jose", jurisdictionId: "cmprbbn4e00348sdlfjv75wsb" },
  "San Mateo": { homepage: "https://www.cityofsanmateo.org", authority: "City of San Mateo", jurisdictionId: "cmprbbn4c002o8sdl41azws01" },
  "Santa Clara": { homepage: "https://www.santaclaraca.gov", authority: "City of Santa Clara", jurisdictionId: "cmprbbn4f00368sdlvddczye5" },
  "Santa Rosa": { homepage: "https://www.srcity.org", authority: "City of Santa Rosa", jurisdictionId: "cmprbbn4g003e8sdltkftmw8j" },
  "Sonoma": { homepage: "https://www.sonomacity.org", authority: "City of Sonoma", jurisdictionId: "cmprbbn4g003g8sdlhhtkaytw" },
  "South San Francisco": { homepage: "https://www.ssf.net", authority: "City of South San Francisco", jurisdictionId: "cmprbbn4c002q8sdluh30baxr" },
  "Sunnyvale": { homepage: "https://www.sunnyvale.ca.gov", authority: "City of Sunnyvale", jurisdictionId: "cmprbbn4f00388sdlsvjwrfve" },
  "West Hollywood": { homepage: "https://www.weho.org", authority: "City of West Hollywood", jurisdictionId: "cmprbbn46001q8sdlfybmcill" },
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
  method: string;
}

async function main() {
  console.log("═══ California Local Minimum Wage v2 (Refiner-based) ═══\n");

  // Deduplicate against existing candidates
  const existing = await prisma.crawlerCandidate.findMany({
    where: { guessedLawCategoryId: LOCAL_MW_CATEGORY_ID, guessedJurisdiction: { state: "CA" } },
    select: { sourceUrl: true, finalUrl: true, guessedJurisdiction: { select: { name: true } }, status: true, urlHealthStatus: true },
  });

  // Track which cities already have healthy candidates
  const citiesWithHealthy = new Set<string>();
  const existingUrls = new Set<string>();
  for (const e of existing) {
    existingUrls.add(e.sourceUrl);
    if (e.finalUrl) existingUrls.add(e.finalUrl);
    if (e.status === "new" && (e.urlHealthStatus === "ok" || e.urlHealthStatus === "redirected")) {
      if (e.guessedJurisdiction?.name) citiesWithHealthy.add(e.guessedJurisdiction.name);
    }
  }

  console.log(`Cities already covered: ${citiesWithHealthy.size} (${[...citiesWithHealthy].join(", ")})`);
  console.log(`Cities to attempt: ${Object.keys(CITY_HOMEPAGES).length - citiesWithHealthy.size}\n`);

  const results: Result[] = [];
  let created = 0;
  let skipped = 0;

  for (const [city, info] of Object.entries(CITY_HOMEPAGES)) {
    // Skip cities that already have healthy candidates
    if (citiesWithHealthy.has(city)) {
      console.log(`  · [SKIP] ${city} — already has healthy candidate`);
      skipped++;
      continue;
    }

    console.log(`\n── ${city} ──`);
    console.log(`  Homepage: ${info.homepage}`);

    // Use refiner to find minimum wage pages from city homepage
    let refinedLinks: { url: string; text: string; score: number; matchedTerms: string[] }[] = [];
    try {
      refinedLinks = await refineLinks(info.homepage, "minimum_wage");
    } catch (err: any) {
      console.log(`  ✗ Refiner failed: ${err.message?.slice(0, 60)}`);
      results.push({
        city, url: info.homepage, urlHealth: "error", contentAssessment: "error",
        hasStructuredRule: false, selectedRate: null, confidence: 0,
        notes: `Refiner failed: ${err.message?.slice(0, 40)}`, method: "refiner",
      });
      continue;
    }

    if (refinedLinks.length === 0) {
      console.log(`  · No minimum wage links found on homepage`);
      results.push({
        city, url: info.homepage, urlHealth: "n/a", contentAssessment: "n/a",
        hasStructuredRule: false, selectedRate: null, confidence: 0,
        notes: "No minimum wage links found on homepage", method: "refiner",
      });
      continue;
    }

    // Take top 2 refined links
    const topLinks = refinedLinks.slice(0, 2);
    console.log(`  Found ${refinedLinks.length} links, checking top ${topLinks.length}:`);

    for (const link of topLinks) {
      if (existingUrls.has(link.url)) {
        console.log(`    · [DUP] ${link.url.slice(0, 55)}`);
        continue;
      }

      // Create candidate
      const record = await prisma.crawlerCandidate.create({
        data: {
          sourceUrl: link.url,
          title: link.text || `${city} Minimum Wage`,
          sourceAuthority: info.authority,
          guessedJurisdictionId: info.jurisdictionId,
          guessedLawCategoryId: LOCAL_MW_CATEGORY_ID,
          confidence: 0.80,
          notes: `CA local MW v2 (refiner from homepage): ${city}. Score: ${link.score}. Terms: ${link.matchedTerms.join(", ")}`,
          rawPayload: { parentUrl: info.homepage, score: link.score, matchedTerms: link.matchedTerms } as any,
          status: "new",
        },
      });

      existingUrls.add(link.url);

      // URL health check
      const urlResult = await checkUrl(link.url);
      const isBroken = urlResult.urlHealthStatus === "broken_url";

      await prisma.crawlerCandidate.update({
        where: { id: record.id },
        data: {
          originalUrl: urlResult.finalUrl ? link.url : null,
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
      let selectedRate: string | null = null;

      if (!isBroken && (urlResult.urlHealthStatus === "ok" || urlResult.urlHealthStatus === "redirected")) {
        const assessUrl = urlResult.finalUrl || link.url;
        const assessment = await assessContent(assessUrl, "minimum_wage", link.text || `${city} Minimum Wage`, city);

        const facts = assessment.actionableFacts as Record<string, unknown> | null;
        hasStructuredRule = !!(facts && facts.structuredRule);
        if (hasStructuredRule) {
          const rule = (facts!.structuredRule as any);
          selectedRate = rule.selectedRate?.amount || null;
        }

        let adjConf = 0.80;
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

      if (isBroken) {
        // Don't count broken refiner results
      }

      const icon = isBroken ? "✗" :
        hasStructuredRule ? "★" :
        assessmentStatus === "actionable" ? "☆" :
        assessmentStatus === "unsure" ? "?" : "·";

      console.log(`    ${icon} ${link.url.slice(0, 60)} | ${urlResult.urlHealthStatus} | ${assessmentStatus}${selectedRate ? ` | ${selectedRate}` : ""}`);

      results.push({
        city,
        url: link.url,
        urlHealth: urlResult.urlHealthStatus,
        contentAssessment: assessmentStatus,
        hasStructuredRule,
        selectedRate,
        confidence: hasStructuredRule ? 0.95 : 0.80,
        notes: `Score: ${link.score}`,
        method: "refiner",
      });

      created++;
    }
  }

  // Summary
  console.log(`\n\n═══ SUMMARY ═══`);
  console.log(`  Cities attempted: ${Object.keys(CITY_HOMEPAGES).length}`);
  console.log(`  Cities skipped (already covered): ${skipped}`);
  console.log(`  Candidates created: ${created}`);
  console.log(`  With structured rule: ${results.filter(r => r.hasStructuredRule).length}`);
  console.log(`  Actionable: ${results.filter(r => r.contentAssessment === "actionable").length}`);
  console.log(`  No links found: ${results.filter(r => r.notes.includes("No minimum wage links")).length}`);
  console.log(`  LawSources (unchanged): ${await prisma.lawSource.count()}`);

  console.log(`\n═══ CITIES WITH STRUCTURED RULES ═══`);
  for (const r of results.filter(r => r.hasStructuredRule)) {
    console.log(`  ★ ${r.city}: ${r.selectedRate} — ${r.url.slice(0, 55)}`);
  }

  console.log(`\n═══ CITIES WITH NO SOURCE FOUND ═══`);
  const noSource = results.filter(r => r.notes.includes("No minimum wage links") || r.notes.includes("Refiner failed"));
  for (const r of noSource) {
    console.log(`  · ${r.city}: ${r.notes}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
