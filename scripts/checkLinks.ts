/**
 * Link checker — fetches every citation URL in data/rules, records the HTTP
 * status, the final URL after redirects and a hash of the page text, and
 * writes data/link-report.json.
 *
 * Each URL gets a verdict:
 *   ok       2xx response
 *   broken   404/410 or DNS failure: the page is gone and the citation needs a new URL
 *   blocked  403/429/5xx, timeout or TLS error: the host refused or failed for an
 *            automated client, so the page could not be verified but is probably fine.
 *            Several state legislature sites (leginfo.legislature.ca.gov,
 *            cdle.colorado.gov, law.justia.com, ...) block bots this way.
 *
 * Comparing against the previous report flags links that newly broke and
 * pages whose text changed (a changed statute page usually means a changed
 * law, so this doubles as a change detector).
 *
 * Usage:
 *   npm run check-links            # write the report, exit 0
 *   npm run check-links -- --strict # also exit 1 if any link is *broken* (blocked does not fail)
 *
 * Needs outbound HTTPS. Runs under node 22+ or bun (global fetch).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { DATA_DIR, listJsonFiles } from "../server/reference/dataFiles.js";
import type { Citation } from "../server/rules/types.js";

const REPORT_PATH = join(DATA_DIR, "link-report.json");
const CONCURRENCY = 8;
const TIMEOUT_MS = 25_000;
const USER_AGENT = "rules-engine-link-checker/1.0 (+https://github.com/jimmckelvey9861/rules)";

export type LinkVerdict = "ok" | "broken" | "blocked";

export interface LinkCheck {
  url: string;
  verdict: LinkVerdict;
  /** rule ids that cite this URL */
  rules: string[];
  status: number | null;
  ok: boolean;
  finalUrl: string | null;
  redirected: boolean;
  contentHash: string | null;
  contentType: string | null;
  error: string | null;
  checkedAt: string;
  /** true when the verdict was not "broken" in the previous report and is "broken" now */
  newlyBroken: boolean;
  /** true when the page text hash differs from the previous report */
  changed: boolean;
}

export interface LinkReport {
  generatedAt: string;
  totalUrls: number;
  broken: number;
  blocked: number;
  newlyBroken: number;
  changed: number;
  links: LinkCheck[];
}

interface RulesFile { rules: { id: string; citations: Citation[] }[] }

function collectUrls(): Map<string, string[]> {
  const byUrl = new Map<string, string[]>();
  for (const file of listJsonFiles("rules")) {
    const parsed = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8")) as RulesFile;
    for (const rule of parsed.rules) {
      for (const c of rule.citations) {
        if (!c.url) continue;
        if (!byUrl.has(c.url)) byUrl.set(c.url, []);
        byUrl.get(c.url)!.push(rule.id);
      }
    }
  }
  return byUrl;
}

/** Strip tags, scripts and whitespace so trivial markup changes do not count as content changes. */
function textHash(html: string): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(text).digest("hex");
}

const BROKEN_STATUSES = new Set([404, 410]);
const DNS_ERROR = /ENOTFOUND|EAI_AGAIN|getaddrinfo|Unable to connect|ConnectionRefused|ECONNREFUSED/i;

function classify(status: number | null, error: string | null): LinkVerdict {
  if (status !== null && status >= 200 && status < 300) return "ok";
  if (status !== null && BROKEN_STATUSES.has(status)) return "broken";
  if (status === null && error && DNS_ERROR.test(error)) return "broken";
  return "blocked";
}

