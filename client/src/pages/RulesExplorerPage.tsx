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
  category: string | null;
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
// Rows come from data/taxonomy.json via /api/taxonomy: category > topic > sub-topic.

interface TaxonomyRow {
  id: string;        // taxonomy code
  label: string;
  level: number;     // 0 = category, 1 = topic, 2 = sub-topic
  parentId?: string;
  topics: string[];  // taxonomy code prefixes (rule.topic equals one, or starts with one + ".")
}

interface TaxonomyApi {
  version: string;
  categories: { code: string; name: string; topics: { code: string; name: string; subtopics: { code: string; name: string }[] }[] }[];
}

function buildTaxonomyRows(taxonomy: TaxonomyApi): TaxonomyRow[] {
  const rows: TaxonomyRow[] = [];
  taxonomy.categories.forEach((cat, ci) => {
    const c = `${ci + 1}`;
    if (cat.topics.length === 1) {
      // A category with one topic is one row: the category carries the topic's rules and sub-topics.
      const topic = cat.topics[0];
      rows.push({ id: cat.code, label: `${c}. ${cat.name}`, level: 0, topics: [topic.code] });
      topic.subtopics.forEach((sub, si) => {
        rows.push({ id: sub.code, label: `${c}.${si + 1} ${sub.name}`, level: 2, parentId: cat.code, topics: [sub.code] });
      });
      return;
    }
    rows.push({ id: cat.code, label: `${c}. ${cat.name}`, level: 0, topics: [] });
    cat.topics.forEach((topic, ti) => {
      const t = `${c}.${ti + 1}`;
      rows.push({ id: topic.code, label: `${t} ${topic.name}`, level: 1, parentId: cat.code, topics: [topic.code] });
      topic.subtopics.forEach((sub, si) => {
        rows.push({ id: sub.code, label: `${t}.${si + 1} ${sub.name}`, level: 2, parentId: topic.code, topics: [sub.code] });
      });
    });
  });
  return rows;
}

/** Rows that own sub-topic rows (topics, and single-topic categories). */
function parentRowIds(rows: TaxonomyRow[]): string[] {
  const parents = new Set(rows.filter(r => r.level === 2).map(r => r.parentId!));
  return rows.filter(r => parents.has(r.id)).map(r => r.id);
}

// ─── Taxonomy: Columns (Locations) ─────────────────────────────────

interface LocationColumn {
  id: string;
  label: string;
  level: number; // 0 = Federal, 1 = State, 2 = City/Local
  jurisdictions: string[]; // rule.jurisdiction values that map here
}

