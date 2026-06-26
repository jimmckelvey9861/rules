/**
 * Print grouped health summary of all CrawlerCandidate records.
 *
 * Usage:
 *   npm run health:candidates
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.crawlerCandidate.findMany({
    select: {
      urlHealthStatus: true,
      httpStatus: true,
      failureReason: true,
      contentType: true,
      sourceAuthority: true,
    },
  });

  const byHealth: Record<string, number> = {};
  const byHttp: Record<string, number> = {};
  const byFailure: Record<string, number> = {};
  const byContent: Record<string, number> = {};
  const byAuthority: Record<string, number> = {};

  for (const c of candidates) {
    byHealth[c.urlHealthStatus] = (byHealth[c.urlHealthStatus] || 0) + 1;
    if (c.httpStatus) byHttp[String(c.httpStatus)] = (byHttp[String(c.httpStatus)] || 0) + 1;
    if (c.failureReason) byFailure[c.failureReason] = (byFailure[c.failureReason] || 0) + 1;
    if (c.contentType) byContent[c.contentType] = (byContent[c.contentType] || 0) + 1;
    if (c.sourceAuthority) byAuthority[c.sourceAuthority] = (byAuthority[c.sourceAuthority] || 0) + 1;
  }

  console.log(`\n=== Candidate Health Summary (${candidates.length} total) ===\n`);

  console.log("By URL Health Status:");
  for (const [k, v] of Object.entries(byHealth).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(16)} ${v}`);
  }

  if (Object.keys(byHttp).length > 0) {
    console.log("\nBy HTTP Status:");
    for (const [k, v] of Object.entries(byHttp).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(16)} ${v}`);
    }
  }

  if (Object.keys(byFailure).length > 0) {
    console.log("\nBy Failure Reason:");
    for (const [k, v] of Object.entries(byFailure).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(20)} ${v}`);
    }
  }

  if (Object.keys(byContent).length > 0) {
    console.log("\nBy Content Type:");
    for (const [k, v] of Object.entries(byContent).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(30)} ${v}`);
    }
  }

  if (Object.keys(byAuthority).length > 0) {
    console.log("\nBy Source Authority (top 10):");
    const sorted = Object.entries(byAuthority).sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [k, v] of sorted) {
      console.log(`  ${k.slice(0, 50).padEnd(52)} ${v}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
