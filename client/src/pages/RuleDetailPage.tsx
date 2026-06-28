import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

function ResultDisplay({ result }: { result: Record<string, unknown> }) {
  const type = result.type as string;

  switch (type) {
    case "minimum_required_value":
      return (
        <div>
          <div className="text-sm font-semibold text-gray-700">Minimum Required Value</div>
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-xs text-gray-500">Target</span><div className="font-mono">{result.targetFact as string}</div></div>
            <div><span className="text-xs text-gray-500">Minimum</span><div className="font-bold text-lg">{String(result.minimum)}</div></div>
            <div><span className="text-xs text-gray-500">Unit</span><div>{result.unit as string}</div></div>
          </div>
        </div>
      );
    case "premium_required":
      return (
        <div>
          <div className="text-sm font-semibold text-gray-700">Premium Required</div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-gray-500">Type</span><div>{result.premiumType as string}</div></div>
            <div><span className="text-xs text-gray-500">Amount</span><div className="font-bold text-lg">{result.amount ? `${result.amount}x` : (result.formula as string) || "—"}</div></div>
          </div>
        </div>
      );
    case "required_break":
      return (
        <div>
          <div className="text-sm font-semibold text-gray-700">Required Break</div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-gray-500">Type</span><div>{result.breakType as string}</div></div>
            <div><span className="text-xs text-gray-500">Minimum</span><div className="font-bold text-lg">{String(result.minimumMinutes)} minutes</div></div>
          </div>
        </div>
      );
    case "prohibition":
      return (
        <div>
          <div className="text-sm font-semibold text-red-700">Prohibition</div>
          <div className="mt-2 text-sm text-gray-700">{result.prohibitedAction as string}</div>
        </div>
      );
    case "warning":
      return (
        <div>
          <div className="text-sm font-semibold text-amber-700">Warning</div>
          <div className="mt-2 text-sm text-gray-700">{result.message as string}</div>
        </div>
      );
    default:
      return <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>;
  }
}
