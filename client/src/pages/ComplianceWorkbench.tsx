import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ─────────────────────────────────────────────────────────

interface Store {
  id: string;
  name: string;
  state: string;
  city: string;
}

interface Employee {
  id: string;
  name: string;
  age: number;
  exemptStatus: string;
  hourlyRate: number;
  tippedStatus?: string;
  jobCategory?: string;
  tenureMonths?: number;
  isSchoolEnrolled?: boolean;
  unionMember?: boolean;
}

interface ShiftBreak {
  type: "meal" | "rest";
  startTime: string;
  durationMinutes: number;
  paid: boolean;
}

interface Shift {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  breaks: ShiftBreak[];
  original?: { startTime: string; endTime: string };
  publishedDate?: string;   // when this shift was first communicated
  amendedDate?: string;     // when amendment was made
}

interface ConditionDetail {
  fact: string;
  op: string;
  expected: unknown;
  actual: unknown;
  met: boolean;
}

interface EvalResult {
  ruleId: string;
  title: string;
  outcome: string;
  explanation: string;
  triggeredFacts: string[];
  conditionDetails?: ConditionDetail[];
  supersededBy?: string;
  citation: { source: string; url?: string; section?: string };
}

interface ShiftEvaluation {
  shiftId: string;
  employeeId: string;
  violations: EvalResult[];
  warnings: EvalResult[];
  scenario: Record<string, unknown>;
}

interface FactDef {
  path: string;
  type: string;
  description: string;
  category: string | null;
  enumValues: string[] | null;
}

// ─── Helpers ───────────────────────────────────────────────────────

const API = "/api/scheduler";

