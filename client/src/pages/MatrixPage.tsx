import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface Jurisdiction {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  parentId: string | null;
  state: string | null;
  sortOrder: number;
}

interface LawCategory {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
}

interface CellData {
  count: number;
  lawSourceIds: string[];
  titles: string[];
  verificationStatus?: string;
}

interface CandidateCellData {
  count: number;
  primaryTitle: string | null;
  primaryId: string;
  autoApprovalStatus?: string;
}

interface InvestigatedCell {
  status: string;
  notes: string | null;
}

interface MatrixData {
  categories: LawCategory[];
  jurisdictions: Jurisdiction[];
  cells: Record<string, CellData>;
  candidateCells: Record<string, CandidateCellData>;
  investigatedCells: Record<string, InvestigatedCell>;
}

const TYPE_COLORS: Record<string, string> = {
  federal: "bg-blue-100 text-blue-800",
  federal_agency: "bg-blue-50 text-blue-600",
  state: "bg-green-100 text-green-800",
  state_agency: "bg-green-50 text-green-600",
  county: "bg-yellow-100 text-yellow-800",
  municipality: "bg-orange-100 text-orange-800",
  city: "bg-orange-100 text-orange-800",
  special_district: "bg-purple-100 text-purple-800",
  tribal_nation: "bg-red-100 text-red-800",
  coverage_region: "bg-teal-100 text-teal-800",
  country: "bg-gray-100 text-gray-800",
};

