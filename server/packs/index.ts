/**
 * Rule pack API (Engine A)
 *
 *   POST /api/packs/build   body: BusinessProfile (+ optional asOf)  -> { packs: RulePack[] }
 *   GET  /api/packs/sample  packs for data/profiles/sample-retail-chain.json
 *   GET  /api/packs/sample/:locationId   one sample pack
 */

import { Router } from "express";
import { readJsonFile } from "../reference/dataFiles.js";
import { buildRulePack, buildRulePacks, validateBusinessProfile } from "./buildRulePack.js";
import type { BusinessProfile } from "./types.js";

export const packsRouter = Router();

export const SAMPLE_PROFILE: BusinessProfile = readJsonFile<BusinessProfile>("profiles/sample-retail-chain.json");

packsRouter.post("/build", (req, res) => {
  const { asOf, ...profile } = (req.body ?? {}) as BusinessProfile & { asOf?: string };
  const errors = validateBusinessProfile(profile);
  if (asOf !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) errors.push({ path: "asOf", message: "asOf must be an ISO date (YYYY-MM-DD)" });
  if (errors.length) {
    res.status(400).json({ error: "Invalid business profile", errors });
    return;
  }
  const packs = buildRulePacks(profile, { asOf });
  res.json({ business: profile.name, packs });
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
