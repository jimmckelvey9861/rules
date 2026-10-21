import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface Citation {
  source: string;
  url?: string;
  section?: string;
}

interface Condition {
  fact?: string;
  op?: string;
  value?: unknown;
  all?: Condition[];
  any?: Condition[];
  not?: Condition;
}

interface RuleDetail {
  id: string;
  title: string;
  jurisdiction: string;
  topic: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: string;
  appliesWhen: Condition;
  result: Record<string, unknown>;
  citations: Citation[];
}

export function RuleDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Extract rule ID from path — handles dots in IDs (e.g., "federal-minimum-wage-7.25")
  const id = location.pathname.replace("/rules/", "");
  const [rule, setRule] = useState<RuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ts-rules/${id}`)
      .then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setRule)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-screen"><p className="text-gray-500">Loading...</p></div>;
  if (error || !rule) return (
    <div className="max-w-3xl mx-auto p-8">
      <p className="text-red-600">Rule not found.</p>
      <button onClick={() => navigate("/")} className="mt-4 text-blue-600 hover:underline">← Back</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-8">
      <button onClick={() => navigate("/")} className="text-blue-600 hover:underline text-sm mb-6 inline-flex items-center gap-1">
        ← Back to Rules
      </button>

      {/* Title */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{rule.title}</h1>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          {rule.status}
        </span>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <MetaCard label="Jurisdiction" value={rule.jurisdiction} />
        <MetaCard label="Topic" value={rule.topic.replace(/_/g, " ")} />
        <MetaCard label="Effective From" value={rule.effectiveFrom} />
        <MetaCard label="Effective To" value={rule.effectiveTo || "Ongoing"} />
        <MetaCard label="Rule ID" value={rule.id} mono />
      </div>

      {/* Conditions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Applies When</h2>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
          <ConditionTree condition={rule.appliesWhen} depth={0} />
        </div>
      </div>

      {/* Result */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Result</h2>
        <div className="bg-white border rounded-lg p-4">
          <ResultDisplay result={rule.result} />
        </div>
      </div>

      {/* Citations */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Citations</h2>
        <div className="space-y-2">
          {rule.citations.map((c, i) => (
            <div key={i} className="bg-white border rounded-lg p-4">
              <div className="font-medium text-sm">{c.source}</div>
              {c.section && <div className="text-xs text-gray-500 mt-1">{c.section}</div>}
              {c.url && (
                <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">
                  {c.url}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetaCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">{label}</div>
      <div className={`font-medium ${mono ? "font-mono text-sm" : ""}`}>{value}</div>
    </div>
  );
}

function ConditionTree({ condition, depth }: { condition: Condition; depth: number }) {
  const indent = depth * 16;

  if (condition.all) {
    return (
      <div style={{ marginLeft: indent }}>
        <span className="text-blue-400 font-semibold">ALL of:</span>
        {condition.all.map((c, i) => <ConditionTree key={i} condition={c} depth={depth + 1} />)}
      </div>
    );
  }
  if (condition.any) {
    return (
      <div style={{ marginLeft: indent }}>
        <span className="text-amber-400 font-semibold">ANY of:</span>
        {condition.any.map((c, i) => <ConditionTree key={i} condition={c} depth={depth + 1} />)}
      </div>
    );
  }
  if (condition.not) {
    return (
      <div style={{ marginLeft: indent }}>
        <span className="text-red-400 font-semibold">NOT:</span>
        <ConditionTree condition={condition.not} depth={depth + 1} />
      </div>
    );
  }

  // Leaf comparison
  const valueStr = Array.isArray(condition.value)
    ? `[${(condition.value as unknown[]).join(", ")}]`
    : JSON.stringify(condition.value);

  return (
    <div style={{ marginLeft: indent }} className="py-0.5">
      <span className="text-green-300">{condition.fact}</span>
      <span className="text-gray-400 mx-2">{condition.op}</span>
      <span className="text-yellow-300">{valueStr}</span>
    </div>
  );
}

const RESULT_TYPE_LABELS: Record<string, { label: string; tone: string }> = {
  minimum_required_value: { label: "Minimum required value", tone: "text-gray-700" },
  required_break: { label: "Required break", tone: "text-gray-700" },
  premium_required: { label: "Premium required", tone: "text-gray-700" },
  prohibition: { label: "Prohibition", tone: "text-red-700" },
  warning: { label: "Warning", tone: "text-amber-700" },
};

function formatParam(value: unknown): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return String(value);
  return String(value ?? "—");
}

function ResultDisplay({ result }: { result: Record<string, unknown> }) {
  const type = result.type as string;
  const meta = RESULT_TYPE_LABELS[type] ?? { label: type, tone: "text-gray-700" };
  const params = (result.params ?? {}) as Record<string, unknown>;
  const entries = Object.entries(params);

  return (
    <div>
      <div className={`text-sm font-semibold ${meta.tone}`}>{meta.label}</div>
      <div className="mt-1 text-xs text-gray-500">
        Obligation <span className="font-mono text-gray-700">{String(result.obligation ?? "—")}</span>
      </div>
      {result.summary ? <div className="mt-2 text-sm text-gray-700">{String(result.summary)}</div> : null}
      {entries.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {entries.map(([name, value]) => (
            <div key={name}>
              <span className="text-xs text-gray-500 font-mono">{name}</span>
              <div className="font-bold">{formatParam(value)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
