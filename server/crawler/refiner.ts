/**
 * Shallow same-domain link refinement.
 *
 * Given a broad official page URL and a topic, fetches the page HTML,
 * extracts same-domain links, scores them by topic relevance, and
 * returns the top candidates.
 *
 * Limits:
 * - Inspects at most 50 links from a page
 * - Returns at most 5 refined candidates
 * - Depth = 1 only (no recursion)
 */

const TIMEOUT_MS = 8000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const MAX_LINKS_TO_INSPECT = 50;
const MAX_REFINED_RESULTS = 5;

// Topic keyword maps — terms that boost relevance for each topic
const TOPIC_KEYWORDS: Record<string, string[]> = {
  minimum_wage: ["minimum wage", "minimum-wage", "citywide minimum", "wage rate", "wage order", "hourly wage", "wage standard", "living wage"],
  overtime: ["overtime", "over time", "hours worked", "time and a half", "weekly hours"],
  overtime_pay: ["overtime", "overtime pay", "hours worked"],
  meal_break: ["meal break", "meal period", "lunch break", "rest period", "break time"],
  rest_break: ["rest break", "rest period", "break requirement"],
  paid_sick_leave: ["sick leave", "paid sick", "sick time", "earned sick", "safe time"],
  predictive_scheduling: ["predictive scheduling", "fair workweek", "secure scheduling", "advance notice", "schedule change"],
  child_labor: ["child labor", "minor employment", "youth employment", "work permit", "teen worker"],
  wage_hour: ["wage", "hour", "labor standards", "wage and hour", "compensation"],
  family_leave: ["family leave", "medical leave", "fmla", "parental leave", "family medical"],
};

// Generic terms that always boost
const GENERIC_BOOST: string[] = ["labor", "worker", "employment", "employer", "ordinance", "law", "regulation", "compliance", "standard"];

// Terms that penalize a link
const PENALTY_TERMS: string[] = [
  "contact", "news", "press", "calendar", "events", "social", "login", "search",
  "careers", "jobs", "directory", "departments", "about-us", "about", "faq",
  "subscribe", "newsletter", "donate", "volunteer", "accessibility", "privacy",
  "terms-of-use", "sitemap", "translate", "language", "español", "archive",
  "meeting", "agenda", "minutes", "board", "council", "election", "vote",
];

export interface RefinedLink {
  url: string;
  text: string;
  score: number;
  matchedTerms: string[];
}

export async function refineLinks(
  parentUrl: string,
  topic: string | undefined
): Promise<RefinedLink[]> {
  // Fetch the page
  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(parentUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*",
      },
    });
    clearTimeout(timer);

    if (!res.ok) return [];
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("html")) return [];

    html = await res.text();
  } catch {
    return [];
  }

  // Parse hostname for same-domain filtering
  let parentHostname: string;
  try {
    parentHostname = new URL(parentUrl).hostname;
  } catch {
    return [];
  }

  // Extract links using two strategies:
  // 1. Full <a>...</a> pairs for link text
  // 2. href-only scan for links inside complex wrappers (cards, panels)
  const links: { url: string; text: string }[] = [];

  // Strategy 1: Full anchor tags (handles simple links)
  const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1].trim();
    const rawText = match[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    addLink(href, rawText);
  }

  // Strategy 2: href-only scan — catches links wrapping complex HTML (cards with images, h2, etc.)
  // Also grab nearby heading text for better scoring
  const hrefOnlyRegex = /<a\s[^>]*href=["']([^"'#]+)["']/gi;
  const headingNearLink = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>[\s\S]*?<(?:h[1-6]|span|div)[^>]*>([^<]+)/gi;

  while ((match = headingNearLink.exec(html)) !== null) {
    addLink(match[1].trim(), match[2].trim());
  }

  // Also scan for href patterns we might have missed
  const simpleHrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
  while ((match = simpleHrefRegex.exec(html)) !== null) {
    addLink(match[1].trim(), "");
  }

  function addLink(href: string, text: string) {
    // Skip non-http, mailto, tel, javascript, anchors
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href === "#") return;
    if (href.startsWith("#")) return;

    // Resolve relative URLs
    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, parentUrl).toString();
    } catch {
      return;
    }

    // Same domain only
    try {
      const linkHost = new URL(absoluteUrl).hostname;
      if (linkHost !== parentHostname) return;
    } catch {
      return;
    }

    // Skip if same as parent
    if (absoluteUrl === parentUrl || absoluteUrl === parentUrl + "/") return;

    // Skip file extensions that aren't pages
    const path = new URL(absoluteUrl).pathname.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|svg|css|js|ico|woff|woff2|mp4|mp3)$/.test(path)) return;

    links.push({ url: absoluteUrl, text: text || "" });
  }

  // Deduplicate by URL (keep all unique links — scoring will filter)
  const seen = new Set<string>();
  const uniqueLinks = links.filter((l) => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });

  // Score each link
  const topicTerms = topic ? (TOPIC_KEYWORDS[topic] || []) : [];
  const scored: RefinedLink[] = [];

  for (const link of uniqueLinks) {
    // Normalize URL path for matching (replace hyphens/underscores with spaces)
    const urlPath = new URL(link.url).pathname.replace(/[-_]/g, " ").toLowerCase();
    const textLower = link.text.toLowerCase();
    const combined = textLower + " " + urlPath;
    let score = 0;
    const matchedTerms: string[] = [];

    // Topic-specific boosts (high value)
    for (const term of topicTerms) {
      const termLower = term.toLowerCase();
      if (combined.includes(termLower)) {
        // Extra boost if term is in the URL path (very strong signal)
        if (urlPath.includes(termLower)) {
          score += 15;
          matchedTerms.push(`${term} [in URL]`);
        } else {
          score += 10;
          matchedTerms.push(term);
        }
      }
    }

    // Generic boosts (lower value)
    for (const term of GENERIC_BOOST) {
      if (combined.includes(term)) {
        score += 2;
        matchedTerms.push(term);
      }
    }

    // Penalties
    for (const term of PENALTY_TERMS) {
      if (combined.includes(term)) {
        score -= 5;
      }
    }

    // Bonus: URL is a child path of the parent URL (strong signal for subpages)
    try {
      const parentPath = new URL(parentUrl).pathname;
      const linkPath = new URL(link.url).pathname;
      if (linkPath.startsWith(parentPath) && linkPath !== parentPath) {
        score += 5;
        matchedTerms.push("child-path");
      }
    } catch {}

    // Bonus for reasonable path depth
    try {
      const pathParts = new URL(link.url).pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2 && pathParts.length <= 6) score += 1;
    } catch {}

    // Only keep links with positive score
    if (score > 0) {
      scored.push({ url: link.url, text: link.text, score, matchedTerms });
    }
  }

  // Sort by score descending, return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_REFINED_RESULTS);
}
