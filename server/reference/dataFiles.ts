/**
 * Locates and reads the JSON data files under /data.
 *
 * All reference data (taxonomy, jurisdictions) and all rules live there as
 * plain JSON so they can be queried, transformed and exported without
 * touching TypeScript source.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the repository's /data directory. */
export const DATA_DIR = join(HERE, "..", "..", "data");

export function readJsonFile<T>(relativePath: string): T {
  const text = readFileSync(join(DATA_DIR, relativePath), "utf8");
  return JSON.parse(text) as T;
}

/** Lists the *.json files in a /data sub-directory, sorted for determinism. */
export function listJsonFiles(relativeDir: string): string[] {
  return readdirSync(join(DATA_DIR, relativeDir))
    .filter(f => f.endsWith(".json"))
    .sort()
    .map(f => join(relativeDir, f));
}
