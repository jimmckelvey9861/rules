// Scrapes the DOL state minimum wage page.
// Returns a map of state code -> wage string (e.g. "16.90")

const DOL_URL = "https://www.dol.gov/agencies/whd/minimum-wage/state";

export interface DolEntry {
  stateCode: string;
  wage: string; // numeric string like "16.90", or "" if no state minimum
}

export async function scrapeDol(): Promise<Map<string, DolEntry>> {
  const res = await fetch(DOL_URL);
  if (!res.ok) throw new Error(`DOL fetch failed: ${res.status}`);
  const html = await res.text();

  // The page embeds JS objects like: { State: "CA", Wage: "$16.90", Type: "...", FootNote: "..." }
  const pattern = /\{\s*State:\s*"([^"]+)",\s*Wage:\s*"([^"]*)",\s*Type:\s*"([^"]*)",\s*FootNote:\s*"[^"]*"\s*\}/g;
  const map = new Map<string, DolEntry>();

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const stateCode = match[1];
    const wageRaw = match[2]; // e.g. "$16.90" or ""
    const wage = wageRaw.replace(/^\$/, "").trim();
    map.set(stateCode, { stateCode, wage });
  }

  if (map.size === 0) {
    throw new Error("DOL scrape returned 0 entries — page format may have changed");
  }

  return map;
}
