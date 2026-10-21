/**
 * Build rule packs for a business profile and write one JSON file per location.
 *
 * Usage:
 *   npm run build-packs -- [profile.json] [outDir] [--as-of YYYY-MM-DD]
 *
 * Defaults: data/profiles/sample-retail-chain.json -> examples/packs/
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DATA_DIR } from "../server/reference/dataFiles.js";
import { buildRulePacks, validateBusinessProfile } from "../server/packs/buildRulePack.js";
import type { BusinessProfile } from "../server/packs/types.js";

const args = process.argv.slice(2);
const asOfIdx = args.indexOf("--as-of");
const asOf = asOfIdx >= 0 ? args.splice(asOfIdx, 2)[1] : undefined;
const profilePath = resolve(args[0] ?? join(DATA_DIR, "profiles", "sample-retail-chain.json"));
const outDir = resolve(args[1] ?? join(DATA_DIR, "..", "examples", "packs"));

const profile = JSON.parse(readFileSync(profilePath, "utf8")) as BusinessProfile;
const errors = validateBusinessProfile(profile);
if (errors.length) {
  console.error("Invalid business profile:");
  for (const e of errors) console.error(`  ${e.path}: ${e.message}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const packs = buildRulePacks(profile, { asOf });
for (const pack of packs) {
  const file = join(outDir, `${pack.location.id}.json`);
  writeFileSync(file, JSON.stringify(pack, null, 2) + "\n");
  const s = pack.stats;
  console.log(`${pack.location.name}: ${s.rulesIncluded} rules (${s.fullyResolved} fully resolved, ${s.excludedByProfile} excluded by profile) -> ${file}`);
}
