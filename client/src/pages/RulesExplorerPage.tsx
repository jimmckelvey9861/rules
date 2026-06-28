import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ─── Types ─────────────────────────────────────────────────────────

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

// ─── Taxonomy: Rows (Law Categories) ───────────────────────────────

interface TaxonomyRow {
  id: string;
  label: string;
  level: number; // 0 = top, 1 = section, 2 = leaf
  topics: string[]; // rule.topic values that map here
}

const LAW_TAXONOMY: TaxonomyRow[] = [
  { id: "1", label: "1. Compensation & Pay", level: 0, topics: [] },
  { id: "1.1", label: "1.1 Minimum Wage", level: 1, topics: ["minimum_wage"] },
  { id: "1.2", label: "1.2 Tipped Compensation", level: 1, topics: ["tipped_compensation"] },
  { id: "1.3", label: "1.3 Overtime", level: 1, topics: ["overtime"] },
  { id: "1.4", label: "1.4 Premium Pay", level: 1, topics: ["premium_pay", "split_shift_premium", "reporting_time_pay"] },
  { id: "1.5", label: "1.5 Compensable Time", level: 1, topics: ["compensable_time"] },
  { id: "1.6", label: "1.6 Reimbursements & Allowances", level: 1, topics: ["reimbursement"] },
  { id: "1.7", label: "1.7 Equal Pay & Wage Protections", level: 1, topics: ["equal_pay", "pay_frequency"] },

  { id: "2", label: "2. Scheduling & Hours", level: 0, topics: [] },
  { id: "2.1", label: "2.1 Meal Breaks", level: 1, topics: ["meal_break"] },
  { id: "2.2", label: "2.2 Rest Breaks", level: 1, topics: ["rest_break"] },
  { id: "2.3", label: "2.3 Predictive Scheduling", level: 1, topics: ["predictive_scheduling"] },
  { id: "2.4", label: "2.4 Shift Structure Rules", level: 1, topics: ["shift_structure"] },
  { id: "2.5", label: "2.5 Hour Limits", level: 1, topics: ["hour_limits"] },
  { id: "2.6", label: "2.6 Availability & Flex Scheduling", level: 1, topics: ["flex_scheduling"] },

  { id: "3", label: "3. Leave & Time Off", level: 0, topics: [] },
  { id: "3.1", label: "3.1 Sick Leave", level: 1, topics: ["sick_leave"] },
  { id: "3.2", label: "3.2 Family & Medical Leave", level: 1, topics: ["family_medical_leave"] },
  { id: "3.3", label: "3.3 Personal Leave", level: 1, topics: ["personal_leave"] },
  { id: "3.4", label: "3.4 Safety & Emergency Leave", level: 1, topics: ["emergency_leave"] },
  { id: "3.5", label: "3.5 Leave Administration", level: 1, topics: ["leave_admin"] },

  { id: "4", label: "4. Minor Employment", level: 0, topics: ["minor_labor"] },

  { id: "5", label: "5. Hiring & Onboarding", level: 0, topics: ["hiring"] },

  { id: "6", label: "6. Workplace Protections", level: 0, topics: ["workplace_protections"] },

  { id: "7", label: "7. Separation & Final Pay", level: 0, topics: [] },
  { id: "7.1", label: "7.1 Final Compensation", level: 1, topics: ["final_pay"] },
  { id: "7.2", label: "7.2 Separation Procedures", level: 1, topics: ["separation"] },
  { id: "7.3", label: "7.3 Mass Layoffs & Closures", level: 1, topics: ["warn_act"] },
  { id: "7.4", label: "7.4 Post-Employment Restrictions", level: 1, topics: ["post_employment"] },
  { id: "7.5", label: "7.5 Record Retention", level: 1, topics: ["record_retention"] },

  { id: "8", label: "8. Employer Coverage & Compliance", level: 0, topics: ["compliance"] },

  { id: "9", label: "9. Industry-Specific Rules", level: 0, topics: ["industry_specific"] },
];

// ─── Taxonomy: Columns (Locations) ─────────────────────────────────