export function MatrixPage() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [populatedOnly, setPopulatedOnly] = useState(() => localStorage.getItem("matrix_populatedOnly") === "true");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/matrix")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  // Derive unique states and types for filters
  const states = useMemo(() => {
    if (!data) return [];
    const s = new Set(data.jurisdictions.map((j) => j.state).filter(Boolean));
    return Array.from(s).sort() as string[];
  }, [data]);

  const types = useMemo(() => {
    if (!data) return [];
    const t = new Set(data.jurisdictions.map((j) => j.type));
    return Array.from(t).sort();
  }, [data]);

  const topCategories = useMemo(() => {
    if (!data) return [];
    return data.categories.filter((c) => c.level === 0);
  }, [data]);

  // Filter jurisdictions
  const filteredJurisdictions = useMemo(() => {
    if (!data) return [];
    let jurs = data.jurisdictions;

    if (search) {
      const q = search.toLowerCase();
      jurs = jurs.filter((j) => j.name.toLowerCase().includes(q));
    }
    if (typeFilter) {
      jurs = jurs.filter((j) => j.type === typeFilter);
    }
    if (stateFilter) {
      jurs = jurs.filter((j) => j.state === stateFilter);
    }
    if (populatedOnly) {
      const populatedJurIds = new Set([
        ...Object.keys(data.cells).map((k) => k.split("::")[1]),
        ...Object.keys(data.candidateCells).map((k) => k.split("::")[1]),
      ]);
      jurs = jurs.filter((j) => populatedJurIds.has(j.id));
    }
    return jurs;
  }, [data, search, typeFilter, stateFilter, populatedOnly]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    if (!data) return [];
    let cats = data.categories;
    if (categoryFilter) {
      // Show only children of selected top-level category
      const topCat = data.categories.find((c) => c.id === categoryFilter);
      if (topCat) {
        const childIds = new Set(
          data.categories.filter((c) => c.parentId === topCat.id).map((c) => c.id)
        );
        cats = cats.filter(
          (c) => c.id === topCat.id || c.parentId === topCat.id || childIds.has(c.parentId || "")
        );
      }
    }
    if (populatedOnly) {
      const populatedCatIds = new Set([
        ...Object.keys(data.cells).map((k) => k.split("::")[0]),
        ...Object.keys(data.candidateCells).map((k) => k.split("::")[0]),
      ]);
      // Keep a category if it or any of its children are populated/have candidates
      cats = cats.filter((c) => {
        if (populatedCatIds.has(c.id)) return true;
        return data.categories.some(
          (child) => child.parentId === c.id && populatedCatIds.has(child.id)
        );
      });
    }
    return cats;
  }, [data, categoryFilter, populatedOnly]);

  function handleCellClick(cell: CellData, e: React.MouseEvent, catId: string, jurId: string) {
    if (cell.lawSourceIds.length === 1) {
      navigate(`/laws/${cell.lawSourceIds[0]}`);
    } else {
      // Multiple records — go to cell review page
      navigate(`/matrix-cell/${jurId}/${catId}`);
    }
  }

  function handleCandidateCellClick(catId: string, jurId: string) {
    navigate(`/matrix-cell/${jurId}/${catId}`);
  }

  async function handleEmptyCellClick(catId: string, jurId: string) {
    if (!confirm("Mark this cell as 'No law found'?")) return;
    try {
      await fetch("/api/matrix/cell-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jurisdictionId: jurId, lawCategoryId: catId, status: "no_law_found" }),
      });
      // Refresh matrix data
      const r = await fetch("/api/matrix");
      setData(await r.json());
    } catch {}
  }

  async function handleInvestigatedCellClick(catId: string, jurId: string) {
    if (!confirm("Clear 'No law found' status? Cell will return to unknown.")) return;
    try {
      await fetch("/api/matrix/cell-status", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jurisdictionId: jurId, lawCategoryId: catId }),
      });
      const r = await fetch("/api/matrix");
      setData(await r.json());
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-lg">Loading law inventory...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Law Inventory Matrix</h1>
          <p className="text-sm text-gray-500 mt-1">
            Employment law source coverage by jurisdiction and category
          </p>
        </div>
        <button
          onClick={() => navigate("/candidates")}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200"
        >
          Candidates →
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white border-b px-6 py-3 flex gap-3 flex-wrap items-center flex-shrink-0">
        <input
          type="text"
          placeholder="Search jurisdictions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-48"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {topCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={populatedOnly}
            onChange={(e) => { setPopulatedOnly(e.target.checked); localStorage.setItem("matrix_populatedOnly", String(e.target.checked)); }}
            className="rounded"
          />
          Populated only
        </label>
        <span className="text-xs text-gray-400 ml-auto">
          {filteredCategories.length} categories × {filteredJurisdictions.length} jurisdictions
        </span>
      </div>

      {/* Legend */}
      <div className="bg-white border-b px-6 py-2 flex gap-6 items-center text-xs text-gray-600 flex-shrink-0">
        <span className="font-semibold text-gray-500">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 border border-gray-200 rounded"></span>
          Not investigated
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 bg-gray-100 border border-gray-300 rounded text-center text-[9px] leading-4 text-gray-400">—</span>
          No law found
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 bg-purple-500 rounded-full"></span>
          Structured candidate (reviewable)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 bg-sky-500 rounded-full ring-2 ring-sky-300"></span>
          Auto-approved (cross-check passed)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 bg-blue-500 rounded-full"></span>
          Auto-generated
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 bg-green-500 rounded-full"></span>
          Verified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 bg-red-500 rounded-full"></span>
          Suspended
        </span>
      </div>

      {/* Matrix */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-white">
            <tr>
              <th className="sticky left-0 z-30 bg-gray-100 border px-3 py-2 text-left min-w-[260px] max-w-[320px]">
                Law Category
              </th>
              {filteredJurisdictions.map((j) => (
                <th
                  key={j.id}
                  className={`border px-2 py-1.5 text-center whitespace-nowrap font-medium ${TYPE_COLORS[j.type] || "bg-gray-50"}`}
                  title={`${j.name} (${j.type})`}
                >
                  <div className="max-w-[80px] truncate">{j.name}</div>
                  <div className="text-[10px] font-normal opacity-70">
                    {j.type.replace(/_/g, " ")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCategories.map((cat) => (
              <tr key={cat.id} className={cat.level === 0 ? "bg-gray-50" : ""}>
                <td
                  className={`sticky left-0 z-10 border px-3 py-1.5 bg-white font-${cat.level === 0 ? "bold" : cat.level === 1 ? "semibold" : "normal"}`}
                  style={{ paddingLeft: `${12 + cat.level * 16}px` }}
                >
                  <span className={cat.level === 0 ? "text-sm" : cat.level === 1 ? "text-xs" : "text-xs text-gray-600"}>
                    {cat.name}
                  </span>
                </td>
                {filteredJurisdictions.map((j) => {
                  const key = `${cat.id}::${j.id}`;
                  const cell = data.cells[key];
                  const candidateCell = data.candidateCells[key];
                  const investigated = data.investigatedCells[key];

                  // Populated cell (law sources exist) — takes priority
                  if (cell) {
                    return (
                      <td
                        key={j.id}
                        className="border text-center cursor-pointer hover:bg-gray-100"
                        onClick={(e) => handleCellClick(cell, e, cat.id, j.id)}
                      >
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold ${
                          cell.verificationStatus === "verified" ? "bg-green-500" :
                          cell.verificationStatus === "suspended" ? "bg-red-500" :
                          "bg-blue-500"
                        }`}>
                          {cell.count}
                        </span>
                      </td>
                    );
                  }

                  // Reviewable structured candidate exists
                  if (candidateCell) {
                    const isAutoApproved = candidateCell.autoApprovalStatus === "approved";
                    return (
                      <td
                        key={j.id}
                        className={`border text-center cursor-pointer ${isAutoApproved ? "bg-sky-50 hover:bg-sky-100" : "bg-purple-50 hover:bg-purple-100"}`}
                        onClick={() => handleCandidateCellClick(cat.id, j.id)}
                        title={isAutoApproved ? `Auto-approved: ${candidateCell.primaryTitle || "Cross-check passed"}` : candidateCell.primaryTitle || "Structured candidate ready for review"}
                      >
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold ${isAutoApproved ? "bg-sky-500 ring-2 ring-sky-300" : "bg-purple-500"}`}>
                          {candidateCell.count}
                        </span>
                      </td>
                    );
                  }

                  // Investigated, no law found
                  if (investigated) {
                    return (
                      <td
                        key={j.id}
                        className="border text-center cursor-pointer bg-gray-100 hover:bg-gray-200"
                        onClick={() => handleInvestigatedCellClick(cat.id, j.id)}
                        title={investigated.notes || "No law found (click to clear)"}
                      >
                        <span className="text-gray-400 text-[10px] font-medium">—</span>
                      </td>
                    );
                  }

                  // Unknown / not investigated
                  return (
                    <td
                      key={j.id}
                      className="border text-center cursor-pointer hover:bg-yellow-50"
                      onClick={() => handleEmptyCellClick(cat.id, j.id)}
                    >
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