const LOCATION_TAXONOMY: LocationColumn[] = [
  // Federal
  { id: "fed", label: "Federal", level: 0, jurisdictions: ["Federal"] },

  // All 50 states + DC (alphabetical, with cities nested under parent state)
  { id: "al", label: "Alabama", level: 1, jurisdictions: ["AL"] },
  { id: "ak", label: "Alaska", level: 1, jurisdictions: ["AK"] },
  { id: "az", label: "Arizona", level: 1, jurisdictions: ["AZ"] },
  { id: "ar", label: "Arkansas", level: 1, jurisdictions: ["AR"] },
  { id: "ca", label: "California", level: 1, jurisdictions: ["CA"] },
  { id: "ca-belmont", label: "Belmont", level: 2, jurisdictions: ["Belmont"] },
  { id: "ca-berkeley", label: "Berkeley", level: 2, jurisdictions: ["Berkeley"] },
  { id: "ca-daly-city", label: "Daly City", level: 2, jurisdictions: ["Daly City"] },
  { id: "ca-emeryville", label: "Emeryville", level: 2, jurisdictions: ["Emeryville"] },
  { id: "ca-fremont", label: "Fremont", level: 2, jurisdictions: ["Fremont"] },
  { id: "ca-half-moon-bay", label: "Half Moon Bay", level: 2, jurisdictions: ["Half Moon Bay"] },
  { id: "ca-hayward", label: "Hayward", level: 2, jurisdictions: ["Hayward"] },
  { id: "ca-los-angeles", label: "Los Angeles", level: 2, jurisdictions: ["Los Angeles"] },
  { id: "ca-los-angeles-county", label: "Los Angeles County (unincorporated)", level: 2, jurisdictions: ["Los Angeles County"] },
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
  { id: "ct", label: "Connecticut", level: 1, jurisdictions: ["CT"] },
  { id: "de", label: "Delaware", level: 1, jurisdictions: ["DE"] },
  { id: "dc", label: "District of Columbia", level: 1, jurisdictions: ["DC"] },
  { id: "fl", label: "Florida", level: 1, jurisdictions: ["FL"] },
  { id: "ga", label: "Georgia", level: 1, jurisdictions: ["GA"] },
  { id: "hi", label: "Hawaii", level: 1, jurisdictions: ["HI"] },
  { id: "id", label: "Idaho", level: 1, jurisdictions: ["ID"] },
  { id: "il", label: "Illinois", level: 1, jurisdictions: ["IL"] },
  { id: "il-chicago", label: "Chicago", level: 2, jurisdictions: ["Chicago"] },
  { id: "il-evanston", label: "Evanston", level: 2, jurisdictions: ["Evanston"] },
  { id: "in", label: "Indiana", level: 1, jurisdictions: ["IN"] },
  { id: "ia", label: "Iowa", level: 1, jurisdictions: ["IA"] },
  { id: "ks", label: "Kansas", level: 1, jurisdictions: ["KS"] },
  { id: "ky", label: "Kentucky", level: 1, jurisdictions: ["KY"] },
  { id: "la", label: "Louisiana", level: 1, jurisdictions: ["LA"] },
  { id: "me", label: "Maine", level: 1, jurisdictions: ["ME"] },
  { id: "md", label: "Maryland", level: 1, jurisdictions: ["MD"] },
  { id: "md-montgomery", label: "Montgomery County", level: 2, jurisdictions: ["Montgomery County"] },
  { id: "ma", label: "Massachusetts", level: 1, jurisdictions: ["MA"] },
  { id: "mi", label: "Michigan", level: 1, jurisdictions: ["MI"] },
  { id: "mn", label: "Minnesota", level: 1, jurisdictions: ["MN"] },
  { id: "mn-minneapolis", label: "Minneapolis", level: 2, jurisdictions: ["Minneapolis"] },
  { id: "ms", label: "Mississippi", level: 1, jurisdictions: ["MS"] },
  { id: "mo", label: "Missouri", level: 1, jurisdictions: ["MO"] },
  { id: "mt", label: "Montana", level: 1, jurisdictions: ["MT"] },
  { id: "ne", label: "Nebraska", level: 1, jurisdictions: ["NE"] },
  { id: "nv", label: "Nevada", level: 1, jurisdictions: ["NV"] },
  { id: "nh", label: "New Hampshire", level: 1, jurisdictions: ["NH"] },
  { id: "nj", label: "New Jersey", level: 1, jurisdictions: ["NJ"] },
  { id: "nm", label: "New Mexico", level: 1, jurisdictions: ["NM"] },
  { id: "ny", label: "New York", level: 1, jurisdictions: ["NY"] },
  { id: "ny-nyc", label: "New York City", level: 2, jurisdictions: ["New York City"] },
  { id: "nc", label: "North Carolina", level: 1, jurisdictions: ["NC"] },
  { id: "nd", label: "North Dakota", level: 1, jurisdictions: ["ND"] },
  { id: "oh", label: "Ohio", level: 1, jurisdictions: ["OH"] },
  { id: "ok", label: "Oklahoma", level: 1, jurisdictions: ["OK"] },
  { id: "or", label: "Oregon", level: 1, jurisdictions: ["OR"] },
  { id: "or-portland", label: "Portland Metro Area", level: 2, jurisdictions: ["Portland Metro Area"] },
  { id: "pa", label: "Pennsylvania", level: 1, jurisdictions: ["PA"] },
  { id: "pa-philadelphia", label: "Philadelphia", level: 2, jurisdictions: ["Philadelphia"] },
  { id: "ri", label: "Rhode Island", level: 1, jurisdictions: ["RI"] },
  { id: "sc", label: "South Carolina", level: 1, jurisdictions: ["SC"] },
  { id: "sd", label: "South Dakota", level: 1, jurisdictions: ["SD"] },
  { id: "tn", label: "Tennessee", level: 1, jurisdictions: ["TN"] },
  { id: "tx", label: "Texas", level: 1, jurisdictions: ["TX"] },
  { id: "ut", label: "Utah", level: 1, jurisdictions: ["UT"] },
  { id: "vt", label: "Vermont", level: 1, jurisdictions: ["VT"] },
  { id: "va", label: "Virginia", level: 1, jurisdictions: ["VA"] },
  { id: "wa", label: "Washington", level: 1, jurisdictions: ["WA"] },
  { id: "wa-seattle", label: "Seattle", level: 2, jurisdictions: ["Seattle"] },
  { id: "wv", label: "West Virginia", level: 1, jurisdictions: ["WV"] },
  { id: "wi", label: "Wisconsin", level: 1, jurisdictions: ["WI"] },
  { id: "wy", label: "Wyoming", level: 1, jurisdictions: ["WY"] },
];

