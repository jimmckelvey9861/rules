import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { StructuredRuleEditor } from "./StructuredRuleEditor";

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
  confidence: number | null;
  urlHealthStatus: string;
  contentAssessmentStatus: string;
  contentAssessmentSummary: string | null;
  actionableFacts: Record<string, unknown> | null;
  rawPayload: Record<string, unknown> | null;
  httpStatus: number | null;
  finalUrl: string | null;
  notes: string | null;
  autoApprovalStatus?: string;
  autoApprovalSources?: { dolRate: string | null; berkeleyRate: string | null } | null;
  autoApprovalNotes?: string | null;
}

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
  sourceUrl: string | null;
  sourceAuthority: string | null;
  summary: string | null;
  structuredText: string | null;
  status: string;
  verificationStatus: string;
  verificationNotes: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  applicabilityVariables: {
    applicabilityVariable: ApplicabilityVariable;
  }[];
}

interface CellData {
  jurisdiction: Jurisdiction;
  lawCategory: LawCategory;
  lawSources: LawSource[];
  primaryCandidate: Candidate | null;
  secondaryCandidates: Candidate[];
  nonActionableCandidates: Candidate[];
  cellStatus: { status: string; notes: string | null } | null;
}

const HEALTH_COLORS: Record<string, string> = {
  ok: "bg-green-100 text-green-800",
  redirected: "bg-blue-100 text-blue-800",
  broken_url: "bg-red-100 text-red-800",
  manual_review: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-700",
  unchecked: "bg-gray-100 text-gray-600",
};

