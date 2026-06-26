import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

interface Jurisdiction {
  id: string;
  name: string;
  type: string;
  state: string | null;
}

interface LawCategory {
  id: string;
  name: string;
  level: number;
}

interface Candidate {
  id: string;
  title: string | null;
  sourceUrl: string;
  sourceAuthority: string | null;
  guessedJurisdictionId: string | null;
  guessedLawCategoryId: string | null;
  guessedJurisdiction: Jurisdiction | null;
  guessedLawCategory: LawCategory | null;
  summary: string | null;
  confidence: number | null;
  status: string;
  notes: string | null;
  httpStatus: number | null;
  urlHealthStatus: string;
  finalUrl: string | null;
  lastError: string | null;
  contentAssessmentStatus: string;
  contentAssessmentSummary: string | null;
  actionableFacts: Record<string, unknown> | null;
  autoApprovalStatus: string;
  autoApprovalSources: { dolRate: string | null; berkeleyRate: string | null } | null;
  autoApprovalCheckedAt: string | null;
  autoApprovalNotes: string | null;
}

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [categories, setCategories] = useState<LawCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [sourceAuthority, setSourceAuthority] = useState("");
  const [jurId, setJurId] = useState("");
  const [catId, setCatId] = useState("");
  const [summary, setSummary] = useState("");
  const [confidence, setConfidence] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/candidates`).then((r) => r.json()),
      fetch("/api/jurisdictions").then((r) => r.json()),
      fetch("/api/law-categories").then((r) => r.json()),
    ]).then(([candidates, jurs, cats]) => {
      const c = candidates.find((x: Candidate) => x.id === id);
      if (c) {
        setCandidate(c);
        setTitle(c.title || "");
        setSourceAuthority(c.sourceAuthority || "");
        setJurId(c.guessedJurisdictionId || "");
        setCatId(c.guessedLawCategoryId || "");
        setSummary(c.summary || "");
        setConfidence(c.confidence != null ? String(c.confidence) : "");
        setNotes(c.notes || "");
      }
      setJurisdictions(jurs);
      setCategories(cats);
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          sourceAuthority: sourceAuthority || null,
          guessedJurisdictionId: jurId || null,
          guessedLawCategoryId: catId || null,
          summary: summary || null,
          confidence: confidence ? parseFloat(confidence) : null,
          notes: notes || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCandidate(updated);
        setMsg({ type: "success", text: "Saved." });
      } else {
        const err = await res.json();
        setMsg({ type: "error", text: err.error || "Save failed" });
      }
    } catch {
      setMsg({ type: "error", text: "Save failed" });
    }
    setSaving(false);
  }

  async function handlePromote() {
    const res = await fetch(`/api/candidates/${id}/promote`, { method: "POST" });
    if (res.ok) {
      setMsg({ type: "success", text: "Promoted to LawSource!" });
      setCandidate((c) => c ? { ...c, status: "promoted" } : c);
    } else {
      const err = await res.json();
      setMsg({ type: "error", text: err.error || "Promote failed" });
    }
  }

  async function handleReject() {
    const res = await fetch(`/api/candidates/${id}/reject`, { method: "POST" });
    if (res.ok) {
      setMsg({ type: "success", text: "Rejected." });
      setCandidate((c) => c ? { ...c, status: "rejected" } : c);
    } else {
      setMsg({ type: "error", text: "Reject failed" });
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><p className="text-gray-500">Loading...</p></div>;
  if (!candidate) return <div className="max-w-3xl mx-auto p-8"><p className="text-red-600">Candidate not found.</p></div>;

  const urlOk = candidate.urlHealthStatus === "ok" || candidate.urlHealthStatus === "redirected";
  const contentOk = candidate.contentAssessmentStatus === "actionable";
  const hasJson = !!(candidate.actionableFacts && Object.keys(candidate.actionableFacts).length > 0);
  const canPromote = !!(title && candidate.sourceUrl && jurId && catId) && urlOk && contentOk && hasJson;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <button onClick={() => navigate("/candidates")} className="text-blue-600 hover:underline text-sm mb-6 inline-flex items-center gap-1">
        ← Back to Candidates
      </button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title || "Untitled Candidate"}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          candidate.status === "promoted" ? "bg-green-100 text-green-800" :
          candidate.status === "rejected" ? "bg-red-100 text-red-800" :
          "bg-yellow-100 text-yellow-800"
        }`}>
          {candidate.status}
        </span>
      </div>

      {/* Source URL (read-only) */}
      <div className="mb-6 bg-white border rounded-lg p-4">
        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Source URL</div>
        <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all text-sm">
          {candidate.sourceUrl} ↗
        </a>
        {candidate.finalUrl && candidate.finalUrl !== candidate.sourceUrl && (
          <div className="mt-1 text-xs text-gray-500">
            Redirects to: <a href={candidate.finalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">{candidate.finalUrl}</a>
          </div>
        )}
        <div className="mt-3 flex items-center gap-3">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            candidate.urlHealthStatus === "ok" ? "bg-green-100 text-green-800" :
            candidate.urlHealthStatus === "redirected" ? "bg-blue-100 text-blue-800" :
            candidate.urlHealthStatus === "broken_url" ? "bg-red-100 text-red-800" :
            candidate.urlHealthStatus === "manual_review" ? "bg-yellow-100 text-yellow-800" :
            candidate.urlHealthStatus === "error" ? "bg-red-100 text-red-800" :
            "bg-gray-100 text-gray-600"
          }`}>
            {candidate.urlHealthStatus.replace(/_/g, " ")}
          </span>
          {candidate.httpStatus && <span className="text-xs text-gray-500">HTTP {candidate.httpStatus}</span>}
          {candidate.lastError && <span className="text-xs text-red-500">{candidate.lastError}</span>}
          <button
            onClick={async () => {
              const res = await fetch(`/api/candidates/${id}/check-url`, { method: "POST" });
              if (res.ok) {
                const updated = await res.json();
                setCandidate(updated);
                setMsg({ type: "success", text: "URL checked." });
              } else {
                setMsg({ type: "error", text: "Check failed" });
              }
            }}
            className="px-2.5 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Check URL
          </button>
        </div>
      </div>

      {/* Content Assessment */}
      <div className="mb-6 bg-white border rounded-lg p-4">
        <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Content Assessment</div>
        <div className="flex items-center gap-3 mb-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            candidate.contentAssessmentStatus === "actionable" ? "bg-emerald-100 text-emerald-800" :
            candidate.contentAssessmentStatus === "not_actionable" ? "bg-gray-200 text-gray-500" :
            candidate.contentAssessmentStatus === "unsure" ? "bg-amber-100 text-amber-800" :
            candidate.contentAssessmentStatus === "error" ? "bg-red-100 text-red-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {candidate.contentAssessmentStatus.replace(/_/g, " ")}
          </span>
          <button
            onClick={async () => {
              const res = await fetch(`/api/candidates/${id}/assess-content`, { method: "POST" });
              if (res.ok) {
                const updated = await res.json();
                setCandidate(updated);
                setMsg({ type: "success", text: "Content assessed." });
              } else {
                setMsg({ type: "error", text: "Assessment failed" });
              }
            }}
            className="px-2.5 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          >
            Assess Content
          </button>
        </div>
        {candidate.contentAssessmentSummary && (
          <p className="text-sm text-gray-600 mb-2">{candidate.contentAssessmentSummary}</p>
        )}
        {candidate.actionableFacts && (
          <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto max-h-48">
            {JSON.stringify(candidate.actionableFacts, null, 2)}
          </pre>
        )}
      </div>

      {/* Auto-Approval Cross-Check */}
      <div className="mb-6 bg-white border rounded-lg p-4">
        <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Auto-Approval Cross-Check</div>
        <div className="flex items-center gap-3 mb-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            candidate.autoApprovalStatus === "approved" ? "bg-sky-100 text-sky-800" :
            candidate.autoApprovalStatus === "mismatch" ? "bg-orange-100 text-orange-800" :
            candidate.autoApprovalStatus === "insufficient_data" ? "bg-yellow-100 text-yellow-800" :
            candidate.autoApprovalStatus === "error" ? "bg-red-100 text-red-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {candidate.autoApprovalStatus.replace(/_/g, " ")}
          </span>
          {candidate.autoApprovalCheckedAt && (
            <span className="text-xs text-gray-400">
              Checked: {new Date(candidate.autoApprovalCheckedAt).toLocaleString()}
            </span>
          )}
          <button
            onClick={async () => {
              setMsg(null);
              const res = await fetch(`/api/candidates/${id}/auto-check`, { method: "POST" });
              if (res.ok) {
                const updated = await res.json();
                setCandidate(updated);
                setMsg({ type: "success", text: "Auto-check complete." });
              } else {
                const err = await res.json();
                setMsg({ type: "error", text: err.error || "Auto-check failed" });
              }
            }}
            className="px-2.5 py-1 text-xs font-medium rounded bg-sky-100 text-sky-700 hover:bg-sky-200"
          >
            Run Auto Check
          </button>
        </div>
        {candidate.autoApprovalSources && (
          <div className="grid grid-cols-3 gap-3 text-sm mt-2">
            <div className="bg-gray-50 rounded p-2">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Candidate Rate</div>
              <div className="font-mono font-semibold">
                {(() => {
                  const facts = candidate.actionableFacts as Record<string, unknown> | null;
                  const rule = facts?.structuredRule as Record<string, unknown> | undefined;
                  return rule?.defaultRate ? String(rule.defaultRate) : "—";
                })()}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">DOL Rate</div>
              <div className="font-mono font-semibold">{candidate.autoApprovalSources.dolRate ? `$${candidate.autoApprovalSources.dolRate}` : "—"}</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Berkeley Rate</div>
              <div className="font-mono font-semibold">{candidate.autoApprovalSources.berkeleyRate ? `$${candidate.autoApprovalSources.berkeleyRate}` : "—"}</div>
            </div>
          </div>
        )}
        {candidate.autoApprovalNotes && (
          <p className="text-xs text-gray-600 mt-2">{candidate.autoApprovalNotes}</p>
        )}
      </div>

      {/* Editable fields */}
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" placeholder="Law title" disabled={candidate.status !== "new"} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Source Authority</label>
          <input value={sourceAuthority} onChange={(e) => setSourceAuthority(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" placeholder="e.g. City of Denver" disabled={candidate.status !== "new"} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Jurisdiction</label>
            <select value={jurId} onChange={(e) => setJurId(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" disabled={candidate.status !== "new"}>
              <option value="">— Select —</option>
              {jurisdictions.map((j) => (
                <option key={j.id} value={j.id}>{j.name}{j.state ? ` (${j.state})` : ""} [{j.type}]</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Law Category</label>
            <select value={catId} onChange={(e) => setCatId(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" disabled={candidate.status !== "new"}>
              <option value="">— Select —</option>
              {categories.filter((c) => c.level >= 1).map((c) => (
                <option key={c.id} value={c.id}>{"  ".repeat(c.level - 1)}{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Summary</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="border rounded px-3 py-2 text-sm w-full resize-none" placeholder="Plain-English summary" disabled={candidate.status !== "new"} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Confidence (0–1)</label>
            <input type="number" step="0.01" min="0" max="1" value={confidence} onChange={(e) => setConfidence(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" disabled={candidate.status !== "new"} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" placeholder="Optional notes" disabled={candidate.status !== "new"} />
          </div>
        </div>
      </div>

      {/* Actions */}
      {candidate.status === "new" && (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={handlePromote} disabled={!canPromote} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed" title={canPromote ? "Promote to LawSource" : "Fill in title, jurisdiction, and category first"}>
            Promote
          </button>
          <button onClick={handleReject} className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded hover:bg-red-200">
            Reject
          </button>
        </div>
      )}

      {msg && (
        <p className={`text-sm font-medium ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
