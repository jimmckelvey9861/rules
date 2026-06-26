/**
 * Deterministic candidate ranking for a single matrix cell.
 *
 * Given a list of CrawlerCandidate records for one jurisdiction+category,
 * returns them sorted best-first. The first item is the "primary" candidate.
 */

interface RankableCandidate {
  id: string;
  contentAssessmentStatus: string;
  urlHealthStatus: string;
  sourceAuthority: string | null;
  confidence: number | null;
  sourceUrl: string;
  contentType: string | null;
  status: string; // new, promoted, rejected
}

export function rankCandidates<T extends RankableCandidate>(candidates: T[]): T[] {
  // Filter out rejected candidates
  const active = candidates.filter((c) => c.status !== "rejected");

  return active.sort((a, b) => {
    // 1. Content assessment: actionable > unsure > unchecked > not_actionable
    const contentOrder: Record<string, number> = {
      actionable: 4,
      unsure: 3,
      unchecked: 2,
      not_actionable: 1,
      error: 0,
    };
    const aDiff = (contentOrder[a.contentAssessmentStatus] ?? 0) - (contentOrder[b.contentAssessmentStatus] ?? 0);
    if (aDiff !== 0) return -aDiff; // higher is better

    // 2. URL health: ok > redirected > manual_review > unchecked > error > broken
    const healthOrder: Record<string, number> = {
      ok: 5,
      redirected: 4,
      manual_review: 3,
      unchecked: 2,
      error: 1,
      broken_url: 0,
    };
    const hDiff = (healthOrder[a.urlHealthStatus] ?? 0) - (healthOrder[b.urlHealthStatus] ?? 0);
    if (hDiff !== 0) return -hDiff;

    // 3. Official government source (domain check)
    const aGov = isGovDomain(a.sourceUrl) ? 1 : 0;
    const bGov = isGovDomain(b.sourceUrl) ? 1 : 0;
    if (aGov !== bGov) return bGov - aGov;

    // 4. Higher confidence
    const aConf = a.confidence ?? 0;
    const bConf = b.confidence ?? 0;
    if (aConf !== bConf) return bConf - aConf;

    // 5. HTML over PDF
    const aHtml = a.contentType?.includes("html") ? 1 : 0;
    const bHtml = b.contentType?.includes("html") ? 1 : 0;
    if (aHtml !== bHtml) return bHtml - aHtml;

    return 0;
  });
}

function isGovDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".gov") || host.endsWith(".gov.us");
  } catch {
    return false;
  }
}