function getWeekDates(baseDate: Date): string[] {
  const dates: string[] = [];
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "p" : "a";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hr}${ampm}` : `${hr}:${m.toString().padStart(2, "0")}${ampm}`;
}

function shiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round(mins / 60 * 10) / 10;
}

function formatConditionValue(val: unknown): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (Array.isArray(val)) return `[${val.join(", ")}]`;
  return String(val);
}

function parseTimeToMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// ─── Demo Data Builder ─────────────────────────────────────────────

function buildDemoShifts(weekDates: string[]): Shift[] {
  // Build 2 weeks of mostly-compliant shifts
  // Week 1 = weekDates[0..6], Week 2 = 7 days after
  const week2 = weekDates.map(d => {
    const dt = new Date(d + "T00:00:00");
    dt.setDate(dt.getDate() + 7);
    return dt.toISOString().slice(0, 10);
  });
  const allDays = [...weekDates, ...week2];

  // Published 14 days before first shift
  const pubDate = new Date(weekDates[0] + "T00:00:00");
  pubDate.setDate(pubDate.getDate() - 14);
  const publishedDate = pubDate.toISOString().slice(0, 10);

  function meal(time: string): ShiftBreak { return { type: "meal", startTime: time, durationMinutes: 30, paid: false }; }
  function rest(time: string): ShiftBreak { return { type: "rest", startTime: time, durationMinutes: 10, paid: true }; }

  const shifts: Shift[] = [];
  let id = 0;
  function add(empId: string, date: string, start: string, end: string, breaks: ShiftBreak[] = []) {
    shifts.push({ id: `demo-${++id}`, employeeId: empId, date, startTime: start, endTime: end, breaks, publishedDate });
  }

  // Marcus Johnson (nyc1-001) — Mon-Fri 8am-4pm, 8hr shifts, compliant
  for (const d of allDays) {
    const dow = new Date(d + "T00:00:00").getDay();
    if (dow >= 1 && dow <= 5) add("nyc1-001", d, "08:00", "16:00", [meal("12:00")]);
  }

  // Aisha Williams (nyc1-002) — Mon-Fri 10am-6pm, compliant
  for (const d of allDays) {
    const dow = new Date(d + "T00:00:00").getDay();
    if (dow >= 1 && dow <= 5) add("nyc1-002", d, "10:00", "18:00", [meal("14:00")]);
  }

  // Tyler Chen (nyc1-003) — minor 16, school: max 3hrs school days, 8hrs non-school
  // Weekdays after school (4pm-7pm, 3hrs) + Sat (10am-4pm with break)
  for (const d of allDays) {
    const dow = new Date(d + "T00:00:00").getDay();
    if (dow === 3 || dow === 5) add("nyc1-003", d, "16:00", "19:00", []); // Wed, Fri — 3hr
    if (dow === 6) add("nyc1-003", d, "10:00", "16:00", [meal("13:00")]); // Sat — 6hr with break
  }

  // Sofia Rodriguez (nyc1-004) — minor 17, school: shifts under 8hrs, end by 10pm
  // Tue, Thu 4pm-9pm (5hr, no break needed) + Sat 9am-3pm
  for (const d of allDays) {
    const dow = new Date(d + "T00:00:00").getDay();
    if (dow === 2 || dow === 4) add("nyc1-004", d, "16:00", "21:00", []); // Tue, Thu — 5hr
    if (dow === 6) add("nyc1-004", d, "09:00", "15:00", [meal("12:00")]); // Sat — 6hr
  }

  // David Park (nyc1-005) — exempt manager, Mon-Fri 7am-5pm (10hr) with proper breaks
  for (const d of allDays) {
    const dow = new Date(d + "T00:00:00").getDay();
    if (dow >= 1 && dow <= 5) add("nyc1-005", d, "07:00", "17:00", [meal("12:00"), rest("10:00"), rest("15:00")]);
  }

  // Jasmine Brown (nyc1-006) — Mon, Tue, Thu, Fri 6am-2pm (8hr), compliant
  for (const d of allDays) {
    const dow = new Date(d + "T00:00:00").getDay();
    if (dow === 1 || dow === 2 || dow === 4 || dow === 5) add("nyc1-006", d, "06:00", "14:00", [meal("10:00")]);
  }

  // Kevin O'Brien (nyc1-007) — Tue-Sat 2pm-10pm (8hr), compliant
  for (const d of allDays) {
    const dow = new Date(d + "T00:00:00").getDay();
    if (dow >= 2 && dow <= 6) add("nyc1-007", d, "14:00", "22:00", [meal("18:00")]);
  }

  // Maria Santos (nyc1-008) — Mon-Fri 9am-5pm (8hr), compliant
  for (const d of allDays) {
    const dow = new Date(d + "T00:00:00").getDay();
    if (dow >= 1 && dow <= 5) add("nyc1-008", d, "09:00", "17:00", [meal("13:00")]);
  }

  return shifts;
}

// ─── Main Component ────────────────────────────────────────────────

export function ComplianceWorkbench() {
  // Store & employee data
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Schedule state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [weekDates, setWeekDates] = useState<string[]>(getWeekDates(new Date()));
  const [publishedDate, setPublishedDate] = useState<string | null>(null);

  // Evaluation results (keyed by shift ID)
  const [evaluations, setEvaluations] = useState<ShiftEvaluation[]>([]);
  const [totalPassed, setTotalPassed] = useState(0);
  const [evaluating, setEvaluating] = useState(false);

  // UI state
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [highlightedShifts, setHighlightedShifts] = useState<Set<string>>(new Set());
  const [showFactsModal, setShowFactsModal] = useState(false);
  const [facts, setFacts] = useState<FactDef[]>([]);

  // Shift creation modal
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [modalEmployee, setModalEmployee] = useState("");
  const [modalDate, setModalDate] = useState("");
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("17:00");
  const [modalBreaks, setModalBreaks] = useState<ShiftBreak[]>([]);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  // Track pending evaluations
  const evalVersionRef = useRef(0);

  // ─── Load data ─────────────────────────────────────────────────

  useEffect(() => {
    fetch(`${API}/stores`).then(r => r.json()).then((data: Store[]) => {
      setStores(data);
      if (data.length > 0) setSelectedStore(data[0].id);
    });
    fetch("/api/ts-facts").then(r => r.json()).then(d => setFacts(d.facts));
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    fetch(`${API}/employees/${selectedStore}`)
      .then(r => r.json())
      .then((data: Employee[]) => {
        setEmployees(data);
        // Load compliant 2-week sample schedule for NYC Times Square
        if (selectedStore === "nyc-times-sq") {
          setShifts(buildDemoShifts(weekDates));
          // Schedule was published 14 days before the first shift (compliant)
          const firstMonday = weekDates[0];
          const pubDate = new Date(firstMonday + "T00:00:00");
          pubDate.setDate(pubDate.getDate() - 14);
          setPublishedDate(pubDate.toISOString().slice(0, 10));
        } else {
          setShifts([]);
          setPublishedDate(null);
        }
      });
    setEvaluations([]);
    setTotalPassed(0);
    setSelectedEmployee(null);
    setSelectedShiftId(null);
  }, [selectedStore]);

  // ─── Real-time evaluation ──────────────────────────────────────

  const evaluateAllShifts = useCallback(async (currentShifts: Shift[]) => {
    if (currentShifts.length === 0) {
      setEvaluations([]);
      setTotalPassed(0);
      return;
    }

    setEvaluating(true);
    const version = ++evalVersionRef.current;

    const results: ShiftEvaluation[] = [];
    let passed = 0;

    for (const shift of currentShifts) {
      // Only include shifts from the same work week (Mon-Sun containing this shift's date)
      const shiftDate = new Date(shift.date + "T00:00:00");
      const shiftDay = shiftDate.getDay();
      const weekStart = new Date(shiftDate);
      weekStart.setDate(shiftDate.getDate() - ((shiftDay + 6) % 7)); // Monday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const weekEndStr = weekEnd.toISOString().slice(0, 10);

      const otherShiftsThisWeek = currentShifts
        .filter(s => s.employeeId === shift.employeeId && s.id !== shift.id && s.date >= weekStartStr && s.date <= weekEndStr)
        .map(({ id, employeeId, date, startTime, endTime, breaks, original }) => ({ id, employeeId, date, startTime, endTime, breaks, original }));

      try {
        const emp = employees.find(e => e.id === shift.employeeId);
        const resp = await fetch(`${API}/check-shift`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shift,
            employeeId: shift.employeeId,
            storeId: selectedStore,
            weekContext: { otherShiftsThisWeek, priorWeekShifts: [] },
            publishedDate,
            employeeOverrides: emp ? {
              age: emp.age,
              exemptStatus: emp.exemptStatus,
              hourlyRate: emp.hourlyRate,
              tippedStatus: emp.tippedStatus,
              jobCategory: emp.jobCategory,
              tenureMonths: emp.tenureMonths,
              isSchoolEnrolled: emp.isSchoolEnrolled,
              unionMember: emp.unionMember,
            } : undefined,
          }),
        });
        const data = await resp.json();
        results.push({
          shiftId: shift.id,
          employeeId: shift.employeeId,
          violations: data.violations || [],
          warnings: data.warnings || [],
          scenario: data.scenario || {},
        });
        if (data.summary) {
          passed = Math.max(passed, (data.summary.passed || 0));
        }
      } catch {
        results.push({ shiftId: shift.id, employeeId: shift.employeeId, violations: [], warnings: [], scenario: {} });
      }
    }

    if (version === evalVersionRef.current) {
      setEvaluations(results);
      setTotalPassed(passed);
      setEvaluating(false);
    }
  }, [selectedStore, publishedDate, employees]);

  // Re-evaluate whenever shifts or publishedDate change
  useEffect(() => {
    evaluateAllShifts(shifts);
  }, [shifts, evaluateAllShifts, publishedDate]);

  // ─── Shift CRUD ────────────────────────────────────────────────

  function openNewShift(employeeId: string, date: string) {
    setModalEmployee(employeeId);
    setModalDate(date);
    setModalStart("09:00");
    setModalEnd("17:00");
    setModalBreaks([]);
    setEditingShiftId(null);
    setShowShiftModal(true);
  }

  function openEditShift(shift: Shift) {
    setModalEmployee(shift.employeeId);
    setModalDate(shift.date);
    setModalStart(shift.startTime);
    setModalEnd(shift.endTime);
    setModalBreaks(shift.breaks || []);
    setEditingShiftId(shift.id);
    setShowShiftModal(true);
  }

  function saveShift() {
    const today = new Date().toISOString().slice(0, 10);

    if (editingShiftId) {
      // Editing an existing shift
      const existingShift = shifts.find(s => s.id === editingShiftId)!;
      const isPublished = !!existingShift.publishedDate;

      let original = existingShift.original;
      let amendedDate = existingShift.amendedDate;

      if (isPublished && !original) {
        // First amendment — capture original state
        original = { startTime: existingShift.startTime, endTime: existingShift.endTime };
        amendedDate = today;
      } else if (isPublished && original) {
        // Subsequent amendment — keep original, update amended date
        amendedDate = today;
      }

      const updated: Shift = {
        ...existingShift,
        startTime: modalStart,
        endTime: modalEnd,
        breaks: modalBreaks,
        original,
        amendedDate,
      };
      setShifts(prev => prev.map(s => s.id === editingShiftId ? updated : s));
    } else {
      // New shift — unpublished until user clicks Republish
      const shift: Shift = {
        id: `shift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        employeeId: modalEmployee,
        date: modalDate,
        startTime: modalStart,
        endTime: modalEnd,
        breaks: modalBreaks,
      };
      setShifts(prev => [...prev, shift]);
    }
    setShowShiftModal(false);
    setEditingShiftId(null);
  }

  function updateEmployee(empId: string, field: string, value: any) {
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, [field]: value } : e));
  }

  function addBreak(type: "meal" | "rest") {
    // Default: place break in the middle of the shift
    const startMins = parseTimeToMins(modalStart);
    const endMins = parseTimeToMins(modalEnd);
    const midpoint = Math.floor((startMins + endMins) / 2);
    const duration = type === "meal" ? 30 : 10;
    setModalBreaks([...modalBreaks, {
      type,
      startTime: minsToTime(midpoint),
      durationMinutes: duration,
      paid: type === "rest", // rest breaks are usually paid, meal breaks unpaid
    }]);
  }

  function updateBreak(index: number, field: keyof ShiftBreak, value: any) {
    setModalBreaks(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  }

  function removeBreak(index: number) {
    setModalBreaks(prev => prev.filter((_, i) => i !== index));
  }

  function deleteShift(shiftId: string) {
    setShifts(prev => prev.filter(s => s.id !== shiftId));
    setHighlightedShifts(new Set());
    setSelectedShiftId(cur => (cur === shiftId ? null : cur));
  }

  // ─── Week navigation ───────────────────────────────────────────

  const prevWeek = () => {
    const d = new Date(weekDates[0] + "T00:00:00");
    d.setDate(d.getDate() - 7);
    setWeekDates(getWeekDates(d));
  };
  const nextWeek = () => {
    const d = new Date(weekDates[0] + "T00:00:00");
    d.setDate(d.getDate() + 7);
    setWeekDates(getWeekDates(d));
  };
  const thisWeek = () => setWeekDates(getWeekDates(new Date()));

  // ─── Derived data ──────────────────────────────────────────────

  const allViolations = evaluations.flatMap(e => e.violations.map(v => ({ ...v, shiftId: e.shiftId, employeeId: e.employeeId })));
  const allWarnings = evaluations.flatMap(e => e.warnings.map(w => ({ ...w, shiftId: e.shiftId, employeeId: e.employeeId })));

  // Group by employee
  const violationsByEmployee = new Map<string, typeof allViolations>();
  for (const v of allViolations) {
    if (!violationsByEmployee.has(v.employeeId)) violationsByEmployee.set(v.employeeId, []);
    violationsByEmployee.get(v.employeeId)!.push(v);
  }
  const warningsByEmployee = new Map<string, typeof allWarnings>();
  for (const w of allWarnings) {
    if (!warningsByEmployee.has(w.employeeId)) warningsByEmployee.set(w.employeeId, []);
    warningsByEmployee.get(w.employeeId)!.push(w);
  }

  function getShiftEval(shiftId: string) {
    return evaluations.find(e => e.shiftId === shiftId);
  }

  const currentStore = stores.find(s => s.id === selectedStore);
  const selectedEmp = employees.find(e => e.id === selectedEmployee);
  const selectedShiftObj = shifts.find(s => s.id === selectedShiftId) || null;
  const selectedShiftEval = selectedShiftId ? getShiftEval(selectedShiftId) : undefined;

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ═══ Header ═══ */}
      <header className="bg-white border-b border-gray-200 shadow-xs flex-shrink-0 z-20">
        <div className="flex items-center gap-4 px-5 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-blue-400 text-white font-extrabold text-lg shadow-sm">§</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-none">Compliance Workbench</h1>
            <div className="text-xs text-gray-500 mt-0.5">Live rule evaluation as you schedule</div>
          </div>
          {/* Store selector */}
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            className="ml-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 cursor-pointer"
          >
            {stores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.state})</option>)}
          </select>
          {currentStore && (
            <span className="text-xs text-gray-500">{currentStore.state} · {currentStore.city} · Federal</span>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setShowFactsModal(true)}
            className="inline-flex items-center gap-1.5 border border-gray-200 bg-white rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            ⓘ {facts.length} Facts
          </button>
          <a href="/" className="text-gray-600 text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-gray-100">Rules Explorer →</a>
        </div>
        {/* Week nav + publish status */}
        <div className="flex items-center gap-2 px-5 pb-3">
          <div className="flex items-center gap-1">
            <button onClick={prevWeek} className="border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">← Prev</button>
            <button onClick={thisWeek} className="border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Today</button>
            <button onClick={nextWeek} className="border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Next →</button>
          </div>
          <span className="text-xs text-gray-500 ml-2 font-medium">{weekDates[0]} — {weekDates[6]}</span>
          <div className="flex-1" />
          <span className="text-xs text-gray-400">{shifts.length} shifts</span>
          {publishedDate && (
            <span className="inline-flex items-center gap-1.5 bg-success-50 text-success-700 border border-success-100 rounded-full px-3 py-1 text-[11px] font-semibold">
              ● Published {publishedDate}
              {shifts.some(s => s.original) && (
                <span className="text-orange-600">· {shifts.filter(s => s.original).length} amended</span>
              )}
              {shifts.some(s => !s.publishedDate) && (
                <span className="text-brand-700">· {shifts.filter(s => !s.publishedDate).length} new</span>
              )}
            </span>
          )}
          {(() => {
            const hasAmendments = shifts.some(s => s.original);
            const hasUnpublished = shifts.some(s => !s.publishedDate);
            const canPublish = !publishedDate ? shifts.length > 0 : (hasAmendments || hasUnpublished);
            const today = new Date().toISOString().slice(0, 10);
            return (
              <button
                onClick={() => {
                  setPublishedDate(today);
                  // Stamp publishedDate on new shifts, clear amendments on existing
                  setShifts(prev => prev.map(s => ({
                    ...s,
                    publishedDate: s.publishedDate || today, // new shifts get today
                    original: undefined,    // amendments become the new baseline
                    amendedDate: undefined, // clear amendment tracking
                  })));
                }}
                disabled={!canPublish}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${!canPublish ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-brand-600 shadow-sm"}`}
              >
                {publishedDate ? "Republish Schedule" : "Publish Schedule"}
              </button>
            );
          })()}
        </div>
      </header>

      {/* ═══ Main: Split Layout ═══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ──── Left: Schedule ──── */}
        <div className="flex-[3] min-w-0 overflow-hidden flex flex-col p-4">
          <div className="text-xs text-gray-500 mb-2.5 px-1 flex items-center gap-1.5">
            <span className="text-brand">◧</span>
            <span><span className="font-semibold text-gray-700">Click any shift</span> to see which rules were evaluated and how they apply to that scheduling decision.</span>
          </div>
          <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-2xl shadow-card">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 bg-gray-50 border-b border-r border-gray-200 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500 min-w-[150px]">Employee</th>
                  {weekDates.map(d => (
                    <th key={d} className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-gray-500 min-w-[104px]">
                      {formatDay(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const empViolationCount = (violationsByEmployee.get(emp.id) || []).length;
                  const empWarningCount = (warningsByEmployee.get(emp.id) || []).length;
                  return (
                    <tr key={emp.id} className="group">
                      {/* Employee cell — clickable */}
                      <td
                        className={`sticky left-0 z-10 border-b border-r border-gray-100 px-3 py-2.5 cursor-pointer ${selectedEmployee === emp.id ? "bg-brand-50" : "bg-white group-hover:bg-gray-50"}`}
                        onClick={() => setSelectedEmployee(selectedEmployee === emp.id ? null : emp.id)}
                      >
                        <div className="font-semibold text-[13px] text-gray-900">{emp.name}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {emp.age < 18 && <span className="text-[10px] font-bold rounded px-1.5 py-px bg-orange-50 text-orange-700">MINOR · {emp.age}</span>}
                          {emp.exemptStatus === "exempt"
                            ? <span className="text-[10px] font-bold rounded px-1.5 py-px bg-gray-100 text-gray-600">EXEMPT</span>
                            : <span>${emp.hourlyRate}/hr</span>}
                          {empViolationCount > 0 && <span className="bg-danger-50 text-danger-700 rounded-full px-1.5 font-bold text-[10px]">{empViolationCount}</span>}
                          {empWarningCount > 0 && <span className="bg-warning-50 text-warning-700 rounded-full px-1.5 font-bold text-[10px]">{empWarningCount}</span>}
                        </div>
                      </td>
                      {/* Day cells */}
                      {weekDates.map(date => {
                        const cellShifts = shifts.filter(s => s.employeeId === emp.id && s.date === date);
                        return (
                          <td
                            key={date}
                            className="border-b border-gray-100 px-1.5 py-1.5 align-top"
                            onClick={() => cellShifts.length === 0 && openNewShift(emp.id, date)}
                          >
                            {cellShifts.map(s => {
                              const ev = getShiftEval(s.id);
                              const hasV = (ev?.violations.length || 0) > 0;
                              const hasW = (ev?.warnings.length || 0) > 0;
                              const isAmended = !!s.original;
                              const isSel = selectedShiftId === s.id;
                              const isHighlighted = highlightedShifts.has(s.id);
                              const accent = hasV ? "border-l-danger-500" : hasW ? "border-l-warning-500" : "border-l-success-500";
                              const bgc = hasV ? "bg-danger-50" : hasW ? "bg-warning-50" : "bg-white";
                              const timeColor = hasV ? "text-danger-700" : hasW ? "text-warning-700" : "text-gray-800";
                              const ringCls = isSel
                                ? "ring-2 ring-brand shadow-md -translate-y-px"
                                : isHighlighted ? "ring-2 ring-brand shadow-sm" : "hover:shadow-md hover:-translate-y-px";
                              return (
                                <div
                                  key={s.id}
                                  className={`relative rounded-lg border border-gray-200 border-l-[3px] ${accent} ${bgc} px-2 py-1.5 mb-1 cursor-pointer transition-all ${ringCls}`}
                                  onClick={e => { e.stopPropagation(); setSelectedShiftId(s.id); setSelectedEmployee(null); setHighlightedShifts(new Set()); }}
                                >
                                  {isAmended && (
                                    <div className="text-[9px] text-gray-400 line-through leading-tight">
                                      {formatTime(s.original!.startTime)}–{formatTime(s.original!.endTime)}
                                    </div>
                                  )}
                                  <div className={`font-bold text-[11px] leading-tight ${isAmended ? "text-orange-700" : timeColor}`}>
                                    {formatTime(s.startTime)}–{formatTime(s.endTime)}
                                    {isAmended && <span className="ml-1 text-[8px] font-semibold text-orange-500 align-top">amended</span>}
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                                    <span>{shiftHours(s.startTime, s.endTime)}h</span>
                                    {hasV && <span className="ml-auto text-danger-600 font-bold">✕{ev!.violations.length}</span>}
                                    {hasW && !hasV && <span className="ml-auto text-warning-600 font-bold">⚠{ev!.warnings.length}</span>}
                                    {!hasV && !hasW && ev && <span className="ml-auto text-success-600 font-bold">✓</span>}
                                  </div>
                                </div>
                              );
                            })}
                            {cellShifts.length === 0 && (
                              <div className="text-center text-gray-300 text-base py-2 rounded-lg cursor-pointer hover:bg-gray-50 hover:text-gray-400">+</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ──── Right: KPIs + Rule Inspector ──── */}
        <div className="w-[400px] flex-shrink-0 overflow-auto bg-gray-50 border-l border-gray-200 p-4 space-y-3.5">
          {/* KPI tiles */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="relative rounded-xl border border-danger-100 bg-danger-50 p-3.5">
              <div className="absolute top-3 right-3 text-danger-600 text-sm">✕</div>
              <div className="text-2xl font-extrabold leading-none text-danger-700">{allViolations.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-danger-700 mt-1.5">Violations</div>
            </div>
            <div className="relative rounded-xl border border-warning-100 bg-warning-50 p-3.5">
              <div className="absolute top-3 right-3 text-warning-600 text-sm">⚠</div>
              <div className="text-2xl font-extrabold leading-none text-warning-700">{allWarnings.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-warning-700 mt-1.5">Warnings</div>
            </div>
            <div className="relative rounded-xl border border-success-100 bg-success-50 p-3.5">
              <div className="absolute top-3 right-3 text-success-600 text-sm">✓</div>
              <div className="text-2xl font-extrabold leading-none text-success-700">{totalPassed}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-success-700 mt-1.5">Passed</div>
            </div>
          </div>

          {evaluating && <div className="text-xs text-gray-400 animate-pulse px-1">Evaluating…</div>}

          {selectedShiftObj ? (
            <RuleInspector
              shift={selectedShiftObj}
              ev={selectedShiftEval}
              emp={employees.find(e => e.id === selectedShiftObj.employeeId)}
              onEdit={() => openEditShift(selectedShiftObj)}
              onClose={() => setSelectedShiftId(null)}
            />
          ) : (
            <>
              <div className="text-xs text-gray-500 px-1">
                Select a shift to inspect how the rules apply — or review all flagged issues below.
              </div>

              {shifts.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-8">
                  Click a cell on the schedule to add shifts and see real-time compliance results.
                </div>
              )}

              {allViolations.length === 0 && allWarnings.length === 0 && shifts.length > 0 && (
                <div className="rounded-xl border border-success-100 bg-success-50 p-4 text-center">
                  <div className="text-success-700 font-semibold text-sm">✓ All shifts compliant</div>
                  <div className="text-success-600 text-xs mt-1">No violations or warnings this week.</div>
                </div>
              )}

              {/* Aggregated violations */}
              {allViolations.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold text-danger-700 uppercase tracking-wide mb-2 px-1">Violations</h3>
                  {[...violationsByEmployee.entries()].map(([empId, violations]) => {
                    const emp = employees.find(e => e.id === empId);
                    const byRule = new Map<string, typeof violations>();
                    for (const v of violations) { if (!byRule.has(v.ruleId)) byRule.set(v.ruleId, []); byRule.get(v.ruleId)!.push(v); }
                    return (
                      <div key={empId} className="mb-2.5">
                        <div className="text-[11px] font-semibold text-gray-700 mb-1 px-1">{emp?.name || empId}</div>
                        {[...byRule.entries()].map(([ruleId, group]) => {
                          const first = group[0].shiftId;
                          return (
                            <div key={ruleId}
                              className="mb-1.5 p-2.5 rounded-lg border border-gray-200 border-l-[3px] border-l-danger-500 bg-white cursor-pointer hover:shadow-sm"
                              onClick={() => setSelectedShiftId(first)}>
                              <div className="text-[12px] font-semibold text-gray-900">{group[0].title}
                                {group.length > 1 && <span className="ml-1 text-danger-600 font-bold text-[11px]">×{group.length}</span>}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{group[0].explanation}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Aggregated warnings */}
              {allWarnings.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold text-warning-700 uppercase tracking-wide mb-2 px-1">Warnings</h3>
                  {[...warningsByEmployee.entries()].map(([empId, warnings]) => {
                    const emp = employees.find(e => e.id === empId);
                    const byRule = new Map<string, typeof warnings>();
                    for (const w of warnings) { if (!byRule.has(w.ruleId)) byRule.set(w.ruleId, []); byRule.get(w.ruleId)!.push(w); }
                    return (
                      <div key={empId} className="mb-2.5">
                        <div className="text-[11px] font-semibold text-gray-700 mb-1 px-1">{emp?.name || empId}</div>
                        {[...byRule.entries()].map(([ruleId, group]) => {
                          const first = group[0].shiftId;
                          return (
                            <div key={ruleId}
                              className="mb-1.5 p-2.5 rounded-lg border border-gray-200 border-l-[3px] border-l-warning-500 bg-white cursor-pointer hover:shadow-sm"
                              onClick={() => setSelectedShiftId(first)}>
                              <div className="text-[12px] font-semibold text-gray-900">{group[0].title}
                                {group.length > 1 && <span className="ml-1 text-warning-600 font-bold text-[11px]">×{group.length}</span>}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{group[0].explanation}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ Bottom: Context Panel (Employee details OR Shift facts) ═══ */}
      {(selectedEmp || highlightedShifts.size > 0) && (
        <div className="flex-shrink-0 border-t bg-white px-4 py-3 max-h-64 overflow-auto">
          {highlightedShifts.size > 0 ? (
            // Shift facts view
            <ShiftFactsPanel
              shiftIds={highlightedShifts}
              evaluations={evaluations}
              employees={employees}
              onClose={() => setHighlightedShifts(new Set())}
            />
          ) : selectedEmp ? (
            // Employee edit view
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900">{selectedEmp.name} — Employee Details</h3>
                <button onClick={() => setSelectedEmployee(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ Close</button>
              </div>
              <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-xs">
                <EditableField label="Age" type="number" value={selectedEmp.age}
                  onChange={v => updateEmployee(selectedEmp.id, "age", Number(v))}
                  highlight={selectedEmp.age < 18} />
                <EditableField label="Exempt Status" type="select" value={selectedEmp.exemptStatus}
                  options={["non_exempt", "exempt"]}
                  onChange={v => updateEmployee(selectedEmp.id, "exemptStatus", v)} />
                <EditableField label="Hourly Rate ($)" type="number" value={selectedEmp.hourlyRate}
                  step="0.25"
                  onChange={v => updateEmployee(selectedEmp.id, "hourlyRate", Number(v))} />
                <EditableField label="Tenure (months)" type="number" value={selectedEmp.tenureMonths || 0}
                  onChange={v => updateEmployee(selectedEmp.id, "tenureMonths", Number(v))} />
                <EditableField label="Job Category" type="select" value={selectedEmp.jobCategory || "other"}
                  options={["food_service", "retail", "healthcare", "hotel", "security", "domestic", "agricultural", "office", "driver", "nurse", "other"]}
                  onChange={v => updateEmployee(selectedEmp.id, "jobCategory", v)} />
                <EditableField label="Tipped Status" type="select" value={selectedEmp.tippedStatus || "not_tipped"}
                  options={["not_tipped", "tipped", "service_charge"]}
                  onChange={v => updateEmployee(selectedEmp.id, "tippedStatus", v)} />
                <EditableField label="School Enrolled" type="select" value={selectedEmp.isSchoolEnrolled ? "yes" : "no"}
                  options={["yes", "no"]}
                  onChange={v => updateEmployee(selectedEmp.id, "isSchoolEnrolled", v === "yes")} />
                <EditableField label="Union Member" type="select" value={selectedEmp.unionMember ? "yes" : "no"}
                  options={["yes", "no"]}
                  onChange={v => updateEmployee(selectedEmp.id, "unionMember", v === "yes")} />
              </div>
              <div className="mt-2 text-[10px] text-gray-400">
                Changes trigger re-evaluation. Click "ℹ {facts.length} Facts" to see all possible variables.
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ═══ Shift Modal ═══ */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowShiftModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-5 w-[420px] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">{editingShiftId ? "Edit Shift" : "Add Shift"}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
                <div className="text-gray-900">{employees.find(e => e.id === modalEmployee)?.name}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <div className="text-gray-900">{modalDate}</div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                  <input type="time" value={modalStart} onChange={e => setModalStart(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                  <input type="time" value={modalEnd} onChange={e => setModalEnd(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Duration: {shiftHours(modalStart, modalEnd)} hours
              </div>

              {/* ── Breaks Section ── */}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Breaks</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => addBreak("meal")}
                      className="px-2 py-0.5 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100"
                    >
                      + Meal Break
                    </button>
                    <button
                      onClick={() => addBreak("rest")}
                      className="px-2 py-0.5 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                    >
                      + Rest Break
                    </button>
                  </div>
                </div>

                {modalBreaks.length === 0 && (
                  <div className="text-xs text-gray-400 italic py-2">
                    No breaks scheduled. Add a meal or rest break above.
                  </div>
                )}

                {modalBreaks.map((brk, i) => (
                  <div key={i} className={`flex items-center gap-2 mb-2 p-2 rounded ${brk.type === "meal" ? "bg-amber-50 border border-amber-100" : "bg-blue-50 border border-blue-100"}`}>
                    <span className={`text-[10px] font-bold uppercase ${brk.type === "meal" ? "text-amber-700" : "text-blue-700"}`}>
                      {brk.type === "meal" ? "🍽 Meal" : "☕ Rest"}
                    </span>
                    <input
                      type="time"
                      value={brk.startTime}
                      onChange={e => updateBreak(i, "startTime", e.target.value)}
                      className="border rounded px-1.5 py-0.5 text-xs w-20"
                    />
                    <select
                      value={brk.durationMinutes}
                      onChange={e => updateBreak(i, "durationMinutes", parseInt(e.target.value))}
                      className="border rounded px-1.5 py-0.5 text-xs"
                    >
                      {brk.type === "meal" ? (
                        <>
                          <option value={20}>20 min</option>
                          <option value={30}>30 min</option>
                          <option value={45}>45 min</option>
                          <option value={60}>60 min</option>
                        </>
                      ) : (
                        <>
                          <option value={5}>5 min</option>
                          <option value={10}>10 min</option>
                          <option value={15}>15 min</option>
                          <option value={20}>20 min</option>
                        </>
                      )}
                    </select>
                    <label className="flex items-center gap-1 text-[10px] text-gray-600">
                      <input
                        type="checkbox"
                        checked={brk.paid}
                        onChange={e => updateBreak(i, "paid", e.target.checked)}
                        className="rounded"
                      />
                      Paid
                    </label>
                    <button
                      onClick={() => removeBreak(i)}
                      className="text-red-400 hover:text-red-600 text-xs ml-auto"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Visual timeline of the shift with breaks */}
                {modalBreaks.length > 0 && (
                  <ShiftTimeline start={modalStart} end={modalEnd} breaks={modalBreaks} />
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveShift} className="flex-1 bg-blue-600 text-white rounded px-3 py-2 text-sm font-medium hover:bg-blue-700">
                {editingShiftId ? "Update" : "Add Shift"}
              </button>
              {editingShiftId && (
                <button onClick={() => { deleteShift(editingShiftId); setShowShiftModal(false); }} className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50">
                  Delete
                </button>
              )}
              <button onClick={() => setShowShiftModal(false)} className="flex-1 border rounded px-3 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Facts Reference Modal ═══ */}
      {showFactsModal && (
        <FactsModal facts={facts} onClose={() => setShowFactsModal(false)} />
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function RuleInspector({ shift, ev, emp, onEdit, onClose }: {
  shift: Shift;
  ev?: ShiftEvaluation;
  emp?: Employee;
  onEdit: () => void;
  onClose: () => void;
}) {
  const violations = ev?.violations || [];
  const warnings = ev?.warnings || [];
  const nV = violations.length;
  const nW = warnings.length;
  const factCount = ev ? Object.keys(ev.scenario || {}).length : 0;

  const verdictText = nV
    ? `${nV} violation${nV > 1 ? "s" : ""}${nW ? ` · ${nW} warning${nW > 1 ? "s" : ""}` : ""} on this shift`
    : nW
      ? `${nW} warning${nW > 1 ? "s" : ""} — allowed, but review`
      : "Compliant — all applicable rules passed";
  const verdictCls = nV
    ? "bg-danger-50 text-danger-700"
    : nW ? "bg-warning-50 text-warning-700" : "bg-success-50 text-success-700";

  const renderRule = (r: EvalResult, sev: "violation" | "warning") => {
    const sevCls = sev === "violation" ? "bg-danger-500" : "bg-warning-500";
    const details = r.conditionDetails || [];
    return (
      <div key={r.ruleId} className="border-t border-gray-100 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-gray-900 leading-snug">{r.title}</div>
            {r.citation?.source && (
              <div className="mt-1.5">
                <span className="text-[10px] font-bold rounded-md px-1.5 py-0.5 bg-brand-50 text-brand-700">
                  {r.citation.source}{r.citation.section ? ` ${r.citation.section}` : ""}
                </span>
              </div>
            )}
          </div>
          <span className={`text-[10px] font-extrabold uppercase tracking-wide rounded-full px-2.5 py-1 text-white ${sevCls}`}>{sev}</span>
        </div>
        {r.explanation && (
          <div className="text-[12px] text-gray-600 mt-2.5 leading-relaxed bg-gray-50 rounded-lg border-l-[3px] border-gray-200 px-3 py-2.5">
            {r.explanation}
          </div>
        )}
        {details.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">How the rule applies</div>
            {details.map((d, i) => (
              <div key={i} className={`grid grid-cols-[16px_1fr_auto] gap-2 items-center rounded-lg px-2.5 py-1.5 mb-1 text-[11px] ${d.met ? "bg-danger-50" : "bg-gray-50"}`}>
                <div className={`text-center font-extrabold ${d.met ? "text-danger-600" : "text-gray-400"}`}>{d.met ? "✓" : "○"}</div>
                <div className="font-mono text-gray-700 truncate">
                  <span>{d.fact}</span>
                  <span className="text-gray-400 mx-1">{d.op}</span>
                  <span className="text-gray-500">{formatConditionValue(d.expected)}</span>
                </div>
                <div className="font-mono text-[10px] whitespace-nowrap">
                  <span className="text-gray-400 mr-1">actual</span>
                  <span className={d.met ? "text-danger-700 font-semibold" : "text-gray-500"}>{formatConditionValue(d.actual)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {r.citation && (
          <div className="mt-2.5 text-[11px] text-gray-500 flex items-center gap-1.5">
            📖
            {r.citation.url
              ? <a href={r.citation.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 font-semibold hover:underline">{r.citation.source}{r.citation.section ? ` ${r.citation.section}` : ""} →</a>
              : <span>{r.citation.source}{r.citation.section ? ` ${r.citation.section}` : ""}</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">◧ Scheduling decision</div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xs">✕</button>
        </div>
        <div className="text-lg font-bold tracking-tight mt-1.5 flex items-center gap-2 flex-wrap">
          {emp?.name || shift.employeeId}
          {emp && emp.age < 18 && <span className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-orange-50 text-orange-700">MINOR · {emp.age}</span>}
          {emp && emp.exemptStatus === "exempt" && <span className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-gray-100 text-gray-600">EXEMPT</span>}
        </div>
        <div className="text-[13px] text-gray-500 mt-1">
          <b className="text-gray-800 font-semibold">{formatDay(shift.date)}</b> · {formatTime(shift.startTime)}–{formatTime(shift.endTime)} · {shiftHours(shift.startTime, shift.endTime)}h
          {shift.original && <span className="text-orange-600"> · amended</span>}
        </div>
      </div>

      <div className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold ${verdictCls}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-current"></span>{verdictText}
      </div>

      {violations.map(r => renderRule(r, "violation"))}
      {warnings.map(r => renderRule(r, "warning"))}

      {nV === 0 && nW === 0 && (
        <div className="p-4 border-t border-gray-100">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Evaluation</div>
          <div className="text-[13px] text-gray-600">
            Checked against all applicable federal, state, and local rules{factCount ? ` (${factCount} facts evaluated)` : ""} — no violations or warnings.
          </div>
        </div>
      )}

      <div className="p-3 border-t border-gray-100 bg-gray-50 flex gap-2">
        <button onClick={onEdit} className="btn-primary flex-1">Edit shift</button>
      </div>
    </div>
  );
}

function ShiftFactsPanel({ shiftIds, evaluations, employees, onClose }: {
  shiftIds: Set<string>;
  evaluations: ShiftEvaluation[];
  employees: Employee[];
  onClose: () => void;
}) {
  // Show facts for the first highlighted shift (if multiple, they share the same rule)
  const firstId = [...shiftIds][0];
  const ev = evaluations.find(e => e.shiftId === firstId);
  const emp = employees.find(e => e.id === ev?.employeeId);

  if (!ev || Object.keys(ev.scenario).length === 0) {
    return (
      <div className="text-xs text-gray-400 py-4">
        No scenario data available for this shift.
        <button onClick={onClose} className="ml-2 text-gray-500 hover:text-gray-700">✕</button>
      </div>
    );
  }

  // Categorize facts
  const categories: Record<string, [string, unknown][]> = {};
  for (const [key, value] of Object.entries(ev.scenario)) {
    const cat = key.split(".")[0];
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push([key, value]);
  }

  // Collect all triggered fact paths from violations/warnings
  const triggeredFacts = new Set<string>();
  for (const v of [...ev.violations, ...ev.warnings]) {
    for (const f of v.triggeredFacts || []) triggeredFacts.add(f);
  }

  const catLabels: Record<string, string> = {
    location: "📍 Location",
    employer: "🏢 Employer",
    employee: "👤 Employee",
    shift: "⏰ Shift",
    schedule: "📅 Schedule",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-900">
          {emp?.name} — Shift Facts
          <span className="ml-2 text-[10px] font-normal text-gray-500">
            ({Object.keys(ev.scenario).length} facts evaluated
            {shiftIds.size > 1 && `, ${shiftIds.size} shifts selected`})
          </span>
        </h3>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">✕ Close</button>
      </div>
      <div className="grid grid-cols-5 gap-x-4 gap-y-0.5">
        {Object.entries(categories).map(([cat, facts]) => (
          <div key={cat}>
            <div className="text-[10px] font-bold text-gray-500 uppercase mb-1 border-b pb-0.5">
              {catLabels[cat] || cat}
            </div>
            {facts.map(([path, val]) => {
              const isTriggered = triggeredFacts.has(path);
              const shortPath = path.split(".").slice(1).join(".");
              return (
                <div key={path} className={`text-[10px] py-0.5 flex justify-between ${isTriggered ? "bg-yellow-50 -mx-1 px-1 rounded" : ""}`}>
                  <span className={`${isTriggered ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                    {isTriggered && <span className="text-yellow-600 mr-0.5">●</span>}
                    {shortPath}
                  </span>
                  <span className={`font-mono ml-2 ${isTriggered ? "text-gray-900 font-semibold" : "text-gray-700"}`}>
                    {typeof val === "boolean" ? (val ? "✓" : "✗") : String(val)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 text-[9px] text-gray-400">
        <span className="text-yellow-600">●</span> Facts highlighted in yellow were evaluated by rules that fired (violations or warnings).
      </div>
    </div>
  );
}

function EditableField({ label, type, value, onChange, options, highlight, step }: {
  label: string;
  type: "text" | "number" | "select";
  value: string | number;
  onChange: (v: string) => void;
  options?: string[];
  highlight?: boolean;
  step?: string;
}) {
  return (
    <div>
      <div className="text-[10px] text-gray-500 uppercase mb-0.5">{label}</div>
      {type === "select" && options ? (
        <select
          value={String(value)}
          onChange={e => onChange(e.target.value)}
          className={`w-full border rounded px-1.5 py-0.5 text-xs ${highlight ? "border-orange-300 bg-orange-50 text-orange-700" : ""}`}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          step={step}
          onChange={e => onChange(e.target.value)}
          className={`w-full border rounded px-1.5 py-0.5 text-xs ${highlight ? "border-orange-300 bg-orange-50 text-orange-700" : ""}`}
        />
      )}
    </div>
  );
}

function ShiftTimeline({ start, end, breaks }: { start: string; end: string; breaks: ShiftBreak[] }) {
  const startMins = parseTimeToMins(start);
  let endMins = parseTimeToMins(end);
  if (endMins <= startMins) endMins += 24 * 60;
  const totalMins = endMins - startMins;
  if (totalMins <= 0) return null;

  return (
    <div className="mt-2">
      <div className="text-[10px] text-gray-500 mb-1">Shift timeline</div>
      <div className="relative h-6 bg-green-100 rounded border border-green-300 overflow-hidden">
        {/* Work segments are green, breaks are overlaid */}
        {breaks.map((brk, i) => {
          const brkStart = parseTimeToMins(brk.startTime) - startMins;
          const brkWidth = brk.durationMinutes;
          const leftPct = Math.max(0, (brkStart / totalMins) * 100);
          const widthPct = Math.min(100 - leftPct, (brkWidth / totalMins) * 100);
          return (
            <div
              key={i}
              className={`absolute top-0 h-full ${brk.type === "meal" ? "bg-amber-300 border-x border-amber-400" : "bg-blue-300 border-x border-blue-400"}`}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              title={`${brk.type} break: ${formatTime(brk.startTime)} (${brk.durationMinutes} min)`}
            />
          );
        })}
        {/* Time labels */}
        <span className="absolute left-1 top-0.5 text-[9px] text-green-800 font-medium">{formatTime(start)}</span>
        <span className="absolute right-1 top-0.5 text-[9px] text-green-800 font-medium">{formatTime(end)}</span>
      </div>
      <div className="flex gap-3 mt-1 text-[9px] text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-green-100 border border-green-300"></span> Work</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-amber-300 border border-amber-400"></span> Meal</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-blue-300 border border-blue-400"></span> Rest</span>
      </div>
    </div>
  );
}

function FactsModal({ facts, onClose }: { facts: FactDef[]; onClose: () => void }) {
  const [search, setSearch] = useState("");

  const filtered = facts.filter(f =>
    !search || f.path.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const byCategory = new Map<string, FactDef[]>();
  for (const f of filtered) {
    const cat = f.category || "Other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(f);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">All Facts ({facts.length})</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="px-4 py-2 border-b">
          <input
            type="text"
            placeholder="Search facts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded px-3 py-1.5 text-sm"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-auto p-4">
          {[...byCategory.entries()].map(([cat, catFacts]) => (
            <div key={cat} className="mb-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">{cat}</h3>
              <div className="space-y-1">
                {catFacts.map(f => (
                  <div key={f.path} className="flex items-start gap-3 py-1 px-2 rounded hover:bg-gray-50 text-xs">
                    <code className="text-blue-700 font-mono whitespace-nowrap min-w-[200px]">{f.path}</code>
                    <span className="text-gray-400 min-w-[50px]">{f.type}</span>
                    <span className="text-gray-600">{f.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-gray-400 py-8">No facts match "{search}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
