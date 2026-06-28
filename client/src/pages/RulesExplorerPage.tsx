import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface TsRule {
  id: string;
  title: string;
  jurisdiction: string;
  topic: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  citations: { source: string; url?: string; section?: string }[];
  resultType: string;
}

interface TsFact {
  path: string;
  type: string;
  description: string;
  enumValues: string[] | null;
  deprecated: boolean;
  replacedBy: string | null;
}

interface EvalResult {
  ruleId: string;
  title: string;
  outcome: string;
  explanation: string;
  triggeredFacts: string[];
  citation: { source: string; url?: string; section?: string };
}

interface EvalResponse {
  scenario: Record<string, unknown>;
  summary: { violations: number; warnings: number; passed: number };
  violations: EvalResult[];
  warnings: EvalResult[];
  passed: EvalResult[];
}

const TOPIC_COLORS: Record<string, string> = {
  overtime: "bg-orange-100 text-orange-800",
  minimum_wage: "bg-green-100 text-green-800",
  predictive_scheduling: "bg-purple-100 text-purple-800",
  meal_break: "bg-yellow-100 text-yellow-800",
  family_medical_leave: "bg-pink-100 text-pink-800",
  warn_act: "bg-red-100 text-red-800",
};

const TOPIC_LABELS: Record<string, string> = {
  overtime: "Overtime",
  minimum_wage: "Minimum Wage",
  predictive_scheduling: "Predictive Scheduling",
  meal_break: "Meal & Rest Breaks",
  family_medical_leave: "Family & Medical Leave",
  warn_act: "WARN Act",
};

const RESULT_TYPE_LABELS: Record<string, string> = {
  premium_required: "Premium Required",
  minimum_required_value: "Minimum Value",
  required_break: "Required Break",
  prohibition: "Prohibition",
  warning: "Warning",
};

type ViewMode = "matrix" | "list" | "tester";

