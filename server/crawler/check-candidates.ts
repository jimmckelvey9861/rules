/**
 * Check URL health for unchecked CrawlerCandidate records.
 *
 * Usage:
 *   npm run check:candidates
 *   npm run check:candidates -- --limit 10
 *   npm run check:candidates -- --all
 *   npm run check:candidates -- --recheck   (re-check broken/error/manual_review)
 */

import { PrismaClient } from "@prisma/client";
import { checkUrl } from "./url-checker.js";

const prisma = new PrismaClient();

const limitArg = process.argv.find((a) => a.startsWith("--limit"));
const all = process.argv.includes("--all");
const recheck = process.argv.includes("--recheck");
const LIMIT = all ? 1000 : (limitArg ? parseInt(limitArg.split("=")[1] || process.argv[process.argv.indexOf(limitArg) + 1] || "25") : 25);

async function main() {
  const where = recheck
    ? { urlHealthStatus: { in: ["unchecked", "broken_url", "error", "manual_review"] } }
    : { urlHealthStatus: "unchecked" };

  const candidates = await prisma.crawlerCandidate.findMany({
    where,
    take: LIMIT,
    orderBy: { createdAt: "asc" },
  });

  console.log(`Checking ${candidates.length} candidate URLs (limit: ${LIMIT}, recheck: ${recheck})...`);

  let ok = 0, redirected = 0, broken = 0, review = 0, error = 0;

  for (const candidate of candidates) {
    const result = await checkUrl(candidate.sourceUrl);

    await prisma.crawlerCandidate.update({
      where: { id: candidate.id },
      data: {
        originalUrl: result.finalUrl ? candidate.sourceUrl : null,
        finalUrl: result.finalUrl,
        httpStatus: result.httpStatus,
        urlHealthStatus: result.urlHealthStatus,
        checkedAt: result.checkedAt,
        lastError: result.lastError,
        failureReason: result.failureReason,
        checkedMethod: result.checkedMethod,
        contentType: result.contentType,
        contentLength: result.contentLength,
        retryCount: { increment: 1 },
      },
    });

    const icon =
      result.urlHealthStatus === "ok" ? "✓" :
      result.urlHealthStatus === "redirected" ? "→" :
      result.urlHealthStatus === "broken_url" ? "✗" :
      result.urlHealthStatus === "manual_review" ? "?" : "!";

    const extra = result.failureReason ? ` (${result.failureReason})` : "";
    console.log(`  ${icon} [${result.httpStatus || "ERR"}] ${candidate.sourceUrl.slice(0, 80)}${extra}`);

    if (result.urlHealthStatus === "ok") ok++;
    else if (result.urlHealthStatus === "redirected") redirected++;
    else if (result.urlHealthStatus === "broken_url") broken++;
    else if (result.urlHealthStatus === "manual_review") review++;
    else error++;
  }

  console.log(`\nDone. Results: ${ok} ok, ${redirected} redirected, ${broken} broken, ${review} manual_review, ${error} error`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