// ─── Constants ─────────────────────────────────────────────────────

/** Badge colours keyed by taxonomy topic code (the first two segments of rule.topic). */
const TOPIC_COLORS: Record<string, string> = {
  "pay.overtime": "bg-orange-100 text-orange-800",
  "pay.minimum_wage": "bg-green-100 text-green-800",
  "pay.tipped": "bg-lime-100 text-lime-800",
  "pay.premium": "bg-indigo-100 text-indigo-800",
  "sched.predictive": "bg-purple-100 text-purple-800",
  "sched.meal_break": "bg-yellow-100 text-yellow-800",
  "sched.rest_break": "bg-amber-100 text-amber-800",
  "sched.shift_structure": "bg-rose-100 text-rose-800",
  "sched.hour_limits": "bg-fuchsia-100 text-fuchsia-800",
  "leave.family_medical": "bg-pink-100 text-pink-800",
  "leave.sick": "bg-teal-100 text-teal-800",
  "leave.personal": "bg-cyan-100 text-cyan-800",
  "minor.labor": "bg-sky-100 text-sky-800",
  "sep.warn": "bg-red-100 text-red-800",
  "sep.final_pay": "bg-stone-200 text-stone-800",
  "pay.wage_protection": "bg-fuchsia-100 text-fuchsia-800",
  "pay.compensable_time": "bg-lime-100 text-lime-800",
};

/** "pay.minimum_wage.general" -> "pay.minimum_wage" */
function topicCodeOf(topic: string): string {
  return topic.split(".").slice(0, 2).join(".");
}

/** Does a rule topic fall under a taxonomy row's code prefix? */
function topicMatches(ruleTopic: string, prefix: string): boolean {
  return ruleTopic === prefix || ruleTopic.startsWith(prefix + ".");
}

