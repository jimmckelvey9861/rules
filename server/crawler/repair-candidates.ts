/**
 * Attempt safe URL repairs for broken/error/manual_review candidates.
 *
 * Strategies:
 * 1. If finalUrl exists, re-check finalUrl
 * 2. Normalize duplicate slashes / encoding issues
 * 3. Try https if http
 * 4. Try parent directory if path is 404
 * 5. Check if domain is reachable (path missing)
 *
 * Usage:
 *   npm run repair:candidates
 *   npm run repair:candidates -- --limit 10
 *   npm run repair:candidates -- --all
 *   npm run repair:candidates -- --dry-run
 */

import { PrismaClient } from "@prisma/client";
import { checkUrl } from "./url-checker.js";

const prisma = new PrismaClient();

const limitArg = process.argv.find((a) => a.startsWith("--limit"));
const all = process.argv.includes("--all");
const dryRun = process.argv.includes("--dry-run");
const LIMIT = all ? 1000 : (limitArg ? parseInt(limitArg.split("=")[1] || process.argv[process.argv.indexOf(limitArg) + 1] || "25") : 25);

function normalizeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Fix double slashes in path
    u.pathname = u.pathname.replace(/\/\/+/g, "/");
    // Remove trailing slash if path has content
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    const normalized = u.toString();
    return normalized !== url ? normalized : null;
  } catch {
    return null;
  }
}

function httpsVariant(url: string): string | null {
  if (url.startsWith("http://")) {
    return url.replace("http://", "https://");
  }
  return null;
}

function parentPath(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length <= 1) return null;
    parts.pop();
    u.pathname = "/" + parts.join("/");
    return u.toString();
  } catch {
    return null;
  }
}

function domainOnly(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.pathname === "/" || u.pathname === "") return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function tryRepair(candidateUrl: string): Promise<{ repairedUrl: string; result: Awaited<ReturnType<typeof checkUrl>> } | null> {
  // Strategy 1: Normalize URL
  const normalized = normalizeUrl(candidateUrl);
  if (normalized) {
    const result = await checkUrl(normalized);
    if (result.urlHealthStatus === "ok" || result.urlHealthStatus === "redirected") {
      return { repairedUrl: normalized, result };
    }
  }

  // Strategy 2: Try HTTPS
  const https = httpsVariant(candidateUrl);
  if (https) {
    const result = await checkUrl(https);
    if (result.urlHealthStatus === "ok" || result.urlHealthStatus === "redirected") {
      return { repairedUrl: https, result };
    }
  }

  // Strategy 3: Try parent path
  const parent = parentPath(candidateUrl);
  if (parent) {
    const result = await checkUrl(parent);
    if (result.urlHealthStatus === "ok" || result.urlHealthStatus === "redirected") {
      return { repairedUrl: parent, result };
    }
  }

  return null;
}

async function main() {
  const candidates = await prisma.crawlerCandidate.findMany({
    where: { urlHealthStatus: { in: ["broken_url", "error", "manual_review"] } },
    take: LIMIT,
    orderBy: { createdAt: "asc" },
  });

  console.log(`Attempting repairs on ${candidates.length} candidates (limit: ${LIMIT}, dry-run: ${dryRun})...\n`);

  let repaired = 0, domainReachable = 0, unrepairable = 0;

  for (const c of candidates) {
    process.stdout.write(`  ${c.sourceUrl.slice(0, 70)}... `);

    // If finalUrl exists and is different, try that first
    if (c.finalUrl && c.finalUrl !== c.sourceUrl) {
      const result = await checkUrl(c.finalUrl);
      if (result.urlHealthStatus === "ok" || result.urlHealthStatus === "redirected") {
        if (!dryRun) {
          await prisma.crawlerCandidate.update({
            where: { id: c.id },
            data: {
              repairedFromUrl: c.sourceUrl,
              sourceUrl: c.finalUrl,
              originalUrl: c.sourceUrl,
              finalUrl: result.finalUrl,
              httpStatus: result.httpStatus,
              urlHealthStatus: result.urlHealthStatus,
              checkedAt: result.checkedAt,
              lastError: null,
              failureReason: result.failureReason,
              checkedMethod: result.checkedMethod,
              contentType: result.contentType,
              contentLength: result.contentLength,
              retryCount: { increment: 1 },
              notes: (c.notes || "") + ` | Repaired: used finalUrl ${c.finalUrl}`,
            },
          });
        }
        console.log(`✓ repaired (used finalUrl)`);
        repaired++;
        continue;
      }
    }

    // Try repair strategies
    const repair = await tryRepair(c.sourceUrl);
    if (repair) {
      if (!dryRun) {
        await prisma.crawlerCandidate.update({
          where: { id: c.id },
          data: {
            repairedFromUrl: c.sourceUrl,
            sourceUrl: repair.repairedUrl,
            originalUrl: c.sourceUrl,
            finalUrl: repair.result.finalUrl,
            httpStatus: repair.result.httpStatus,
            urlHealthStatus: repair.result.urlHealthStatus,
            checkedAt: repair.result.checkedAt,
            lastError: null,
            failureReason: repair.result.failureReason,
            checkedMethod: repair.result.checkedMethod,
            contentType: repair.result.contentType,
            contentLength: repair.result.contentLength,
            retryCount: { increment: 1 },
            notes: (c.notes || "") + ` | Repaired: ${c.sourceUrl} → ${repair.repairedUrl}`,
          },
        });
      }
      console.log(`✓ repaired → ${repair.repairedUrl.slice(0, 50)}`);
      repaired++;
      continue;
    }

    // Check if domain is reachable
    const domain = domainOnly(c.sourceUrl);
    if (domain) {
      const domainResult = await checkUrl(domain);
      if (domainResult.urlHealthStatus === "ok" || domainResult.urlHealthStatus === "redirected") {
        if (!dryRun) {
          await prisma.crawlerCandidate.update({
            where: { id: c.id },
            data: {
              retryCount: { increment: 1 },
              notes: (c.notes || "") + ` | Domain reachable (${domain}), path missing.`,
            },
          });
        }
        console.log(`~ domain reachable, path missing`);
        domainReachable++;
        continue;
      }
    }

    // Unrepairable
    if (!dryRun) {
      await prisma.crawlerCandidate.update({
        where: { id: c.id },
        data: { retryCount: { increment: 1 } },
      });
    }
    console.log(`✗ unrepairable`);
    unrepairable++;
  }

  console.log(`\nDone. Repaired: ${repaired}, Domain reachable: ${domainReachable}, Unrepairable: ${unrepairable}`);
  if (dryRun) console.log("(dry-run — no changes written)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