const CONTENT_COLORS: Record<string, string> = {
  actionable: "bg-emerald-100 text-emerald-800",
  unsure: "bg-amber-100 text-amber-800",
  not_actionable: "bg-gray-200 text-gray-500",
  unchecked: "bg-gray-100 text-gray-600",
  error: "bg-red-100 text-red-700",
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

// ─── Helpers: extract relevant variable paths from structured rule ──

function extractRelevantPaths(structuredRule: Record<string, unknown> | null): Set<string> {
  const paths = new Set<string>();
  if (!structuredRule) return paths;

  // Walk the rule JSON looking for keys that match variable path patterns
  const ruleStr = JSON.stringify(structuredRule);

  // Direct path references (e.g., "employer.total_employees_global")
  const pathPattern = /(?:employer|employee|location|shift|schedule|leave|termination|payroll|timekeeping|environment|business)\.[a-z_]+/g;
  let m: RegExpExecArray | null;
  while ((m = pathPattern.exec(ruleStr)) !== null) {
    paths.add(m[0]);
  }

  // Infer from rule structure
  const ruleType = structuredRule.ruleType as string | undefined;
  const appliesTo = structuredRule.appliesTo as Record<string, unknown> | undefined;

  // appliesTo keys are direct variable paths
  if (appliesTo) {
    for (const key of Object.keys(appliesTo)) {
      paths.add(key);
    }
  }

  // Infer common variables by rule type
  if (ruleType === "minimum_wage") {
    paths.add("location.state");
    paths.add("location.city");
    paths.add("employer.total_employees_global");
    paths.add("employee.worker_type");
    paths.add("employee.tip_eligible");
    // If rates have conditions, add relevant vars
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
        if (rate.condition === "fast_food_worker" || rate.condition === "healthcare_worker") {
          paths.add("business.industry_tags");
        }
        if (rate.condition === "nonprofit_employer") {
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

// ─── Main Component ────────────────────────────────────────────────

export function CellReviewPage() {
  const { jurisdictionId, lawCategoryId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<CellData | null>(null);
  const [allVariables, setAllVariables] = useState<ApplicabilityVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAllVars, setShowAllVars] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);

  async function loadData() {
    const [cellRes, varsRes] = await Promise.all([
      fetch(`/api/matrix-cell/${jurisdictionId}/${lawCategoryId}`),
      fetch("/api/applicability-variables"),
    ]);
    if (cellRes.ok) setData(await cellRes.json());
    if (varsRes.ok) setAllVariables(await varsRes.json());
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [jurisdictionId, lawCategoryId]);

  async function handlePromote(candidateId: string) {
    setPromoting(candidateId);
    setMsg(null);
    const res = await fetch(`/api/candidates/${candidateId}/promote`, { method: "POST" });
    if (res.ok) {
      const lawSource = await res.json();
      // Navigate to the new LawSource detail page
      navigate(`/laws/${lawSource.id}`);
    } else {
      const err = await res.json();
      setMsg({ type: "error", text: err.error || "Promote failed" });
      setPromoting(null);
    }
  }

  async function handleReject(candidateId: string) {
    if (!confirm("Reject this candidate?")) return;
    const res = await fetch(`/api/candidates/${candidateId}/reject`, { method: "POST" });
    if (res.ok) {
      setMsg({ type: "success", text: "Rejected." });
      await loadData();
    } else {
      setMsg({ type: "error", text: "Reject failed" });
    }
  }

  async function handleMarkNoLaw() {
    if (!confirm("Mark this cell as 'No law found'?")) return;
    const res = await fetch("/api/matrix/cell-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jurisdictionId, lawCategoryId, status: "no_law_found" }),
    });
    if (res.ok) {
      setMsg({ type: "success", text: "Marked as no law found." });
      await loadData();
    }
  }

  async function handleClearNoLaw() {
    const res = await fetch("/api/matrix/cell-status", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jurisdictionId, lawCategoryId }),
    });
    if (res.ok) {
      setMsg({ type: "success", text: "Cleared." });
      await loadData();
    }
  }

  // Determine relevant variable paths from the best available rule
  const relevantPaths = useMemo(() => {
    if (!data) return new Set<string>();

    // Priority: LawSource structuredText > primary candidate structuredRule
    if (data.lawSources.length > 0) {
      const ls = data.lawSources[0];
      try {
        if (ls.structuredText) {
          const obj = JSON.parse(ls.structuredText);
          return extractRelevantPaths(obj);
        }
      } catch {}
      // Also include explicitly linked variables
      const linked = new Set<string>();
      for (const av of ls.applicabilityVariables) {
        linked.add(av.applicabilityVariable.path);
      }
      if (linked.size > 0) return linked;
    }

    if (data.primaryCandidate) {
      const facts = data.primaryCandidate.actionableFacts as Record<string, unknown> | null;
      const rule = facts?.structuredRule as Record<string, unknown> | null;
      return extractRelevantPaths(rule);
    }

    return new Set<string>();
  }, [data]);

  // Group variables by category
  const groupedVariables = useMemo(() => {
    const groups: Record<string, ApplicabilityVariable[]> = {};
    for (const v of allVariables) {
      if (!groups[v.category]) groups[v.category] = [];
      groups[v.category].push(v);
    }
    return groups;
  }, [allVariables]);

  // Categories that have at least one relevant variable
  const relevantCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const v of allVariables) {
      if (relevantPaths.has(v.path)) cats.add(v.category);
    }
    return cats;
  }, [allVariables, relevantPaths]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!data) return <div className="p-8 text-red-500">Cell not found.</div>;

  const { jurisdiction, lawCategory, lawSources, primaryCandidate, secondaryCandidates, nonActionableCandidates, cellStatus } = data;
  const totalReviewable = (primaryCandidate ? 1 : 0) + secondaryCandidates.length;
  const hasLawSource = lawSources.length > 0;
  const isInReview = !hasLawSource && totalReviewable > 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <button onClick={() => navigate("/")} className="text-sm text-blue-600 hover:underline mb-4 block">
        ← Back to Matrix
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Rule Details</h1>
          {isInReview && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              In Review
            </span>
          )}
          {hasLawSource && lawSources[0].verificationStatus && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              lawSources[0].verificationStatus === "verified" ? "bg-green-100 text-green-800" :
              lawSources[0].verificationStatus === "suspended" ? "bg-red-100 text-red-800" :
              "bg-blue-100 text-blue-800"
            }`}>
              {lawSources[0].verificationStatus.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {jurisdiction.name} — {lawCategory.name}
        </p>
        <div className="text-xs text-gray-400 mt-0.5">
          {jurisdiction.type.replace(/_/g, " ")} {jurisdiction.state ? `(${jurisdiction.state})` : ""} · Level {lawCategory.level} category
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* ─── Existing LawSource(s) (shown at top, Law Detail style) ──── */}
      {hasLawSource && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-green-800">
            {lawSources.length > 1 ? `Rules (${lawSources.length})` : "Active Rule"}
          </h2>
          {lawSources.length > 1 && (
            <p className="text-xs text-gray-500 mb-3">
              Multiple rules exist for this cell. Select the correct one to use as the active rule.
            </p>
          )}
          {lawSources.map((ls) => (
            <LawSourceDetail
              key={ls.id}
              lawSource={ls}
              navigate={navigate}
              hasMultiple={lawSources.length > 1}
              onSelectActive={async () => {
                const res = await fetch(`/api/law-sources/${ls.id}/select-active`, { method: "POST" });
                if (res.ok) {
                  setMsg({ type: "success", text: `Selected "${ls.title}" as the active rule.` });
                  await loadData();
                } else {
                  const err = await res.json().catch(() => ({ error: "Failed" }));
                  setMsg({ type: "error", text: err.error || "Failed to select rule" });
                }
              }}
            />
          ))}
        </div>
      )}

      {/* ─── Primary Candidate (proposed rule, Law Detail style) ─────── */}
      {primaryCandidate && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-purple-800">
            {hasLawSource ? "Alternative Candidate" : "Proposed Rule"}
          </h2>
          <ReviewableCandidateCard
            candidate={primaryCandidate}
            jurisdiction={jurisdiction}
            lawCategory={lawCategory}
            isPrimary
            promoting={promoting === primaryCandidate.id}
            onPromote={() => handlePromote(primaryCandidate.id)}
            onReject={() => handleReject(primaryCandidate.id)}
            onDataChanged={loadData}
          />
        </div>
      )}

      {/* ─── Secondary Structured Candidates ────────────────────────── */}
      {secondaryCandidates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-600">
            Secondary Candidates ({secondaryCandidates.length})
          </h2>
          <div className="space-y-4">
            {secondaryCandidates.map((c) => (
              <ReviewableCandidateCard
                key={c.id}
                candidate={c}
                jurisdiction={jurisdiction}
                lawCategory={lawCategory}
                isPrimary={false}
                promoting={promoting === c.id}
                onPromote={() => handlePromote(c.id)}
                onReject={() => handleReject(c.id)}
                onDataChanged={loadData}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── No candidates, no law sources ──────────────────────────── */}
      {!hasLawSource && totalReviewable === 0 && nonActionableCandidates.length === 0 && (
        <div className="mb-8 text-center py-8 text-gray-400">
          No law sources or reviewable candidates for this cell.
        </div>
      )}

      {/* ─── Applicability Variables ────────────────────────────────── */}
      {(relevantPaths.size > 0 || allVariables.length > 0) && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Applicability Variables</h2>

          {/* Relevant variables (shown by default) */}
          {relevantPaths.size > 0 ? (
            <div className="space-y-3 mb-4">
              {Object.entries(groupedVariables)
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

          {/* See all / hide toggle */}
          {!showAllVars ? (
            <button
              onClick={() => setShowAllVars(true)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              See all variables →
            </button>
          ) : (
            <div>
              <button
                onClick={() => setShowAllVars(false)}
                className="text-xs text-blue-600 hover:underline font-medium mb-3"
              >
                ← Hide unrelated variables
              </button>
              <div className="space-y-3 border-t pt-3">
                {Object.entries(groupedVariables).map(([category, vars]) => (
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
      )}

      {/* ─── Non-actionable / Rejected candidates (collapsed) ───────── */}
      {nonActionableCandidates.length > 0 && (
        <details className="mb-8">
          <summary className="cursor-pointer text-sm font-semibold text-gray-500 hover:text-gray-700 py-2 border-t">
            Rejected / Non-actionable Candidates ({nonActionableCandidates.length})
          </summary>
          <div className="mt-3 space-y-3">
            {nonActionableCandidates.map((c) => (
              <NonActionableCandidateCard
                key={c.id}
                candidate={c}
                onReject={() => handleReject(c.id)}
              />
            ))}
          </div>
        </details>
      )}

      {/* ─── Actions ────────────────────────────────────────────────── */}
      <div className="border-t pt-4 flex gap-3">
        {!cellStatus && !hasLawSource && (
          <button
            onClick={handleMarkNoLaw}
            className="px-4 py-2 text-sm font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Mark as No Law Found
          </button>
        )}
        {cellStatus && (
          <button
            onClick={handleClearNoLaw}
            className="px-4 py-2 text-sm font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Clear "No Law Found"
          </button>
        )}
      </div>
    </div>
  );
}

// ─── LawSource Detail Component (inline, Law Detail style) ─────────

function LawSourceDetail({
  lawSource,
  navigate,
  hasMultiple,
  onSelectActive,
}: {
  lawSource: LawSource;
  navigate: (path: string) => void;
  hasMultiple?: boolean;
  onSelectActive?: () => void;
}) {
  const isSuspended = lawSource.verificationStatus === "suspended";

  let structuredObj: Record<string, unknown> | null = null;
  try {
    if (lawSource.structuredText) structuredObj = JSON.parse(lawSource.structuredText);
  } catch {}

  return (
    <div className={`bg-white border rounded-lg p-5 mb-4 ${
      isSuspended ? "border-gray-200 opacity-60" : "border-green-200"
    }`}>
      {/* Title and status */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className={`text-lg font-semibold ${isSuspended ? "text-gray-500" : "text-gray-900"}`}>
          {lawSource.title}
        </h3>
        <div className="flex gap-2 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            lawSource.verificationStatus === "verified" ? "bg-green-100 text-green-800" :
            lawSource.verificationStatus === "suspended" ? "bg-red-100 text-red-800" :
            "bg-blue-100 text-blue-800"
          }`}>
            {lawSource.verificationStatus.replace(/_/g, " ")}
          </span>
          <button
            onClick={() => navigate(`/laws/${lawSource.id}`)}
            className="px-2.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Full Detail →
          </button>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <span className="text-xs text-gray-500 uppercase font-semibold">Source Authority</span>
          <div className="text-gray-800">{lawSource.sourceAuthority || "—"}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase font-semibold">Status</span>
          <div className="text-gray-800">{lawSource.status}</div>
        </div>
      </div>

      {/* Source URL */}
      {lawSource.sourceUrl && (
        <div className="mb-3">
          <span className="text-xs text-gray-500 uppercase font-semibold">Authoritative Source URL</span>
          <a href={lawSource.sourceUrl} target="_blank" rel="noreferrer"
            className="text-xs text-blue-500 hover:underline block mt-0.5 truncate">
            {lawSource.sourceUrl}
          </a>
        </div>
      )}

      {/* Summary */}
      {lawSource.summary && (
        <div className="mb-3">
          <span className="text-xs text-gray-500 uppercase font-semibold">Summary</span>
          <p className="text-sm text-gray-700 mt-0.5">{lawSource.summary}</p>
        </div>
      )}

      {/* Structured Rule JSON */}
      <div>
        <span className="text-xs text-gray-500 uppercase font-semibold">Structured Rule JSON</span>
        {structuredObj ? (
          <pre className="bg-gray-900 text-gray-100 rounded p-3 text-[11px] overflow-x-auto max-h-64 overflow-y-auto mt-1">
            {JSON.stringify(structuredObj, null, 2)}
          </pre>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-1">
            <p className="text-xs text-amber-800 font-medium">⚠ No structured rule JSON.</p>
          </div>
        )}
      </div>

      {/* Select as active button — shown when multiple rules exist */}
      {hasMultiple && onSelectActive && !isSuspended && (
        <div className="mt-4 pt-3 border-t">
          <button
            onClick={onSelectActive}
            className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700"
          >
            ✓ Select as active rule
          </button>
        </div>
      )}
      {hasMultiple && isSuspended && (
        <div className="mt-4 pt-3 border-t">
          <button
            onClick={onSelectActive}
            className="px-3 py-1.5 text-xs font-medium rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
          >
            Reactivate this rule
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Reviewable Candidate Card (Law Detail style) ──────────────────

function ReviewableCandidateCard({
  candidate,
  jurisdiction,
  lawCategory,
  isPrimary,
  promoting,
  onPromote,
  onReject,
  onDataChanged,
}: {
  candidate: Candidate;
  jurisdiction: Jurisdiction;
  lawCategory: LawCategory;
  isPrimary: boolean;
  promoting: boolean;
  onPromote: () => void;
  onReject: () => void;
  onDataChanged: () => void;
}) {
  const facts = candidate.actionableFacts as Record<string, unknown> | null;
  const structuredRule = facts?.structuredRule as Record<string, unknown> | null;

  // Promotion requires structuredRule
  const canPromote = !!(candidate.title && candidate.sourceUrl && structuredRule);
  const promoteReason = !candidate.title ? "Missing title"
    : !candidate.sourceUrl ? "Missing URL"
    : !structuredRule ? "No structured rule JSON"
    : null;

  return (
    <div className={`bg-white border rounded-lg p-5 ${isPrimary ? (candidate.autoApprovalStatus === "approved" ? "border-sky-300 ring-1 ring-sky-100" : "border-purple-300 ring-1 ring-purple-100") : "border-gray-200"}`}>
      {/* Title */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {candidate.title || <span className="italic text-gray-400">No title</span>}
          </h3>
          {candidate.autoApprovalStatus === "approved" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800">✓ auto-approved</span>
          )}
          {candidate.autoApprovalStatus === "mismatch" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800">⚠ mismatch</span>
          )}
        </div>
        {candidate.confidence != null && (
          <span className="text-xs font-mono text-gray-400 flex-shrink-0">
            conf: {candidate.confidence.toFixed(2)}
          </span>
        )}
      </div>

      {/* Metadata grid (Law Detail style) */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <span className="text-xs text-gray-500 uppercase font-semibold">Jurisdiction</span>
          <div className="text-gray-800">{jurisdiction.name}</div>
          <div className="text-xs text-gray-500">{jurisdiction.type.replace(/_/g, " ")}{jurisdiction.state ? ` • ${jurisdiction.state}` : ""}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase font-semibold">Law Category</span>
          <div className="text-gray-800">{lawCategory.name}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase font-semibold">Source Authority</span>
          <div className="text-gray-800">{candidate.sourceAuthority || "—"}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase font-semibold">Assessment</span>
          <div className="flex gap-2 mt-0.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${HEALTH_COLORS[candidate.urlHealthStatus]}`}>
              {candidate.urlHealthStatus.replace(/_/g, " ")}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CONTENT_COLORS[candidate.contentAssessmentStatus]}`}>
              {candidate.contentAssessmentStatus.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Authoritative Source URL */}
      <EditableSourceUrl candidate={candidate} onDataChanged={onDataChanged} />

      {/* Assessment Summary */}
      {candidate.contentAssessmentSummary && (
        <div className="mb-3">
          <span className="text-xs text-gray-500 uppercase font-semibold">Assessment Summary</span>
          <p className="text-sm text-gray-700 mt-0.5">{candidate.contentAssessmentSummary}</p>
        </div>
      )}

      {/* Structured Rule JSON (editable) */}
      <StructuredRuleEditor
        currentJson={structuredRule ? JSON.stringify(structuredRule, null, 2) : null}
        isManuallyEdited={!!(candidate.notes && candidate.notes.includes("Manual edit"))}
        onSave={async (json) => {
          const parsed = JSON.parse(json);
          const res = await fetch(`/api/candidates/${candidate.id}/structured-rule`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ structuredRule: parsed }),
          });
          if (res.ok) {
            onDataChanged();
            return { ok: true };
          }
          const err = await res.json().catch(() => ({ error: "Save failed" }));
          return { ok: false, error: err.error };
        }}
        onSuggestCorrection={async (correction) => {
          const res = await fetch(`/api/candidates/${candidate.id}/suggest-correction`, {
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
        onRegenerate={async () => {
          const res = await fetch(`/api/candidates/${candidate.id}/assess-content`, { method: "POST" });
          if (res.ok) {
            onDataChanged();
            return { ok: true };
          }
          const err = await res.json().catch(() => ({ error: "Regeneration failed" }));
          return { ok: false, error: err.error };
        }}
      />

      {/* Evidence / Debug JSON (collapsed) */}
      {facts && (
        <details className="mt-1 mb-3">
          <summary className="text-[10px] font-semibold text-gray-400 uppercase cursor-pointer hover:text-gray-600">
            Evidence / Debug JSON
          </summary>
          <pre className="bg-gray-50 border border-gray-200 rounded p-2 text-[10px] text-gray-500 overflow-x-auto max-h-32 overflow-y-auto mt-1">
            {JSON.stringify(facts.evidence || facts, null, 2)}
          </pre>
        </details>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t">
        <button
          onClick={onPromote}
          disabled={!canPromote || promoting}
          className={`px-3 py-1.5 text-xs font-medium rounded ${
            canPromote && !promoting
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {promoting ? "Promoting…" : "Promote to LawSource"}
        </button>
        <button
          onClick={onReject}
          className="px-3 py-1.5 text-xs font-medium rounded bg-red-50 text-red-600 hover:bg-red-100"
        >
          Reject
        </button>
        {!canPromote && !promoting && promoteReason && (
          <span className="text-[10px] text-red-400 self-center">{promoteReason}</span>
        )}
      </div>
    </div>
  );
}

// ─── Non-Actionable Candidate Card (compact, diagnostic) ───────────

function NonActionableCandidateCard({
  candidate,
  onReject,
}: {
  candidate: Candidate;
  onReject: () => void;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-600">
            {candidate.title || <span className="italic text-gray-400">No title</span>}
          </div>
          {candidate.sourceAuthority && (
            <div className="text-[10px] text-gray-400">{candidate.sourceAuthority}</div>
          )}
        </div>
        {candidate.confidence != null && (
          <span className="text-[10px] font-mono text-gray-400 ml-2">
            conf: {candidate.confidence.toFixed(2)}
          </span>
        )}
      </div>

      {/* URL */}
      <a href={candidate.finalUrl || candidate.sourceUrl} target="_blank" rel="noreferrer"
        className="text-[10px] text-blue-400 hover:underline block mb-1.5 truncate">
        {candidate.finalUrl || candidate.sourceUrl}
      </a>

      {/* Status badges */}
      <div className="flex gap-2 flex-wrap mb-1.5">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${HEALTH_COLORS[candidate.urlHealthStatus]}`}>
          {candidate.urlHealthStatus.replace(/_/g, " ")}
          {candidate.httpStatus != null ? ` (${candidate.httpStatus})` : null}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CONTENT_COLORS[candidate.contentAssessmentStatus]}`}>
          {candidate.contentAssessmentStatus.replace(/_/g, " ")}
        </span>
      </div>

      {/* Why not reviewable */}
      <div className="text-[10px] text-gray-400 italic mb-2">
        {candidate.urlHealthStatus !== "ok" && candidate.urlHealthStatus !== "redirected"
          ? "Not reviewable: URL not healthy"
          : candidate.contentAssessmentStatus !== "actionable"
          ? "Not reviewable: content not actionable"
          : "Not reviewable: no structured rule JSON"
        }
      </div>

      {/* Summary if available */}
      {candidate.contentAssessmentSummary && (
        <div className="text-[10px] text-gray-500 mb-2">{candidate.contentAssessmentSummary}</div>
      )}

      {/* Reject only — promote is disabled for non-actionable */}
      <div className="flex gap-2">
        <button
          onClick={onReject}
          className="px-2.5 py-1 text-[10px] font-medium rounded bg-red-50 text-red-500 hover:bg-red-100"
        >
          Reject
        </button>
        <button
          disabled
          className="px-2.5 py-1 text-[10px] font-medium rounded bg-gray-100 text-gray-300 cursor-not-allowed"
          title="Cannot promote: no structured rule JSON"
        >
          Promote (disabled)
        </button>
      </div>
    </div>
  );
}

function EditableSourceUrl({ candidate, onDataChanged }: { candidate: Candidate; onDataChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(candidate.sourceUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync local state when candidate prop changes (after re-fetch)
  useEffect(() => {
    setUrl(candidate.sourceUrl);
  }, [candidate.sourceUrl]);

  // Show finalUrl only if it differs from sourceUrl (i.e. a redirect was detected)
  // If sourceUrl was just changed, finalUrl is stale — show sourceUrl instead
  const displayUrl = (candidate.finalUrl && candidate.finalUrl !== candidate.sourceUrl)
    ? candidate.finalUrl
    : candidate.sourceUrl;

  async function handleSave() {
    if (!url.trim()) { setError("URL cannot be empty"); return; }
    try { new URL(url); } catch { setError("Invalid URL format"); return; }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/candidates/${candidate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl: url.trim() }),
    });
    if (res.ok) {
      setEditing(false);
      onDataChanged();
    } else {
      const err = await res.json();
      setError(err.error || "Save failed");
    }
    setSaving(false);
  }

  if (editing) {
    return (
      <div className="mb-3">
        <span className="text-xs text-gray-500 uppercase font-semibold">Authoritative Source URL</span>
        <div className="flex items-center gap-2 mt-1">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 border rounded px-2 py-1 text-xs font-mono"
            placeholder="https://..."
            autoFocus
          />
          <button onClick={handleSave} disabled={saving} className="px-2 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "..." : "Save"}
          </button>
          <button onClick={() => { setEditing(false); setUrl(candidate.sourceUrl); setError(null); }} className="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300">
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-3">
      <span className="text-xs text-gray-500 uppercase font-semibold">Authoritative Source URL</span>
      <div className="flex items-center gap-2 mt-0.5">
        <a href={displayUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate">
          {displayUrl}
        </a>
        <button onClick={() => setEditing(true)} className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 flex-shrink-0">
          Edit
        </button>
      </div>
    </div>
  );
}
