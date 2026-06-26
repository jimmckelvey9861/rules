/**
 * URL health checker — validates candidate source URLs.
 *
 * Strategy:
 * - GET first (many .gov sites block HEAD)
 * - Browser-like User-Agent
 * - Follow redirects
 * - 5s timeout
 * - Accept text/html and application/pdf
 * - Record diagnostics: method, content-type, content-length, failure reason
 */

const TIMEOUT_MS = 5000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export type FailureReason =
  | "not_found"
  | "gone"
  | "forbidden"
  | "timeout"
  | "dns_error"
  | "ssl_error"
  | "connection_error"
  | "invalid_url"
  | "non_html"
  | "pdf"
  | "unknown_error"
  | null;

export interface UrlCheckResult {
  originalUrl: string;
  finalUrl: string | null;
  httpStatus: number | null;
  urlHealthStatus: "ok" | "redirected" | "broken_url" | "manual_review" | "error";
  lastError: string | null;
  failureReason: FailureReason;
  checkedMethod: "GET" | "HEAD" | "BOTH";
  contentType: string | null;
  contentLength: number | null;
  checkedAt: Date;
}

export async function checkUrl(url: string): Promise<UrlCheckResult> {
  const now = new Date();
  const base: UrlCheckResult = {
    originalUrl: url,
    finalUrl: null,
    httpStatus: null,
    urlHealthStatus: "error",
    lastError: null,
    failureReason: null,
    checkedMethod: "GET",
    contentType: null,
    contentLength: null,
    checkedAt: now,
  };

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    base.urlHealthStatus = "broken_url";
    base.failureReason = "invalid_url";
    base.lastError = "Invalid URL format";
    return base;
  }

  try {
    // GET first — many .gov sites block or mishandle HEAD
    const response = await fetchWithTimeout(url, "GET");
    base.checkedMethod = "GET";

    const status = response.status;
    const finalUrl = response.url !== url ? response.url : null;
    const ct = response.headers.get("content-type") || null;
    const cl = response.headers.get("content-length");

    base.httpStatus = status;
    base.finalUrl = finalUrl;
    base.contentType = ct ? ct.split(";")[0].trim().toLowerCase() : null;
    base.contentLength = cl ? parseInt(cl) : null;

    if (status >= 200 && status < 300) {
      // Check content type
      if (base.contentType === "application/pdf") {
        base.urlHealthStatus = finalUrl ? "redirected" : "ok";
        base.failureReason = "pdf"; // Not a failure, but notable
      } else {
        base.urlHealthStatus = finalUrl ? "redirected" : "ok";
      }
    } else if (status === 404) {
      base.urlHealthStatus = "broken_url";
      base.failureReason = "not_found";
      base.lastError = "HTTP 404 — page not found";
    } else if (status === 410) {
      base.urlHealthStatus = "broken_url";
      base.failureReason = "gone";
      base.lastError = "HTTP 410 — page permanently removed";
    } else if (status === 401 || status === 403) {
      base.urlHealthStatus = "manual_review";
      base.failureReason = "forbidden";
      base.lastError = `HTTP ${status} — access restricted`;
    } else if (status >= 500) {
      base.urlHealthStatus = "error";
      base.failureReason = "unknown_error";
      base.lastError = `HTTP ${status} — server error`;
    } else if (status >= 300 && status < 400) {
      // Redirect not followed (shouldn't happen with redirect: follow)
      base.urlHealthStatus = "redirected";
      base.finalUrl = response.headers.get("location") || null;
    } else {
      base.urlHealthStatus = "manual_review";
      base.failureReason = "unknown_error";
      base.lastError = `HTTP ${status}`;
    }
  } catch (err: any) {
    base.lastError = err.message || String(err);

    if (err.name === "AbortError" || err.message?.includes("timeout") || err.message?.includes("aborted")) {
      base.urlHealthStatus = "manual_review";
      base.failureReason = "timeout";
      base.lastError = "Timeout after 5s";
    } else if (err.message?.includes("ENOTFOUND") || err.message?.includes("getaddrinfo")) {
      base.urlHealthStatus = "broken_url";
      base.failureReason = "dns_error";
      base.lastError = "DNS resolution failed";
    } else if (
      err.message?.includes("certificate") ||
      err.message?.includes("SSL") ||
      err.message?.includes("CERT") ||
      err.message?.includes("ERR_TLS")
    ) {
      base.urlHealthStatus = "manual_review";
      base.failureReason = "ssl_error";
      base.lastError = "SSL/TLS error";
    } else if (
      err.message?.includes("ECONNREFUSED") ||
      err.message?.includes("ECONNRESET") ||
      err.message?.includes("EHOSTUNREACH") ||
      err.message?.includes("EPIPE")
    ) {
      base.urlHealthStatus = "error";
      base.failureReason = "connection_error";
      base.lastError = "Connection failed";
    } else {
      base.urlHealthStatus = "error";
      base.failureReason = "unknown_error";
    }
  }

  return base;
}

async function fetchWithTimeout(url: string, method: "GET" | "HEAD"): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.8,*/*;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        ...(method === "GET" ? { Range: "bytes=0-4096" } : {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}
