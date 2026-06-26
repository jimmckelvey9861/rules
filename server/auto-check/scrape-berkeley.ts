// Scrapes the UC Berkeley Labor Center minimum wage inventory page.
// Returns a map of normalized locality name -> wage string (e.g. "18.31")

const BERKELEY_URL = "https://laborcenter.berkeley.edu/inventory-of-us-city-and-county-minimum-wage-ordinances/";

export interface BerkeleyEntry {
  locality: string;
  rate: string; // numeric string like "18.31"
  state?: string;
}

export async function scrapeBerkeley(): Promise<Map<string, BerkeleyEntry>> {
  const res = await fetch(BERKELEY_URL);
  if (!res.ok) throw new Error(`Berkeley fetch failed: ${res.status}`);
  const html = await res.text();

  const map = new Map<string, BerkeleyEntry>();

  // The California table has rows like: | Locality | Date | Rate | ...
  // Rate format: $17.46
  // We parse the markdown-style table from the rendered HTML text.
  // The table rows contain: locality name, date, rate ($XX.XX)
  // Pattern: look for table cells with locality and rate

  // Strategy: find all patterns of "locality ... $XX.XX" in the California table section
  // The HTML table has <td> cells. Let's extract from raw HTML.
  
  // Match table rows: <tr>...<td>Locality</td>...<td>$Rate</td>...</tr>
  // The table structure: Locality | Date | Rate | Small Employer | Links | Notes
  const tableSection = html.match(/California City and County Minimum Wages[\s\S]*?<\/table>/i);
  if (!tableSection) {
    // Fallback: try to find rate patterns anywhere
    return extractFromFullPage(html, map);
  }

  const tableHtml = tableSection[0];
  // Match rows with locality and rate
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => stripHtml(m[1]).trim());
    if (cells.length >= 3) {
      const locality = cells[0].replace(/\s*\(unincorporated\)/i, "").trim();
      const rateStr = cells[2]; // e.g. "$17.46"
      const rate = rateStr.replace(/^\$/, "").trim();
      if (locality && rate && /^\d+\.\d+$/.test(rate)) {
        const key = normalizeLocality(locality);
        map.set(key, { locality, rate, state: "CA" });
      }
    }
  }

  // Also extract non-California localities from the list section above the table.
  // These are listed as bold links but without explicit rates on the main page.
  // The Berkeley page only has rates for California in the table.
  // For non-CA localities, we won't have Berkeley data — that's fine (insufficient_data).

  if (map.size === 0) {
    return extractFromFullPage(html, map);
  }

  return map;
}

// Fallback: extract rate patterns from the full page text
function extractFromFullPage(html: string, map: Map<string, BerkeleyEntry>): Map<string, BerkeleyEntry> {
  // Look for patterns like "| Locality | date | $rate |" in text content
  const text = stripHtml(html);
  // Match lines from the markdown-style table: "| Alameda | 7/1/2025 | $17.46 |"
  const linePattern = /\|\s*([^|]+?)\s*\|\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\|\s*\$(\d+\.\d{2})\s*\|/g;
  let lineMatch: RegExpExecArray | null;
  while ((lineMatch = linePattern.exec(text)) !== null) {
    const locality = lineMatch[1].trim();
    const rate = lineMatch[2];
    if (locality && rate) {
      const key = normalizeLocality(locality);
      map.set(key, { locality, rate, state: "CA" });
    }
  }
  return map;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "");
}

export function normalizeLocality(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(unincorporated\)/i, "")
    .replace(/,\s*(ca|california)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
