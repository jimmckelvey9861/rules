/**
 * Batch content assessment for crawler candidates.
 *
 * Usage:
 *   npm run assess:candidates
 *   npm run assess:candidates -- --limit 10
 *   npm run assess:candidates -- --all
 *   npm run assess:candidates -- --topic minimum_wage
 *   npm run assess:candidates -- --reassess
 */

import { PrismaClient } from "@prisma/client";
import { assessContent } from "./content-assessor.js";

const prisma = new PrismaClient();

const limitArg = process.argv.find((a) => a.startsWith("--limit"));
const all = process.argv.includes("--all");
const reassess = process.argv.includes("--reassess");
const LIMIT = all ? 1000 : (limitArg ? parseInt(limitArg.split("=")[1] || process.argv[process.argv.indexOf(limitArg) + 1] || "25") : 25);

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const topicFilter = arg("topic");

// Category name → topic mapping
function categoryToTopic(catName: string | null | undefined): string | undefined {
  if (!catName) return undefined;
  const lower = catName.toLowerCase();
  if (lower.includes("minimum wage")) return "minimum_wage";
  if (lower.includes("overtime")) return "overtime";
  if (lower.includes("sick leave")) return "paid_sick_leave";
  if (lower.includes("scheduling") || lower.includes("predictive") || lower.includes("advance")) return "predictive_scheduling";
  if (lower.includes("meal") || lower.includes("break")) return "meal_break";
  return undefined;
}

async function main() {
  // Build where clause
  const where: any = {};

  // Only assess healthy URLs by default
  if (!all) {
    where.urlHealthStatus = { in: ["ok", "redirected"] };
  }

  // Only unchecked unless reassessing
  if (!reassess) {
    where.contentAssessmentStatus = "unchecked";
  }

  // Filter by status (don't assess rejected)
  where.status = { not: "rejected" };

  const candidates = await prisma.crawlerCandidate.findMany({
    where,
    take: LIMIT,
    orderBy: { confidence: "desc" },
    include: { guessedLawCategory: { select: { name: true } }, guessedJurisdiction: { select: { name: true } } },
  });

  console.log(`Assessing ${candidates.length} candidates (limit: ${LIMIT}, reassess: ${reassess})...\n`);

  let actionable = 0, notActionable = 0, unsure = 0, error = 0;

  for (const c of candidates) {
    const topic = topicFilter || categoryToTopic(c.guessedLawCategory?.name);
    const urlToCheck = c.finalUrl || c.sourceUrl;

    const result = await assessContent(urlToCheck, topic, c.title, c.guessedJurisdiction?.name);

    // Adjust confidence based on assessment
    let confidenceAdj = c.confidence || 0.5;
    if (result.status === "actionable") confidenceAdj = Math.min(0.95, confidenceAdj + 0.15);
    else if (result.status === "not_actionable") confidenceAdj = Math.max(0.1, confidenceAdj - 0.2);

    await prisma.crawlerCandidate.update({
      where: { id: c.id },
      data: {
        contentAssessmentStatus: result.status,
        contentAssessmentSummary: result.summary,
        actionableFacts: (result.actionableFacts as any) || undefined,
        assessedAt: result.assessedAt,
        confidence: parseFloat(confidenceAdj.toFixed(2)),
      },
    });

    const icon =
      result.status === "actionable" ? "★" :
      result.status === "not_actionable" ? "·" :
      result.status === "unsure" ? "?" : "!";

    console.log(`  ${icon} [${result.status}] ${c.sourceUrl.slice(0, 65)}`);
    if (result.summary) console.log(`    ${result.summary.slice(0, 100)}`);

    if (result.status === "actionable") actionable++;
    else if (result.status === "not_actionable") notActionable++;
    else if (result.status === "unsure") unsure++;
    else error++;
  }

  console.log(`\nDone. Results: ${actionable} actionable, ${notActionable} not_actionable, ${unsure} unsure, ${error} error`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