async function checkOne(url: string, rules: string[], previous?: LinkCheck): Promise<LinkCheck> {
  const checkedAt = new Date().toISOString();
  const base: LinkCheck = {
    url, rules, verdict: "blocked", status: null, ok: false, finalUrl: null, redirected: false, contentHash: null,
    contentType: null, error: null, checkedAt, newlyBroken: false, changed: false,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8" },
    });
    base.status = res.status;
    base.ok = res.ok;
    base.finalUrl = res.url || url;
    base.redirected = res.redirected || base.finalUrl !== url;
    base.contentType = res.headers.get("content-type");
    if (res.ok) {
      const isText = (base.contentType ?? "").startsWith("text/");
      const body = isText ? await res.text() : Buffer.from(await res.arrayBuffer()).toString("binary");
      base.contentHash = isText ? textHash(body) : createHash("sha256").update(body).digest("hex");
    }
  } catch (e: any) {
    base.error = e?.name === "AbortError" ? `timeout after ${TIMEOUT_MS} ms` : String(e?.message ?? e);
  } finally {
    clearTimeout(timer);
  }
  base.verdict = classify(base.status, base.error);
  if (previous) {
    base.newlyBroken = previous.verdict !== "broken" && base.verdict === "broken";
    base.changed = Boolean(previous.contentHash && base.contentHash && previous.contentHash !== base.contentHash);
  }
  return base;
}

async function main() {
  const strict = process.argv.includes("--strict");
  const byUrl = collectUrls();
  const previous: Map<string, LinkCheck> = new Map();
  if (existsSync(REPORT_PATH)) {
    const old = JSON.parse(readFileSync(REPORT_PATH, "utf8")) as LinkReport;
    for (const l of old.links) previous.set(l.url, l);
  }

  const urls = [...byUrl.keys()].sort();
  console.log(`Checking ${urls.length} URLs (${CONCURRENCY} at a time)...`);
  const results: LinkCheck[] = [];
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      const r = await checkOne(url, byUrl.get(url)!.sort(), previous.get(url));
      results.push(r);
      const mark = r.verdict === "ok" ? "ok  " : r.verdict === "broken" ? "GONE" : "blkd";
      console.log(`  ${mark} ${r.status ?? "---"} ${url}${r.error ? `  (${r.error})` : ""}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  results.sort((a, b) => a.url.localeCompare(b.url));

  const report: LinkReport = {
    generatedAt: new Date().toISOString(),
    totalUrls: results.length,
    broken: results.filter(r => r.verdict === "broken").length,
    blocked: results.filter(r => r.verdict === "blocked").length,
    newlyBroken: results.filter(r => r.newlyBroken).length,
    changed: results.filter(r => r.changed).length,
    links: results,
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");

  console.log(`\n${report.totalUrls} URLs: ${report.broken} broken (${report.newlyBroken} newly), ${report.blocked} blocked/unverified, ${report.changed} changed since last report.`);
  const broken = results.filter(r => r.verdict === "broken");
  const blocked = results.filter(r => r.verdict === "blocked");
  const describe = (b: LinkCheck) => `  ${b.status ?? "---"} ${b.url}  <- ${b.rules.join(", ")}${b.error ? `  (${b.error})` : ""}`;
  if (broken.length) {
    console.log("\nBroken (page gone, citation needs a new URL):");
    for (const b of broken) console.log(describe(b));
  }
  if (blocked.length) {
    console.log("\nBlocked / unverified (host refused an automated client):");
    for (const b of blocked) console.log(describe(b));
  }
  console.log(`\nReport written to ${REPORT_PATH}`);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const lines = [
      `## Citation link check`, ``,
      `| URLs | OK | Broken | Newly broken | Blocked / unverified | Content changed |`, `| --- | --- | --- | --- | --- | --- |`,
      `| ${report.totalUrls} | ${report.totalUrls - report.broken - report.blocked} | ${report.broken} | ${report.newlyBroken} | ${report.blocked} | ${report.changed} |`, ``,
    ];
    const table = (title: string, rows: LinkCheck[]) => {
      if (!rows.length) return;
      lines.push(`### ${title}`, ``, `| Status | URL | Rules |`, `| --- | --- | --- |`);
      for (const b of rows) lines.push(`| ${b.status ?? b.error ?? "error"} | ${b.url} | ${b.rules.join(", ")} |`);
      lines.push(``);
    };
    table("Broken links (page gone)", broken);
    table("Blocked / unverified (host refused an automated client)", blocked);
    writeFileSync(summaryPath, lines.join("\n") + "\n", { flag: "a" });
  }

  if (strict && broken.length) process.exit(1);
}

main();
