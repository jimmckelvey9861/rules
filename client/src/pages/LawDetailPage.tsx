import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { StructuredRuleEditor } from "./StructuredRuleEditor";

interface ApplicabilityVariable {
  id: string;
  path: string;
  name: string;
  category: string;
  description: string | null;
}

interface LawSource {
  id: string;
  title: string;
  summary: string | null;
  structuredText: string | null;
  sourceUrl: string | null;
  sourceAuthority: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  status: string;
  notes: string | null;
  verificationStatus: string;
  verificationNotes: string | null;
  sourceCandidateId: string | null;
  jurisdiction: {
    id: string;
    name: string;
    type: string;
    state: string | null;
  };
  lawCategory: {
    id: string;
    name: string;
    level: number;
  };
  applicabilityVariables: {
    applicabilityVariable: ApplicabilityVariable;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  repealed: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-600",
};

const CATEGORY_COLORS: Record<string, string> = {
  Location: "bg-blue-100 text-blue-800",
  Employer: "bg-purple-100 text-purple-800",
  Business: "bg-indigo-100 text-indigo-800",
  Employee: "bg-green-100 text-green-800",
  Shift: "bg-orange-100 text-orange-800",
  Schedule: "bg-teal-100 text-teal-800",
  Leave: "bg-pink-100 text-pink-800",
  Separation: "bg-red-100 text-red-800",
  "Workplace Environment": "bg-yellow-100 text-yellow-800",
  "Timekeeping & Payroll": "bg-gray-100 text-gray-700",
};

export function LawDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [law, setLaw] = useState<LawSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verStatus, setVerStatus] = useState("auto_generated");
  const [verNotes, setVerNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/law-sources/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => {
        setLaw(d);
        setVerStatus(d.verificationStatus || "auto_generated");
        setVerNotes(d.verificationNotes || "");
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id]);

  const handleSaveVerification = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/law-sources/${id}/verification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: verStatus, verificationNotes: verNotes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      const updated = await res.json();
      setLaw(updated);
      setSaveMsg({ type: "success", text: "Verification saved." });
    } catch (e: any) {
      setSaveMsg({ type: "error", text: e.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  }, [id, verStatus, verNotes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !law) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <p className="text-red-600">Law source not found.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-blue-600 hover:underline">
          ← Back to Matrix
        </button>
      </div>
    );
  }

  // Group applicability variables by category
  const groupedVars: Record<string, ApplicabilityVariable[]> = {};
  for (const av of law.applicabilityVariables) {
    const cat = av.applicabilityVariable.category;
    if (!groupedVars[cat]) groupedVars[cat] = [];
    groupedVars[cat].push(av.applicabilityVariable);
  }

  let structuredObj: Record<string, unknown> | null = null;
  try {
    if (law.structuredText) structuredObj = JSON.parse(law.structuredText);
  } catch {}

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="text-blue-600 hover:underline text-sm mb-6 inline-flex items-center gap-1"
      >
        ← Back to Matrix
      </button>

      {/* Title and status */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{law.title}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[law.status] || "bg-gray-100"}`}>
          {law.status}
        </span>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Jurisdiction</div>
          <div className="font-medium">{law.jurisdiction.name}</div>
          <div className="text-xs text-gray-500">
            {law.jurisdiction.type.replace(/_/g, " ")}
            {law.jurisdiction.state && ` • ${law.jurisdiction.state}`}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Law Category</div>
          <div className="font-medium">{law.lawCategory.name}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Effective Date</div>
          <div className="font-medium">
            {law.effectiveDate ? new Date(law.effectiveDate).toLocaleDateString() : "—"}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Expiration Date</div>
          <div className="font-medium">
            {law.expirationDate ? new Date(law.expirationDate).toLocaleDateString() : "None (ongoing)"}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4 col-span-2">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Source Authority</div>
          <div className="font-medium">{law.sourceAuthority || "—"}</div>
        </div>
      </div>

      {/* Summary */}
      {law.summary && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Summary</h2>
          <p className="text-gray-700 leading-relaxed bg-white border rounded-lg p-4">
            {law.summary}
          </p>
        </div>
      )}

      {/* Structured Rule (with correction flow) */}
      <StructuredRuleEditor
        currentJson={law.structuredText}
        isManuallyEdited={!!(law.notes && law.notes.includes("Manual edit"))}
        onSave={async (json) => {
          const res = await fetch(`/api/law-sources/${id}/structured-text`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ structuredText: json }),
          });
          if (res.ok) {
            const updated = await res.json();
            setLaw(updated);
            return { ok: true };
          }
          const err = await res.json().catch(() => ({ error: "Save failed" }));
          return { ok: false, error: err.error };
        }}
        onSuggestCorrection={async (correction) => {
          const res = await fetch(`/api/law-sources/${id}/suggest-correction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correction }),
          });
          if (res.ok) {
            const data = await res.json();
            return { ok: true, proposedRule: data.proposedRule, explanation: data.explanation, confidence: data.confidence };
          }
          const err = await res.json().catch(() => ({ error: "Failed" }));
          return { ok: false, error: err.error };
        }}
        onRegenerate={law.sourceUrl ? async () => {
          const res = await fetch(`/api/law-sources/${id}/regenerate`, { method: "POST" });
          if (res.ok) {
            const updated = await res.json();
            setLaw(updated);
            return { ok: true };
          }
          const err = await res.json().catch(() => ({ error: "Regeneration failed" }));
          return { ok: false, error: err.error };
        } : undefined}
        regenerateUnavailableReason={!law.sourceUrl ? "No source URL to regenerate from." : undefined}
      />

      {/* Applicability Variables */}
      <ApplicabilityVariablesSection
        structuredRule={structuredObj}
        linkedVariables={law.applicabilityVariables.map(av => av.applicabilityVariable)}
      />

      {/* Authoritative Source URL */}
      <AuthoritativeSourceSection
        lawSourceId={law.id}
        currentUrl={law.sourceUrl}
        navigate={navigate}
      />

      {/* Verification */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Verification</h2>
        <div className="bg-white border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Status</label>
            <select
              value={verStatus}
              onChange={(e) => { setVerStatus(e.target.value); setSaveMsg(null); }}
              className="border rounded px-3 py-2 text-sm w-full max-w-xs"
            >
              <option value="auto_generated">Auto-generated</option>
              <option value="verified">Verified</option>
              <option value="suspended">Suspended</option>
            </select>
            <div className="mt-1.5">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                verStatus === "verified" ? "bg-green-100 text-green-800" :
                verStatus === "suspended" ? "bg-red-100 text-red-800" :
                "bg-blue-100 text-blue-800"
              }`}>
                {verStatus === "auto_generated" ? "Auto-generated" : verStatus === "verified" ? "Verified" : "Suspended"}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Notes</label>
            <textarea
              value={verNotes}
              onChange={(e) => { setVerNotes(e.target.value); setSaveMsg(null); }}
              rows={4}
              placeholder="Optional verification notes"
              className="border rounded px-3 py-2 text-sm w-full resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveVerification}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {saveMsg && (
              <span className={`text-sm font-medium ${saveMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {saveMsg.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Applicability Variables Section ───────────────────────────────

function extractRelevantPaths(structuredRule: Record<string, unknown> | null): Set<string> {
  const paths = new Set<string>();
  if (!structuredRule) return paths;

  const ruleStr = JSON.stringify(structuredRule);

  // Direct path references
  const pathPattern = /(?:employer|employee|location|shift|schedule|leave|termination|payroll|timekeeping|environment|business)\.[a-z_]+/g;
  let m: RegExpExecArray | null;
  while ((m = pathPattern.exec(ruleStr)) !== null) {
    paths.add(m[0]);
  }

  const ruleType = structuredRule.ruleType as string | undefined;
  const appliesTo = structuredRule.appliesTo as Record<string, unknown> | undefined;

  if (appliesTo) {
    for (const key of Object.keys(appliesTo)) {
      paths.add(key);
    }
  }

  if (ruleType === "minimum_wage") {
    paths.add("location.state");
    paths.add("location.city");
    paths.add("employer.total_employees_global");
    paths.add("employee.worker_type");
    paths.add("employee.tip_eligible");
    const rates = structuredRule.rates as Array<{ condition?: string | null }> | undefined;
    if (rates) {
      for (const rate of rates) {
        if (rate.condition === "large_employer" || rate.condition === "small_employer") {
          paths.add("employer.total_employees_global");
          paths.add("employer.total_employees_at_location");
        }
        if (rate.condition === "tipped_employee") {
          paths.add("employee.tip_eligible");
          paths.add("employee.cash_wage");
        }
        if (rate.condition === "hotel_worker") {
          paths.add("business.hotel_room_count");
          paths.add("business.industry_tags");
        }
        if (rate.condition === "fast_food_worker" || rate.condition === "healthcare_worker" || rate.condition === "nonprofit_employer") {
          paths.add("business.industry_tags");
        }
      }
    }
  } else if (ruleType === "overtime") {
    paths.add("employee.exemption_status");
    paths.add("employee.regular_hourly_rate");
    paths.add("shift.shift_start");
    paths.add("shift.shift_end");
  } else if (ruleType === "tipped_compensation") {
    paths.add("employee.tip_eligible");
    paths.add("employee.cash_wage");
    paths.add("employee.regular_hourly_rate");
  } else if (ruleType === "family_medical_leave") {
    paths.add("employer.total_employees_global");
    paths.add("employee.hire_date");
    paths.add("leave.leave_type");
    paths.add("leave.reason");
    paths.add("leave.start_date");
  } else if (ruleType === "minor_labor") {
    paths.add("employee.age");
    paths.add("employee.has_work_permit");
    paths.add("employee.is_school_enrolled");
    paths.add("shift.is_school_day");
    paths.add("shift.school_in_session");
  } else if (ruleType === "equal_pay") {
    paths.add("employee.job_category");
    paths.add("employee.job_title");
  } else if (ruleType === "warn_act") {
    paths.add("employer.total_employees_global");
    paths.add("termination.is_mass_layoff");
    paths.add("termination.type");
    paths.add("termination.notice_given");
  } else if (ruleType === "worker_classification") {
    paths.add("employee.worker_type");
    paths.add("employee.employment_status");
  } else if (ruleType === "workplace_safety") {
    paths.add("environment.hazardous_materials");
    paths.add("environment.outdoor_work");
  }

  return paths;
}

// ─── Authoritative Source Section ──────────────────────────────────

function AuthoritativeSourceSection({
  lawSourceId,
  currentUrl,
  navigate,
}: {
  lawSourceId: string;
  currentUrl: string | null;
  navigate: (path: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleEdit() {
    setNewUrl(currentUrl || "");
    setEditing(true);
    setError(null);
  }

  function handleCancel() {
    setEditing(false);
    setNewUrl("");
    setError(null);
  }

  async function handleReingest() {
    if (!newUrl.trim()) return;
    // Don't re-ingest if URL hasn't changed
    if (newUrl.trim() === currentUrl) {
      setEditing(false);
      return;
    }

    setIngesting(true);
    setError(null);

    try {
      const res = await fetch(`/api/law-sources/${lawSourceId}/reingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl.trim() }),
      });

      if (res.ok) {
        const newLawSource = await res.json();
        navigate(`/laws/${newLawSource.id}`);
      } else {
        let errorMsg = `Re-ingestion failed (HTTP ${res.status})`;
        try {
          const err = await res.json();
          if (err.error) errorMsg = err.error;
        } catch {
          // Response body wasn't valid JSON — use status-based message
          if (res.status === 422) errorMsg = "Could not extract a structured rule from this URL.";
          else if (res.status === 400) errorMsg = "Invalid URL format.";
          else if (res.status >= 500) errorMsg = "Server error during page assessment. The page may have timed out.";
        }
        setError(errorMsg);
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-2">Authoritative Source</h2>

      {!editing ? (
        <div className="bg-white border rounded-lg p-4">
          {currentUrl ? (
            <div className="flex items-center justify-between gap-3">
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all text-sm"
              >
                {currentUrl} ↗
              </a>
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 flex-shrink-0"
              >
                Change URL
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-400 italic">No source URL set</span>
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 flex-shrink-0"
              >
                Add URL
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              New Source URL
            </label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => { setNewUrl(e.target.value); setError(null); }}
              placeholder="https://..."
              className="border rounded px-3 py-2 text-sm w-full"
              disabled={ingesting}
              autoFocus
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Changing the URL will re-assess the page and create a new Rule Detail with the extracted data.
            </p>
          </div>

          {error && (
            <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleReingest}
              disabled={ingesting || !newUrl.trim()}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                ingesting || !newUrl.trim()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {ingesting ? "Assessing page…" : "Re-ingest from URL"}
            </button>
            <button
              onClick={handleCancel}
              disabled={ingesting}
              className="px-3 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicabilityVariablesSection({
  structuredRule,
  linkedVariables,
}: {
  structuredRule: Record<string, unknown> | null;
  linkedVariables: ApplicabilityVariable[];
}) {
  const [allVariables, setAllVariables] = useState<ApplicabilityVariable[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/applicability-variables")
      .then(r => r.json())
      .then(setAllVariables)
      .catch(() => {});
  }, []);

  // Combine linked variable paths + inferred paths from structured rule
  const relevantPaths = useMemo(() => {
    const paths = extractRelevantPaths(structuredRule);
    for (const v of linkedVariables) {
      paths.add(v.path);
    }
    return paths;
  }, [structuredRule, linkedVariables]);

  const groupedAll = useMemo(() => {
    const groups: Record<string, ApplicabilityVariable[]> = {};
    for (const v of allVariables) {
      if (!groups[v.category]) groups[v.category] = [];
      groups[v.category].push(v);
    }
    return groups;
  }, [allVariables]);

  const relevantCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const v of allVariables) {
      if (relevantPaths.has(v.path)) cats.add(v.category);
    }
    return cats;
  }, [allVariables, relevantPaths]);

  if (allVariables.length === 0 && linkedVariables.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3">Applicability Variables</h2>

      {relevantPaths.size > 0 ? (
        <div className="space-y-3 mb-4">
          {Object.entries(groupedAll)
            .filter(([cat]) => relevantCategories.has(cat))
            .map(([category, vars]) => {
              const relevantVars = vars.filter(v => relevantPaths.has(v.path));
              if (relevantVars.length === 0) return null;
              return (
                <div key={category}>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1.5">{category}</div>
                  <div className="flex flex-wrap gap-2">
                    {relevantVars.map((v) => (
                      <span
                        key={v.id}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${CATEGORY_COLORS[category] || "bg-gray-100 text-gray-700"}`}
                        title={v.description || v.path}
                      >
                        {v.name}
                        <span className="ml-1 opacity-60">({v.path})</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic mb-4">No variables inferred from the current rule.</p>
      )}

      {!showAll ? (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-blue-600 hover:underline font-medium"
        >
          See all variables →
        </button>
      ) : (
        <div>
          <button
            onClick={() => setShowAll(false)}
            className="text-xs text-blue-600 hover:underline font-medium mb-3"
          >
            ← Hide unrelated variables
          </button>
          <div className="space-y-3 border-t pt-3">
            {Object.entries(groupedAll).map(([category, vars]) => (
              <div key={category}>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1.5">{category}</div>
                <div className="flex flex-wrap gap-2">
                  {vars.map((v) => {
                    const isRelevant = relevantPaths.has(v.path);
                    return (
                      <span
                        key={v.id}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          isRelevant
                            ? (CATEGORY_COLORS[category] || "bg-gray-100 text-gray-700")
                            : "bg-gray-50 text-gray-400 border border-gray-200"
                        }`}
                        title={v.description || v.path}
                      >
                        {v.name}
                        <span className="ml-1 opacity-60">({v.path})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