interface LocationColumn {
  id: string;
  label: string;
  level: number; // 0 = Federal, 1 = State, 2 = City/Local
  jurisdictions: string[]; // rule.jurisdiction values that map here
}

const LOCATION_TAXONOMY: LocationColumn[] = [
  { id: "fed", label: "Federal", level: 0, jurisdictions: ["Federal"] },
  { id: "ak", label: "Alaska", level: 1, jurisdictions: ["AK"] },
  { id: "ca", label: "California", level: 1, jurisdictions: ["CA"] },
  { id: "ca-belmont", label: "Belmont", level: 2, jurisdictions: ["Belmont"] },
  { id: "ca-daly-city", label: "Daly City", level: 2, jurisdictions: ["Daly City"] },
  { id: "ca-fremont", label: "Fremont", level: 2, jurisdictions: ["Fremont"] },
  { id: "ca-half-moon-bay", label: "Half Moon Bay", level: 2, jurisdictions: ["Half Moon Bay"] },
  { id: "ca-hayward", label: "Hayward", level: 2, jurisdictions: ["Hayward"] },
  { id: "ca-los-angeles", label: "Los Angeles", level: 2, jurisdictions: ["Los Angeles"] },
  { id: "ca-malibu", label: "Malibu", level: 2, jurisdictions: ["Malibu"] },
  { id: "ca-novato", label: "Novato", level: 2, jurisdictions: ["Novato"] },
  { id: "ca-pasadena", label: "Pasadena", level: 2, jurisdictions: ["Pasadena"] },
  { id: "ca-redwood-city", label: "Redwood City", level: 2, jurisdictions: ["Redwood City"] },
  { id: "ca-richmond", label: "Richmond", level: 2, jurisdictions: ["Richmond"] },
  { id: "ca-san-carlos", label: "San Carlos", level: 2, jurisdictions: ["San Carlos"] },
  { id: "ca-san-francisco", label: "San Francisco", level: 2, jurisdictions: ["San Francisco"] },
  { id: "ca-san-jose", label: "San Jose", level: 2, jurisdictions: ["San Jose"] },
  { id: "ca-santa-clara", label: "Santa Clara", level: 2, jurisdictions: ["Santa Clara"] },
  { id: "ca-sunnyvale", label: "Sunnyvale", level: 2, jurisdictions: ["Sunnyvale"] },
  { id: "ca-west-hollywood", label: "West Hollywood", level: 2, jurisdictions: ["West Hollywood"] },
  { id: "co", label: "Colorado", level: 1, jurisdictions: ["CO"] },
  { id: "co-boulder", label: "Boulder", level: 2, jurisdictions: ["Boulder"] },
  { id: "co-denver", label: "Denver", level: 2, jurisdictions: ["Denver"] },
  { id: "hi", label: "Hawaii", level: 1, jurisdictions: ["HI"] },
  { id: "mn", label: "Minnesota", level: 1, jurisdictions: ["MN"] },
  { id: "mn-minneapolis", label: "Minneapolis", level: 2, jurisdictions: ["Minneapolis"] },
  { id: "nm", label: "New Mexico", level: 1, jurisdictions: ["NM"] },
  { id: "ny", label: "New York", level: 1, jurisdictions: ["NY"] },
  { id: "ny-nyc", label: "New York City", level: 2, jurisdictions: ["New York City"] },
  { id: "or", label: "Oregon", level: 1, jurisdictions: ["OR"] },
  { id: "or-portland", label: "Portland Metro Area", level: 2, jurisdictions: ["Portland Metro Area"] },
  { id: "wa", label: "Washington", level: 1, jurisdictions: ["WA"] },
  { id: "wa-seattle", label: "Seattle", level: 2, jurisdictions: ["Seattle"] },
];

// ─── Constants ─────────────────────────────────────────────────────

const TOPIC_COLORS: Record<string, string> = {
  overtime: "bg-orange-100 text-orange-800",
  minimum_wage: "bg-green-100 text-green-800",
  predictive_scheduling: "bg-purple-100 text-purple-800",
  meal_break: "bg-yellow-100 text-yellow-800",
  family_medical_leave: "bg-pink-100 text-pink-800",
  warn_act: "bg-red-100 text-red-800",
};