/** Human-readable label for a code: "pay.minimum_wage.general" -> "minimum wage · general" */
function topicLabel(topic: string): string {
  return topic.split(".").slice(1).map(s => s.replace(/_/g, " ")).join(" · ") || topic;
}

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
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white font-bold text-xl shadow-sm">§</div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Employment Law Rules Engine</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {rules.length} rules · {canonicalFacts.length} facts · {topics.length} topics · {jurisdictions.length} jurisdictions
              </p>
            </div>
          </div>
          <a href="/workbench" className="btn-primary">
            Compliance Workbench →
          </a>
        </div>
        <div className="flex gap-1 mt-5">
          {(["matrix", "list", "tester"] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === v ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
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

interface CoverageData {
  states: string[];
  topics: string[];
  /** Taxonomy topic code -> the coverage-matrix rows (legacy topic names) it covers */
  rowsByTopicCode: Record<string, string[]>;
  summary: { total_cells: number; has_rule: number; no_law: number; not_checked: number; coverage_percent: number };
  matrix: Record<string, Record<string, { status: "has_rule" | "no_law" | "not_checked" }>>;
}

function MatrixView({ rules, navigate }: { rules: TsRule[]; navigate: (path: string) => void }) {
  const [populatedOnly, setPopulatedOnly] = useState(true);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [lawTaxonomy, setLawTaxonomy] = useState<TaxonomyRow[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/coverage").then(r => r.json()).then(setCoverage).catch(() => {});
    fetch("/api/taxonomy").then(r => r.json()).then((t: TaxonomyApi) => {
      const rows = buildTaxonomyRows(t);
      setLawTaxonomy(rows);
      setExpandedTopics(new Set(parentRowIds(rows)));
    }).catch(() => {});
  }, []);

  function toggleTopic(id: string) {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  const subtopicCount = useMemo(() => lawTaxonomy.filter(r => r.level === 2).length, [lawTaxonomy]);
  // Topics include the ones shown as their single-topic category row (level 0 with a topic code).
  const topicCount = useMemo(() => lawTaxonomy.filter(r => r.level !== 2 && r.topics.length > 0).length, [lawTaxonomy]);
  const hasSubtopics = (row: TaxonomyRow) => lawTaxonomy.some(r => r.parentId === row.id);

  // Build lookup: for each (taxonomyRow, locationCol) → matching rules
  const cellMap = useMemo(() => {
    const map = new Map<string, TsRule[]>();
    for (const rule of rules) {
      for (const row of lawTaxonomy) {
        if (!row.topics.some(t => topicMatches(rule.topic, t))) continue;
        for (const col of LOCATION_TAXONOMY) {
          if (!col.jurisdictions.includes(rule.jurisdiction)) continue;
          const key = `${row.id}::${col.id}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(rule);
        }
      }
    }
    return map;
  }, [rules, lawTaxonomy]);

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

  // Filter rows: sub-topics show only under an expanded topic; with "populated only",
  // a row shows when it or a descendant has rules.
  const visibleRows = useMemo(() => {
    const populated = (row: TaxonomyRow): boolean =>
      populatedRows.has(row.id) || lawTaxonomy.some(child => child.parentId === row.id && populated(child));
    return lawTaxonomy.filter(row => {
      if (row.level === 2 && !expandedTopics.has(row.parentId ?? "")) return false;
      if (!populatedOnly) return true;
      return populated(row);
    });
  }, [populatedOnly, populatedRows, lawTaxonomy, expandedTopics]);

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

  // Helper: look up coverage status for an empty cell
  function getCoverageStatus(row: TaxonomyRow, col: LocationColumn): "no_law" | "not_checked" | null {
    if (!coverage || row.level === 2 || row.topics.length === 0) return null;
    // Map the location column to a state code (only works for state-level columns)
    const jurisdiction = col.jurisdictions[0];
    if (!jurisdiction || !coverage.matrix[jurisdiction]) return null;
    // The coverage matrix is keyed by its own row names; check each one that falls under this taxonomy row
    const matrixRows = Object.entries(coverage.rowsByTopicCode ?? {})
      .filter(([code]) => row.topics.some(prefix => topicMatches(code, prefix)))
      .flatMap(([, rows]) => rows);
    for (const topic of matrixRows) {
      const cell = coverage.matrix[jurisdiction]?.[topic];
      if (cell) return cell.status === "no_law" ? "no_law" : "not_checked";
    }
    return null;
  }

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
          {visibleRows.length} rows × {visibleCols.length} columns · {cellMap.size} populated cells · taxonomy: {topicCount} topics, {subtopicCount} sub-topics
        </span>
        <button
          type="button"
          onClick={() => setExpandedTopics(expandedTopics.size ? new Set() : new Set(parentRowIds(lawTaxonomy)))}
          className="text-xs text-blue-600 hover:underline"
        >
          {expandedTopics.size ? "Collapse sub-topics" : "Expand all sub-topics"}
        </button>
        {coverage && (
          <span className="text-xs text-gray-400 ml-auto flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block"></span> No law</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200 inline-block"></span> Not yet checked</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span> Has rule</span>
            <span className="ml-2 font-medium">{coverage.summary.coverage_percent}% resolved</span>
          </span>
        )}
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
              <tr key={row.id} className={row.level === 0 ? "bg-gray-50" : row.level === 2 ? "text-[11px]" : ""}>
                <td
                  className={`sticky left-0 z-10 border px-3 py-2 bg-white ${
                    row.level === 0 ? "font-bold text-sm" : "font-normal"
                  }`}
                  style={{ paddingLeft: `${12 + row.level * 16}px` }}
                >
                  {row.level !== 2 && hasSubtopics(row) ? (
                    <button type="button" onClick={() => toggleTopic(row.id)} className="inline-flex items-center gap-1 hover:text-blue-700" title={expandedTopics.has(row.id) ? "Hide sub-topics" : "Show sub-topics"}>
                      <span className="text-gray-400 w-3 inline-block">{expandedTopics.has(row.id) ? "▾" : "▸"}</span>
                      {row.label}
                    </button>
                  ) : (
                    <span className={row.level === 2 ? "text-gray-600" : ""}>{row.label}</span>
                  )}
                </td>
                {visibleCols.map(col => {
                  const key = `${row.id}::${col.id}`;
                  const cellRules = cellMap.get(key);

                  if (!cellRules || cellRules.length === 0) {
                    const status = getCoverageStatus(row, col);
                    const cellClass = status === "no_law"
                      ? "border text-center bg-gray-50"
                      : status === "not_checked"
                      ? "border text-center bg-amber-50"
                      : "border text-center";
                    const cellContent = row.topics.length === 0 ? null
                      : status === "no_law" ? <span className="text-gray-300 text-[10px]" title="No state law exists">—</span>
                      : status === "not_checked" ? <span className="text-amber-400 text-[10px]" title="Law exists, rule not yet encoded">?</span>
                      : <span className="text-gray-200">—</span>;
                    return (
                      <td key={col.id} className={cellClass}>
                        {cellContent}
                      </td>
                    );
                  }

                  return (
                    <CellButton key={col.id} rules={cellRules} navigate={navigate} />
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

function CellButton({ rules, navigate }: { rules: TsRule[]; navigate: (path: string) => void }) {
  const [open, setOpen] = useState(false);

  if (rules.length === 1) {
    return (
      <td className="border text-center">
        <button
          onClick={() => navigate(`/rules/${rules[0].id}`)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold hover:bg-blue-600"
        >
          1
        </button>
      </td>
    );
  }

  return (
    <td className="border text-center relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold hover:bg-blue-600"
      >
        {rules.length}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[240px]">
            {rules.map(r => (
              <button
                key={r.id}
                onClick={() => { setOpen(false); navigate(`/rules/${r.id}`); }}
                className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 rounded"
              >
                {r.title}
              </button>
            ))}
          </div>
        </>
      )}
    </td>
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
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
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
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TOPIC_COLORS[topicCodeOf(rule.topic)] || "bg-gray-100 text-gray-700"}`}>
                {topicLabel(rule.topic)}
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
  // Group facts by category for the dropdown
  const factsByCategory = useMemo(() => {
    const groups: Record<string, TsFact[]> = {};
    for (const f of canonicalFacts) {
      const cat = f.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [canonicalFacts]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-2">Scenario Tester</h2>
      <p className="text-sm text-gray-500 mb-4">Set fact values and evaluate all rules against the scenario.</p>

      <div className="space-y-2 mb-4">
        {scenarioFields.map((field, i) => {
          const selectedFact = facts.find(f => f.path === field.path);
          return (
            <div key={i} className="flex gap-2 items-center">
              <select value={field.path} onChange={e => updateScenarioField(i, "path", e.target.value)} className="border rounded px-2 py-1.5 text-sm flex-1">
                <option value="">Select fact...</option>
                {factsByCategory.map(([category, catFacts]) => (
                  <optgroup key={category} label={category}>
                    {catFacts.map(f => (
                      <option key={f.path} value={f.path}>{f.path} — {f.description}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {(() => {
                if (selectedFact?.enumValues) {
                  return (
                    <select value={field.value} onChange={e => updateScenarioField(i, "value", e.target.value)} className="border rounded px-2 py-1.5 text-sm w-44">
                      <option value="">Select...</option>
                      {selectedFact.enumValues.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  );
                }
                if (selectedFact?.type === "boolean") {
                  return (
                    <select value={field.value} onChange={e => updateScenarioField(i, "value", e.target.value)} className="border rounded px-2 py-1.5 text-sm w-44">
                      <option value="">Select...</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  );
                }
                return (
                  <input
                    type="text"
                    value={field.value}
                    onChange={e => updateScenarioField(i, "value", e.target.value)}
                    placeholder={selectedFact?.type === "number" || selectedFact?.type === "money" ? "0" : selectedFact?.type === "date" ? "YYYY-MM-DD" : "value"}
                    className="border rounded px-2 py-1.5 text-sm w-44"
                  />
                );
              })()}
              <span className="text-[10px] text-gray-400 w-14 text-center">{selectedFact?.type || ""}</span>
              <button onClick={() => removeScenarioField(i)} className="text-red-400 hover:text-red-600 text-lg px-2">×</button>
            </div>
          );
        })}
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
