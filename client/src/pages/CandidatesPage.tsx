import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Candidate {
  id: string;
  title: string | null;
  sourceUrl: string;
  sourceAuthority: string | null;
  guessedJurisdictionId: string | null;
  guessedLawCategoryId: string | null;
  guessedJurisdiction: { id: string; name: string; type: string; state: string | null } | null;
  guessedLawCategory: { id: string; name: string; level: number } | null;
  summary: string | null;
  confidence: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  httpStatus: number | null;
  urlHealthStatus: string;
  finalUrl: string | null;
  lastError: string | null;
  contentAssessmentStatus: string;
  contentAssessmentSummary: string | null;
  actionableFacts: Record<string, unknown> | null;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-yellow-100 text-yellow-800",
  promoted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const URL_HEALTH_COLORS: Record<string, string> = {
  unchecked: "bg-gray-100 text-gray-600",
  ok: "bg-green-100 text-green-800",
  redirected: "bg-blue-100 text-blue-800",
  broken_url: "bg-red-100 text-red-800",
  manual_review: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
};

const CONTENT_COLORS: Record<string, string> = {
  unchecked: "bg-gray-100 text-gray-600",
  actionable: "bg-emerald-100 text-emerald-800",
  not_actionable: "bg-gray-200 text-gray-500",
  unsure: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-700",
};

interface HealthSummary {
  total: number;
  byHealthStatus: Record<string, number>;
  byFailureReason: Record<string, number>;
  byContentAssessment?: Record<string, number>;
}

export function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ id: string; type: "success" | "error"; text: string } | null>(null);
  const navigate = useNavigate();

  async function loadCandidates() {
    const [candRes, healthRes] = await Promise.all([
      fetch("/api/candidates"),
      fetch("/api/candidates/health-summary"),
    ]);
    setCandidates(await candRes.json());
    setHealth(await healthRes.json());
    setLoading(false);
  }

  useEffect(() => { loadCandidates(); }, []);

  async function handlePromote(id: string) {
    setActionMsg(null);
    const res = await fetch(`/api/candidates/${id}/promote`, { method: "POST" });
    if (res.ok) {
      setActionMsg({ id, type: "success", text: "Promoted to LawSource!" });
      await loadCandidates();
    } else {
      const err = await res.json();
      setActionMsg({ id, type: "error", text: err.error || "Promote failed" });
    }
  }

  async function handleReject(id: string) {
    setActionMsg(null);
    const res = await fetch(`/api/candidates/${id}/reject`, { method: "POST" });
    if (res.ok) {
      setActionMsg({ id, type: "success", text: "Rejected." });
      await loadCandidates();
    } else {
      setActionMsg({ id, type: "error", text: "Reject failed" });
    }
  }

  async function handleCheckUrl(id: string) {
    setActionMsg({ id, type: "success", text: "Checking..." });
    const res = await fetch(`/api/candidates/${id}/check-url`, { method: "POST" });
    if (res.ok) {
      setActionMsg({ id, type: "success", text: "URL checked." });
      await loadCandidates();
    } else {
      setActionMsg({ id, type: "error", text: "Check failed" });
    }
  }

  async function handleAssessContent(id: string) {
    setActionMsg({ id, type: "success", text: "Assessing..." });
    const res = await fetch(`/api/candidates/${id}/assess-content`, { method: "POST" });
    if (res.ok) {
      setActionMsg({ id, type: "success", text: "Assessed." });
      await loadCandidates();
    } else {
      setActionMsg({ id, type: "error", text: "Assess failed" });
    }
  }

  function canPromote(c: Candidate): boolean {
    if (!c.title || !c.sourceUrl || !c.guessedJurisdictionId || !c.guessedLawCategoryId) return false;
    if (c.urlHealthStatus !== "ok" && c.urlHealthStatus !== "redirected") return false;
    if (c.contentAssessmentStatus !== "actionable") return false;
    if (!c.actionableFacts) return false;
    return true;
  }

  function promoteWarning(c: Candidate): string | null {
    if (!canPromote(c)) {
      if (c.urlHealthStatus !== "ok" && c.urlHealthStatus !== "redirected") return "⚠ URL not healthy";
      if (c.contentAssessmentStatus !== "actionable") return "⚠ Content not actionable";
      if (!c.actionableFacts) return "⚠ No generated rule JSON";
    }
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading candidates...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crawler Candidates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quarantined results from crawlers/imports. Promote to add to the law inventory.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back to Matrix
        </button>
      </header>

      {/* Health Summary */}
      {health && (
        <div className="bg-white border-b px-6 py-3 flex-shrink-0">
          <div className="flex gap-4 items-center flex-wrap text-xs">
            <span className="font-semibold text-gray-600">Total: {health.total}</span>
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-medium">
              OK: {health.byHealthStatus["ok"] || 0}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
              Redirected: {health.byHealthStatus["redirected"] || 0}
            </span>
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium">
              Broken: {health.byHealthStatus["broken_url"] || 0}
            </span>
            <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-medium">
              Manual Review: {health.byHealthStatus["manual_review"] || 0}
            </span>
            <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-medium">
              Error: {health.byHealthStatus["error"] || 0}
            </span>
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
              Unchecked: {health.byHealthStatus["unchecked"] || 0}
            </span>
            {health.byContentAssessment && (
              <>
                <span className="ml-3 text-gray-400">|</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                  Actionable: {health.byContentAssessment["actionable"] || 0}
                </span>
                <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-500 font-medium">
                  Not actionable: {health.byContentAssessment["not_actionable"] || 0}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                  Unsure: {health.byContentAssessment["unsure"] || 0}
                </span>
              </>
            )}
            {Object.keys(health.byFailureReason).length > 0 && (
              <span className="ml-4 text-gray-500">
                Top failures: {Object.entries(health.byFailureReason).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k.replace(/_/g, " ")} (${v})`).join(", ")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Title</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">URL</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">URL Health</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Content</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Jurisdiction</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Category</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Confidence</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[c.status] || "bg-gray-100"}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">
                  {c.title ? (
                    <button
                      onClick={() => navigate(`/candidates/${c.id}`)}
                      className="text-blue-600 hover:underline text-left"
                    >
                      {c.title}
                    </button>
                  ) : (
                    <span className="text-gray-400 italic">No title</span>
                  )}
                </td>
                <td className="px-3 py-2 max-w-[200px] truncate">
                  <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                    {c.sourceUrl}
                  </a>
                  {c.finalUrl && c.finalUrl !== c.sourceUrl && (
                    <div className="text-[10px] text-gray-400 truncate">→ {c.finalUrl}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${URL_HEALTH_COLORS[c.urlHealthStatus] || "bg-gray-100"}`}>
                    {c.urlHealthStatus.replace(/_/g, " ")}
                  </span>
                  {c.httpStatus && (
                    <span className="ml-1 text-[10px] text-gray-400">{c.httpStatus}</span>
                  )}
                  {c.lastError && (
                    <div className="text-[10px] text-red-400 truncate max-w-[120px]" title={c.lastError}>{c.lastError}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CONTENT_COLORS[c.contentAssessmentStatus] || "bg-gray-100"}`}>
                    {c.contentAssessmentStatus === "not_actionable" ? "not act." : c.contentAssessmentStatus.replace(/_/g, " ")}
                  </span>
                  {c.contentAssessmentSummary && (
                    <div className="text-[10px] text-gray-400 truncate max-w-[120px]" title={c.contentAssessmentSummary}>
                      {c.contentAssessmentSummary.slice(0, 40)}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {c.guessedJurisdiction ? (
                    <span className="text-xs">{c.guessedJurisdiction.name}</span>
                  ) : (
                    <span className="text-red-400 text-xs italic">Missing</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {c.guessedLawCategory ? (
                    <span className="text-xs">{c.guessedLawCategory.name}</span>
                  ) : (
                    <span className="text-red-400 text-xs italic">Missing</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {c.confidence != null ? (
                    <span className={`text-xs font-semibold ${c.confidence >= 0.7 ? "text-green-600" : c.confidence >= 0.4 ? "text-yellow-600" : "text-red-600"}`}>
                      {Math.round(c.confidence * 100)}%
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {c.status === "new" && (
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleCheckUrl(c.id)}
                          className="px-2 py-1 text-[10px] font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                        >
                          Check URL
                        </button>
                        <button
                          onClick={() => handleAssessContent(c.id)}
                          className="px-2 py-1 text-[10px] font-medium rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                        >
                          Assess
                        </button>
                        <button
                          onClick={() => handlePromote(c.id)}
                          disabled={!canPromote(c)}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={canPromote(c) ? "Promote to LawSource" : "Cannot promote: missing fields or broken URL"}
                        >
                          Promote
                        </button>
                        <button
                          onClick={() => handleReject(c.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </div>
                      {promoteWarning(c) && (
                        <span className="text-[10px] text-yellow-600">{promoteWarning(c)}</span>
                      )}
                    </div>
                  )}
                  {c.status === "promoted" && <span className="text-xs text-green-600">✓ Promoted</span>}
                  {c.status === "rejected" && <span className="text-xs text-red-500">✗ Rejected</span>}
                  {actionMsg?.id === c.id && (
                    <div className={`text-xs mt-1 ${actionMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                      {actionMsg.text}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {candidates.length === 0 && (
          <p className="text-center text-gray-400 mt-8">No candidates yet.</p>
        )}
      </div>
    </div>
  );
}