export function RulesExplorerPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<TsRule[]>([]);
  const [facts, setFacts] = useState<TsFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("matrix");
  const [topicFilter, setTopicFilter] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");
  const [search, setSearch] = useState("");

  // Scenario tester state
  const [scenarioFields, setScenarioFields] = useState<{ path: string; value: string }[]>([
    { path: "location.state", value: "CA" },
    { path: "location.country", value: "US" },
    { path: "employee.exempt_status", value: "non_exempt" },
    { path: "shift.hours_worked_today", value: "9" },
    { path: "shift.hours_worked_this_week", value: "45" },
    { path: "employee.regular_hourly_rate", value: "20" },
    { path: "shift.date", value: new Date().toISOString().slice(0, 10) },
  ]);
  const [evalResult, setEvalResult] = useState<EvalResponse | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/ts-rules").then(r => r.json()),
      fetch("/api/ts-facts").then(r => r.json()),
    ]).then(([rulesData, factsData]) => {
      setRules(rulesData.rules);
      setFacts(factsData.facts);
      setLoading(false);
    });
  }, []);

  const topics = useMemo(() => [...new Set(rules.map(r => r.topic))].sort(), [rules]);
  const jurisdictions = useMemo(() => [...new Set(rules.map(r => r.jurisdiction))].sort(), [rules]);

  const filteredRules = useMemo(() => {
    let result = rules;
    if (topicFilter) result = result.filter(r => r.topic === topicFilter);
    if (jurisdictionFilter) result = result.filter(r => r.jurisdiction === jurisdictionFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.jurisdiction.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rules, topicFilter, jurisdictionFilter, search]);

  const canonicalFacts = useMemo(() => facts.filter(f => !f.deprecated), [facts]);

  // ─── Matrix data ─────────────────────────────────────────────────

  const matrixData = useMemo(() => {
    // Build a map: topic → jurisdiction → rules[]
    const grid: Record<string, Record<string, TsRule[]>> = {};
    for (const rule of rules) {
      if (!grid[rule.topic]) grid[rule.topic] = {};
      if (!grid[rule.topic][rule.jurisdiction]) grid[rule.topic][rule.jurisdiction] = [];
      grid[rule.topic][rule.jurisdiction].push(rule);
    }
    return grid;
  }, [rules]);

  // ─── Scenario tester ─────────────────────────────────────────────

  function addScenarioField() {
    setScenarioFields([...scenarioFields, { path: "", value: "" }]);
  }

  function removeScenarioField(index: number) {
    setScenarioFields(scenarioFields.filter((_, i) => i !== index));
  }

  function updateScenarioField(index: number, key: "path" | "value", val: string) {
    const updated = [...scenarioFields];
    updated[index] = { ...updated[index], [key]: val };
    setScenarioFields(updated);
  }

  async function handleEvaluate() {
    setEvaluating(true);
    setEvalResult(null);

    const scenario: Record<string, unknown> = {};
    for (const field of scenarioFields) {
      if (!field.path.trim()) continue;
      const val = field.value.trim();
      if (val === "true") scenario[field.path] = true;
      else if (val === "false") scenario[field.path] = false;
      else if (/^-?\d+(\.\d+)?$/.test(val)) scenario[field.path] = parseFloat(val);
      else scenario[field.path] = val;
    }

    try {
      const res = await fetch("/api/ts-rules/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      if (res.ok) {
        setEvalResult(await res.json());
      }
    } catch {}
    setEvaluating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-lg">Loading rules...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employment Law Rules Engine</h1>
            <p className="text-sm text-gray-500 mt-1">
              {rules.length} rules · {canonicalFacts.length} facts · {topics.length} topics · {jurisdictions.length} jurisdictions
            </p>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 mt-4">
          <button
            onClick={() => setView("matrix")}
            className={`px-4 py-2 text-sm font-medium rounded-t ${view === "matrix" ? "bg-white border border-b-0 text-gray-900" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Coverage Matrix
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 text-sm font-medium rounded-t ${view === "list" ? "bg-white border border-b-0 text-gray-900" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Rule List
          </button>
          <button
            onClick={() => setView("tester")}
            className={`px-4 py-2 text-sm font-medium rounded-t ${view === "tester" ? "bg-white border border-b-0 text-gray-900" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Scenario Tester
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === "matrix" && (
          <MatrixView
            topics={topics}
            jurisdictions={jurisdictions}
            matrixData={matrixData}
            navigate={navigate}
          />
        )}
        {view === "list" && (
          <ListView
            rules={filteredRules}
            topics={topics}
            jurisdictions={jurisdictions}
            topicFilter={topicFilter}
            jurisdictionFilter={jurisdictionFilter}
            search={search}
            setTopicFilter={setTopicFilter}
            setJurisdictionFilter={setJurisdictionFilter}
            setSearch={setSearch}
            navigate={navigate}
          />
        )}
        {view === "tester" && (
          <TesterView
            facts={facts}
            canonicalFacts={canonicalFacts}
            scenarioFields={scenarioFields}
            evalResult={evalResult}
            evaluating={evaluating}
            addScenarioField={addScenarioField}
            removeScenarioField={removeScenarioField}
            updateScenarioField={updateScenarioField}
            handleEvaluate={handleEvaluate}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Matrix View — Topics as rows, Jurisdictions as columns
// ═══════════════════════════════════════════════════════════════════════

function MatrixView({
  topics,
  jurisdictions,
  matrixData,
  navigate,
}: {
  topics: string[];
  jurisdictions: string[];
  matrixData: Record<string, Record<string, TsRule[]>>;
  navigate: (path: string) => void;
}) {
  return (
    <div className="p-6">
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-100 border px-4 py-3 text-left font-semibold min-w-[200px]">
                Topic / Category
              </th>
              {jurisdictions.map(j => (
                <th key={j} className="border px-3 py-2 text-center font-medium bg-gray-50 whitespace-nowrap">
                  {j}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topics.map(topic => (
              <tr key={topic} className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white border px-4 py-3 font-medium">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${TOPIC_COLORS[topic] || "bg-gray-100 text-gray-700"}`}>
                    {TOPIC_LABELS[topic] || topic.replace(/_/g, " ")}
                  </span>
                </td>
                {jurisdictions.map(jur => {
                  const cellRules = matrixData[topic]?.[jur] || [];
                  if (cellRules.length === 0) {
                    return (
                      <td key={jur} className="border px-3 py-2 text-center">
                        <span className="text-gray-300">—</span>
                      </td>
                    );
                  }
                  return (
                    <td key={jur} className="border px-3 py-2 text-center">
                      <button
                        onClick={() => {
                          if (cellRules.length === 1) {
                            navigate(`/rules/${cellRules[0].id}`);
                          }
                        }}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 cursor-pointer"
                        title={cellRules.map(r => r.title).join("\n")}
                      >
                        {cellRules.length}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// List View — Filterable rule list
// ═══════════════════════════════════════════════════════════════════════

function ListView({
  rules,
  topics,
  jurisdictions,
  topicFilter,
  jurisdictionFilter,
  search,
  setTopicFilter,
  setJurisdictionFilter,
  setSearch,
  navigate,
}: {
  rules: TsRule[];
  topics: string[];
  jurisdictions: string[];
  topicFilter: string;
  jurisdictionFilter: string;
  search: string;
  setTopicFilter: (v: string) => void;
  setJurisdictionFilter: (v: string) => void;
  setSearch: (v: string) => void;
  navigate: (path: string) => void;
}) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-48"
        />
        <select
          value={topicFilter}
          onChange={e => setTopicFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All topics</option>
          {topics.map(t => <option key={t} value={t}>{TOPIC_LABELS[t] || t.replace(/_/g, " ")}</option>)}
        </select>
        <select
          value={jurisdictionFilter}
          onChange={e => setJurisdictionFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All jurisdictions</option>
          {jurisdictions.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <span className="text-xs text-gray-400 self-center ml-auto">{rules.length} rules</span>
      </div>

      {/* Rule cards */}
      <div className="space-y-2">
        {rules.map(rule => (
          <div
            key={rule.id}
            className="bg-white border rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
            onClick={() => navigate(`/rules/${rule.id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-gray-900">{rule.title}</div>
                <div className="text-xs text-gray-500 mt-0.5 font-mono">{rule.id}</div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TOPIC_COLORS[rule.topic] || "bg-gray-100 text-gray-700"}`}>
                  {TOPIC_LABELS[rule.topic] || rule.topic.replace(/_/g, " ")}
                </span>
              </div>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>📍 {rule.jurisdiction}</span>
              <span>📅 {rule.effectiveFrom}</span>
              <span>⚙️ {RESULT_TYPE_LABELS[rule.resultType] || rule.resultType}</span>
            </div>
            {rule.citations[0] && (
              <div className="mt-2 text-xs text-gray-400">
                📖 {rule.citations[0].source}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Tester View — Scenario evaluation
// ═══════════════════════════════════════════════════════════════════════

function TesterView({
  facts,
  canonicalFacts,
  scenarioFields,
  evalResult,
  evaluating,
  addScenarioField,
  removeScenarioField,
  updateScenarioField,
  handleEvaluate,
}: {
  facts: TsFact[];
  canonicalFacts: TsFact[];
  scenarioFields: { path: string; value: string }[];
  evalResult: EvalResponse | null;
  evaluating: boolean;
  addScenarioField: () => void;
  removeScenarioField: (i: number) => void;
  updateScenarioField: (i: number, key: "path" | "value", val: string) => void;
  handleEvaluate: () => void;
}) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-2">Scenario Tester</h2>
      <p className="text-sm text-gray-500 mb-4">
        Set fact values and evaluate all rules against the scenario.
      </p>

      {/* Scenario fields */}
      <div className="space-y-2 mb-4">
        {scenarioFields.map((field, i) => (
          <div key={i} className="flex gap-2 items-center">
            <select
              value={field.path}
              onChange={e => updateScenarioField(i, "path", e.target.value)}
              className="border rounded px-2 py-1.5 text-sm flex-1"
            >
              <option value="">Select fact...</option>
              {canonicalFacts.map(f => (
                <option key={f.path} value={f.path}>{f.path}</option>
              ))}
            </select>
            {(() => {
              const fact = facts.find(f => f.path === field.path);
              if (fact?.enumValues) {
                return (
                  <select
                    value={field.value}
                    onChange={e => updateScenarioField(i, "value", e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm w-40"
                  >
                    <option value="">Select...</option>
                    {fact.enumValues.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                );
              }
              return (
                <input
                  type="text"
                  value={field.value}
                  onChange={e => updateScenarioField(i, "value", e.target.value)}
                  placeholder={fact?.type === "boolean" ? "true/false" : fact?.type === "number" || fact?.type === "money" ? "0" : "value"}
                  className="border rounded px-2 py-1.5 text-sm w-40"
                />
              );
            })()}
            <button
              onClick={() => removeScenarioField(i)}
              className="text-red-400 hover:text-red-600 text-lg px-2"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={addScenarioField}
          className="px-3 py-1.5 text-sm font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          + Add Fact
        </button>
        <button
          onClick={handleEvaluate}
          disabled={evaluating}
          className={`px-4 py-2 text-sm font-medium rounded ${
            evaluating ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {evaluating ? "Evaluating..." : "Evaluate Rules"}
        </button>
      </div>

      {/* Results */}
      {evalResult && (
        <div>
          {/* Summary */}
          <div className="flex gap-4 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center flex-1">
              <div className="text-3xl font-bold text-red-700">{evalResult.summary.violations}</div>
              <div className="text-xs text-red-600 font-semibold uppercase mt-1">Violations</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center flex-1">
              <div className="text-3xl font-bold text-amber-700">{evalResult.summary.warnings}</div>
              <div className="text-xs text-amber-600 font-semibold uppercase mt-1">Warnings</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center flex-1">
              <div className="text-3xl font-bold text-green-700">{evalResult.summary.passed}</div>
              <div className="text-xs text-green-600 font-semibold uppercase mt-1">Passed</div>
            </div>
          </div>

          {/* Violations */}
          {evalResult.violations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-red-800 mb-2">Violations</h3>
              <div className="space-y-2">
                {evalResult.violations.map(r => (
                  <ResultCard key={r.ruleId} result={r} color="red" />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {evalResult.warnings.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">Warnings</h3>
              <div className="space-y-2">
                {evalResult.warnings.map(r => (
                  <ResultCard key={r.ruleId} result={r} color="amber" />
                ))}
              </div>
            </div>
          )}

          {/* Passed (collapsed) */}
          {evalResult.passed.length > 0 && (
            <details className="mb-6">
              <summary className="text-sm font-semibold text-gray-500 cursor-pointer hover:text-gray-700">
                Passed ({evalResult.passed.length} rules)
              </summary>
              <div className="space-y-1 mt-2">
                {evalResult.passed.map(r => (
                  <div key={r.ruleId} className="text-xs text-gray-500 py-0.5">
                    <span className="font-mono">{r.ruleId}</span> — {r.explanation}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result, color }: { result: EvalResult; color: "red" | "amber" }) {
  const bg = color === "red" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200";
  const text = color === "red" ? "text-red-800" : "text-amber-800";

  return (
    <div className={`border rounded-lg p-4 ${bg}`}>
      <div className={`font-medium ${text}`}>{result.title}</div>
      <div className="text-sm text-gray-600 mt-1">{result.explanation}</div>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span>Facts: {result.triggeredFacts.join(", ")}</span>
      </div>
      {result.citation && (
        <div className="mt-2 text-xs">
          {result.citation.url ? (
            <a href={result.citation.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
              📖 {result.citation.source}
            </a>
          ) : (
            <span className="text-gray-400">📖 {result.citation.source}</span>
          )}
        </div>
      )}
    </div>
  );
}