const RESULT_TYPE_LABELS: Record<string, string> = {
  premium_required: "Premium Required",
  minimum_required_value: "Minimum Value",
  required_break: "Required Break",
  prohibition: "Prohibition",
  warning: "Warning",
};

type ViewMode = "matrix" | "list" | "tester";

// ─── Main Component ────────────────────────────────────────────────

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

  // Scenario tester helpers
  function addScenarioField() { setScenarioFields([...scenarioFields, { path: "", value: "" }]); }
  function removeScenarioField(index: number) { setScenarioFields(scenarioFields.filter((_, i) => i !== index)); }
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
      if (res.ok) setEvalResult(await res.json());
    } catch {}
    setEvaluating(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p className="text-gray-500 text-lg">Loading rules...</p></div>;
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
        <div className="flex gap-1 mt-4">
          {(["matrix", "list", "tester"] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium rounded-t ${view === v ? "bg-white border border-b-0 text-gray-900" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {v === "matrix" ? "Coverage Matrix" : v === "list" ? "Rule List" : "Scenario Tester"}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {view === "matrix" && <MatrixView rules={rules} navigate={navigate} />}
        {view === "list" && (
          <ListView rules={filteredRules} topics={topics} jurisdictions={jurisdictions}
            topicFilter={topicFilter} jurisdictionFilter={jurisdictionFilter} search={search}
            setTopicFilter={setTopicFilter} setJurisdictionFilter={setJurisdictionFilter}
            setSearch={setSearch} navigate={navigate} />
        )}
        {view === "tester" && (
          <TesterView facts={facts} canonicalFacts={canonicalFacts} scenarioFields={scenarioFields}
            evalResult={evalResult} evaluating={evaluating} addScenarioField={addScenarioField}
            removeScenarioField={removeScenarioField} updateScenarioField={updateScenarioField}
            handleEvaluate={handleEvaluate} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Matrix View — Law Taxonomy rows × Location Ontology columns
// ═══════════════════════════════════════════════════════════════════════

function MatrixView({ rules, navigate }: { rules: TsRule[]; navigate: (path: string) => void }) {
  const [populatedOnly, setPopulatedOnly] = useState(true);

  // Build lookup: for each (taxonomyRow, locationCol) → matching rules
  const cellMap = useMemo(() => {
    const map = new Map<string, TsRule[]>();
    for (const rule of rules) {
      for (const row of LAW_TAXONOMY) {
        if (!row.topics.includes(rule.topic)) continue;
        for (const col of LOCATION_TAXONOMY) {
          if (!col.jurisdictions.includes(rule.jurisdiction)) continue;
          const key = `${row.id}::${col.id}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(rule);
        }
      }
    }
    return map;
  }, [rules]);

  // Determine which rows and columns have data
  const populatedRows = useMemo(() => {
    const ids = new Set<string>();
    for (const key of cellMap.keys()) {
      ids.add(key.split("::")[0]);
    }
    return ids;
  }, [cellMap]);

  const populatedCols = useMemo(() => {
    const ids = new Set<string>();
    for (const key of cellMap.keys()) {
      ids.add(key.split("::")[1]);
    }
    return ids;
  }, [cellMap]);

  // Filter rows: show populated rows + their parent headers
  const visibleRows = useMemo(() => {
    if (!populatedOnly) return LAW_TAXONOMY;
    return LAW_TAXONOMY.filter(row => {
      if (populatedRows.has(row.id)) return true;
      // Show parent (level 0) if any child is populated
      if (row.level === 0) {
        return LAW_TAXONOMY.some(child =>
          child.id.startsWith(row.id + ".") && populatedRows.has(child.id)
        );
      }
      return false;
    });
  }, [populatedOnly, populatedRows]);

  const visibleCols = useMemo(() => {
    if (!populatedOnly) return LOCATION_TAXONOMY;
    return LOCATION_TAXONOMY.filter(col => {
      if (populatedCols.has(col.id)) return true;
      // Show state header if any city under it is populated
      if (col.level === 1) {
        const statePrefix = col.id + "-";
        return LOCATION_TAXONOMY.some(child =>
          child.id.startsWith(statePrefix) && populatedCols.has(child.id)
        );
      }
      return false;
    });
  }, [populatedOnly, populatedCols]);

  return (
    <div className="p-4">
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={populatedOnly}
            onChange={e => setPopulatedOnly(e.target.checked)}
            className="rounded"
          />
          Show only populated cells
        </label>
        <span className="text-xs text-gray-400">
          {visibleRows.length} rows × {visibleCols.length} columns · {cellMap.size} populated cells
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[calc(100vh-220px)] border rounded-lg">
        <table className="border-collapse text-xs w-full">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 bg-gray-100 border px-3 py-2 text-left min-w-[240px] max-w-[300px]">
                Law Category
              </th>
              {visibleCols.map(col => (
                <th
                  key={col.id}
                  className={`border px-2 py-2 text-center whitespace-nowrap font-medium ${
                    col.level === 0 ? "bg-blue-50 text-blue-800" :
                    col.level === 1 ? "bg-green-50 text-green-800" :
                    "bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="max-w-[80px] truncate text-[11px]" title={col.label}>
                    {col.label}
                  </div>
                  <div className="text-[9px] font-normal opacity-60">
                    {col.level === 0 ? "" : col.level === 1 ? "state" : "local"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(row => (
              <tr key={row.id} className={row.level === 0 ? "bg-gray-50" : ""}>
                <td
                  className={`sticky left-0 z-10 border px-3 py-2 bg-white ${
                    row.level === 0 ? "font-bold text-sm" : "font-normal"
                  }`}
                  style={{ paddingLeft: `${12 + row.level * 16}px` }}
                >
                  {row.label}
                </td>
                {visibleCols.map(col => {
                  const key = `${row.id}::${col.id}`;
                  const cellRules = cellMap.get(key);

                  if (!cellRules || cellRules.length === 0) {
                    return (
                      <td key={col.id} className="border text-center">
                        {row.level === 0 ? null : <span className="text-gray-200">—</span>}
                      </td>
                    );
                  }

                  return (
                    <td key={col.id} className="border text-center">
                      <button
                        onClick={() => {
                          if (cellRules.length === 1) navigate(`/rules/${cellRules[0].id}`);
                          // TODO: multi-rule cell popup
                        }}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold hover:bg-blue-600"
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
// List View
// ═══════════════════════════════════════════════════════════════════════

function ListView({ rules, topics, jurisdictions, topicFilter, jurisdictionFilter, search, setTopicFilter, setJurisdictionFilter, setSearch, navigate }: {
  rules: TsRule[]; topics: string[]; jurisdictions: string[];
  topicFilter: string; jurisdictionFilter: string; search: string;
  setTopicFilter: (v: string) => void; setJurisdictionFilter: (v: string) => void; setSearch: (v: string) => void;
  navigate: (path: string) => void;
}) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex gap-2 mb-4 flex-wrap">
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="border rounded px-3 py-1.5 text-sm w-48" />
        <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
          <option value="">All topics</option>
          {topics.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select value={jurisdictionFilter} onChange={e => setJurisdictionFilter(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
          <option value="">All jurisdictions</option>
          {jurisdictions.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <span className="text-xs text-gray-400 self-center ml-auto">{rules.length} rules</span>
      </div>
      <div className="space-y-2">
        {rules.map(rule => (
          <div key={rule.id} className="bg-white border rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all" onClick={() => navigate(`/rules/${rule.id}`)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-gray-900">{rule.title}</div>
                <div className="text-xs text-gray-500 mt-0.5 font-mono">{rule.id}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TOPIC_COLORS[rule.topic] || "bg-gray-100 text-gray-700"}`}>
                {rule.topic.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>📍 {rule.jurisdiction}</span>
              <span>📅 {rule.effectiveFrom}</span>
              <span>⚙️ {RESULT_TYPE_LABELS[rule.resultType] || rule.resultType}</span>
            </div>
            {rule.citations[0] && <div className="mt-2 text-xs text-gray-400">📖 {rule.citations[0].source}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Tester View
// ═══════════════════════════════════════════════════════════════════════

function TesterView({ facts, canonicalFacts, scenarioFields, evalResult, evaluating, addScenarioField, removeScenarioField, updateScenarioField, handleEvaluate }: {
  facts: TsFact[]; canonicalFacts: TsFact[];
  scenarioFields: { path: string; value: string }[];
  evalResult: EvalResponse | null; evaluating: boolean;
  addScenarioField: () => void; removeScenarioField: (i: number) => void;
  updateScenarioField: (i: number, key: "path" | "value", val: string) => void;
  handleEvaluate: () => void;
}) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-2">Scenario Tester</h2>
      <p className="text-sm text-gray-500 mb-4">Set fact values and evaluate all rules against the scenario.</p>

      <div className="space-y-2 mb-4">
        {scenarioFields.map((field, i) => (
          <div key={i} className="flex gap-2 items-center">
            <select value={field.path} onChange={e => updateScenarioField(i, "path", e.target.value)} className="border rounded px-2 py-1.5 text-sm flex-1">
              <option value="">Select fact...</option>
              {canonicalFacts.map(f => <option key={f.path} value={f.path}>{f.path}</option>)}
            </select>
            {(() => {
              const fact = facts.find(f => f.path === field.path);
              if (fact?.enumValues) {
                return (
                  <select value={field.value} onChange={e => updateScenarioField(i, "value", e.target.value)} className="border rounded px-2 py-1.5 text-sm w-40">
                    <option value="">Select...</option>
                    {fact.enumValues.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                );
              }
              return <input type="text" value={field.value} onChange={e => updateScenarioField(i, "value", e.target.value)} placeholder="value" className="border rounded px-2 py-1.5 text-sm w-40" />;
            })()}
            <button onClick={() => removeScenarioField(i)} className="text-red-400 hover:text-red-600 text-lg px-2">×</button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={addScenarioField} className="px-3 py-1.5 text-sm font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200">+ Add Fact</button>
        <button onClick={handleEvaluate} disabled={evaluating} className={`px-4 py-2 text-sm font-medium rounded ${evaluating ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
          {evaluating ? "Evaluating..." : "Evaluate Rules"}
        </button>
      </div>

      {evalResult && (
        <div>
          <div className="flex gap-4 mb-6">
            <SummaryCard count={evalResult.summary.violations} label="Violations" color="red" />
            <SummaryCard count={evalResult.summary.warnings} label="Warnings" color="amber" />
            <SummaryCard count={evalResult.summary.passed} label="Passed" color="green" />
          </div>
          {evalResult.violations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-red-800 mb-2">Violations</h3>
              <div className="space-y-2">{evalResult.violations.map(r => <ResultCard key={r.ruleId} result={r} color="red" />)}</div>
            </div>
          )}
          {evalResult.warnings.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">Warnings</h3>
              <div className="space-y-2">{evalResult.warnings.map(r => <ResultCard key={r.ruleId} result={r} color="amber" />)}</div>
            </div>
          )}
          {evalResult.passed.length > 0 && (
            <details className="mb-6">
              <summary className="text-sm font-semibold text-gray-500 cursor-pointer hover:text-gray-700">Passed ({evalResult.passed.length} rules)</summary>
              <div className="space-y-1 mt-2">
                {evalResult.passed.map(r => <div key={r.ruleId} className="text-xs text-gray-500 py-0.5"><span className="font-mono">{r.ruleId}</span> — {r.explanation}</div>)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ count, label, color }: { count: number; label: string; color: "red" | "amber" | "green" }) {
  const styles = {
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    green: "bg-green-50 border-green-200 text-green-700",
  };
  return (
    <div className={`border rounded-lg px-4 py-3 text-center flex-1 ${styles[color]}`}>
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-xs font-semibold uppercase mt-1">{label}</div>
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
            <a href={result.citation.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">📖 {result.citation.source}</a>
          ) : (
            <span className="text-gray-400">📖 {result.citation.source}</span>
          )}
        </div>
      )}
    </div>
  );
}
