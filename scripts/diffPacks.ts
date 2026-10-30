/**
 * Show what changed between two rule packs for the same location.
 *
 * Usage:
 *   npm run diff-packs -- previous.json next.json [--json]
 *
 * Exit code 0 when the packs hold the same rules, 1 when anything was added,
 * removed or changed, 2 on a usage error.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { diffRulePacks, formatPackDiff } from "../server/packs/diffRulePack.js";
import type { RulePack } from "../server/packs/types.js";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const files = args.filter(a => a !== "--json");
if (files.length !== 2) {
  console.error("Usage: npm run diff-packs -- previous.json next.json [--json]");
  process.exit(2);
}

const [from, to] = files.map(f => JSON.parse(readFileSync(resolve(f), "utf8")) as RulePack);
const diff = diffRulePacks(from, to);
console.log(asJson ? JSON.stringify(diff, null, 2) : formatPackDiff(diff));
process.exit(diff.summary.added + diff.summary.removed + diff.summary.changed > 0 ? 1 : 0);
