/**
 * Rule pack API (Engine A)
 *
 *   POST /api/packs/build   body: BusinessProfile (+ optional asOf, horizonDays)  -> { packs: RulePack[] }
 *   POST /api/packs/diff    body: { from: RulePack, to: RulePack }  -> PackDiff (what changed for one location)
 *   GET  /api/packs/sample  packs for data/profiles/sample-retail-chain.json
 *   GET  /api/packs/sample/:locationId   one sample pack
 */

import { Router } from "express";
import { readJsonFile } from "../reference/dataFiles.js";
import { buildRulePack, buildRulePacks, validateBusinessProfile } from "./buildRulePack.js";
import { diffRulePacks } from "./diffRulePack.js";
import type { BusinessProfile, RulePack } from "./types.js";

export { diffRulePacks, formatPackDiff } from "./diffRulePack.js";
export type { PackDiff } from "./diffRulePack.js";

export const packsRouter = Router();

export const SAMPLE_PROFILE: BusinessProfile = readJsonFile<BusinessProfile>("profiles/sample-retail-chain.json");

packsRouter.post("/build", (req, res) => {
  const { asOf, horizonDays, ...profile } = (req.body ?? {}) as BusinessProfile & { asOf?: string; horizonDays?: number };
  const errors = validateBusinessProfile(profile);
  if (asOf !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) errors.push({ path: "asOf", message: "asOf must be an ISO date (YYYY-MM-DD)" });
  if (horizonDays !== undefined && !(Number.isInteger(horizonDays) && horizonDays >= 0)) errors.push({ path: "horizonDays", message: "horizonDays must be a whole number of days" });
  if (errors.length) {
    res.status(400).json({ error: "Invalid business profile", errors });
    return;
  }
  const packs = buildRulePacks(profile, { asOf, horizonDays });
  res.json({ business: profile.name, packs });
});

packsRouter.post("/diff", (req, res) => {
  const { from, to } = (req.body ?? {}) as { from?: RulePack; to?: RulePack };
  const isPack = (p: unknown): p is RulePack => !!p && typeof p === "object" && Array.isArray((p as RulePack).rules) && typeof (p as RulePack).asOf === "string" && !!(p as RulePack).location?.id;
  if (!isPack(from) || !isPack(to)) {
    res.status(400).json({ error: "Body must be { from: RulePack, to: RulePack }" });
    return;
  }
  try {
    res.json(diffRulePacks(from, to));
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

packsRouter.get("/sample", (_req, res) => {
  const packs = buildRulePacks(SAMPLE_PROFILE);
  res.json({
    business: SAMPLE_PROFILE.name,
    locations: packs.map(p => ({ id: p.location.id, name: p.location.name, rules: p.stats.rulesIncluded, checksum: p.checksum })),
  });
});

packsRouter.get("/sample/:locationId", (req, res) => {
  const loc = SAMPLE_PROFILE.locations.find(l => l.id === req.params.locationId);
  if (!loc) {
    res.status(404).json({ error: `Location "${req.params.locationId}" not in the sample profile` });
    return;
  }
  res.json(buildRulePack(SAMPLE_PROFILE, loc));
});
