import { useState, useEffect, useCallback } from "react";

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
}

interface Shift {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface Violation {
  ruleId: string;
  title: string;
  outcome: string;
  explanation: string;
  supersededBy?: string;
}

interface ShiftWithViolations extends Shift {
  violations: Violation[];
  warnings: Violation[];
}

// ─── Helpers ───────────────────────────────────────────────────────

const API = "http://localhost:3001/api/scheduler";

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

// ─── Component ─────────────────────────────────────────────────────

export function SchedulerPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ShiftWithViolations[]>([]);
  const [weekDates, setWeekDates] = useState<string[]>(getWeekDates(new Date()));

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalEmployee, setModalEmployee] = useState<string>("");
  const [modalDate, setModalDate] = useState<string>("");
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("17:00");
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  // Violation popover
  const [popoverShift, setPopoverShift] = useState<string | null>(null);

  // Load stores
  useEffect(() => {
    fetch(`${API}/stores`)
      .then(r => r.json())
      .then((data: Store[]) => {
        setStores(data);
        if (data.length > 0) setSelectedStore(data[0].id);
      });
  }, []);

  // Load employees when store changes
  useEffect(() => {
    if (!selectedStore) return;
    fetch(`${API}/employees/${selectedStore}`)
      .then(r => r.json())
      .then((data: Employee[]) => setEmployees(data));
    setShifts([]);
  }, [selectedStore]);

  // Week navigation
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

  // Check shift against rules
  const checkShift = useCallback(async (shift: Shift): Promise<{ violations: Violation[]; warnings: Violation[] }> => {
    // Build week context: other shifts for same employee this week
    const otherShiftsThisWeek = shifts
      .filter(s => s.employeeId === shift.employeeId && s.id !== shift.id)
      .map(({ id, employeeId, date, startTime, endTime }) => ({ id, employeeId, date, startTime, endTime }));

    const resp = await fetch(`${API}/check-shift`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shift,
        employeeId: shift.employeeId,
        storeId: selectedStore,
        weekContext: { otherShiftsThisWeek, priorWeekShifts: [] },
      }),
    });
    const data = await resp.json();
    return { violations: data.violations || [], warnings: data.warnings || [] };
  }, [shifts, selectedStore]);

  // Re-evaluate all shifts for an employee (when one changes, weekly hours change)
  const reEvaluateEmployee = useCallback(async (employeeId: string, allShifts: ShiftWithViolations[]) => {
    const empShifts = allShifts.filter(s => s.employeeId === employeeId);
    const updated = await Promise.all(
      empShifts.map(async (s) => {
        const otherShiftsThisWeek = allShifts
          .filter(o => o.employeeId === employeeId && o.id !== s.id)
          .map(({ id, employeeId, date, startTime, endTime }) => ({ id, employeeId, date, startTime, endTime }));

        const resp = await fetch(`${API}/check-shift`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shift: { id: s.id, employeeId: s.employeeId, date: s.date, startTime: s.startTime, endTime: s.endTime },
            employeeId: s.employeeId,
            storeId: selectedStore,
            weekContext: { otherShiftsThisWeek, priorWeekShifts: [] },
          }),
        });
        const data = await resp.json();
        return { ...s, violations: data.violations || [], warnings: data.warnings || [] };
      })
    );
    return allShifts.map(s => {
      const u = updated.find(x => x.id === s.id);
      return u || s;
    });
  }, [selectedStore]);

  // Add or update shift
  const saveShift = async () => {
    const shift: Shift = {
      id: editingShiftId || `shift-${Date.now()}`,
      employeeId: modalEmployee,
      date: modalDate,
      startTime: modalStart,
      endTime: modalEnd,
    };

    const { violations, warnings } = await checkShift(shift);
    const shiftWithV: ShiftWithViolations = { ...shift, violations, warnings };

    let newShifts: ShiftWithViolations[];
    if (editingShiftId) {
      newShifts = shifts.map(s => s.id === editingShiftId ? shiftWithV : s);
    } else {
      newShifts = [...shifts, shiftWithV];
    }

    // Re-evaluate all shifts for this employee (weekly hours may have changed)
    newShifts = await reEvaluateEmployee(modalEmployee, newShifts);
    setShifts(newShifts);
    setShowModal(false);
    setEditingShiftId(null);
  };

  // Delete shift
  const deleteShift = async (shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;
    let newShifts = shifts.filter(s => s.id !== shiftId);
    newShifts = await reEvaluateEmployee(shift.employeeId, newShifts);
    setShifts(newShifts);
    setPopoverShift(null);
  };

  // Open modal for new shift
  const openNewShift = (employeeId: string, date: string) => {
    setModalEmployee(employeeId);
    setModalDate(date);
    setModalStart("09:00");
    setModalEnd("17:00");
    setEditingShiftId(null);
    setShowModal(true);
  };

  // Open modal for editing
  const openEditShift = (shift: ShiftWithViolations) => {
    setModalEmployee(shift.employeeId);
    setModalDate(shift.date);
    setModalStart(shift.startTime);
    setModalEnd(shift.endTime);
    setEditingShiftId(shift.id);
    setShowModal(true);
    setPopoverShift(null);
  };

  // Get shifts for a cell
  const getShiftsForCell = (employeeId: string, date: string) =>
    shifts.filter(s => s.employeeId === employeeId && s.date === date);

  const currentStore = stores.find(s => s.id === selectedStore);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white font-bold text-xl shadow-sm">§</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Schedule Builder</h1>
            <p className="text-sm text-gray-500">Real-time compliance checking • {shifts.length} shifts scheduled</p>
          </div>
        </div>
        <a href="/" className="text-sm text-blue-600 hover:underline">← Rules Explorer</a>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-4 bg-white rounded-lg shadow-card border border-gray-200 px-4 py-3">
        {/* Store selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Store:</label>
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.state})</option>
            ))}
          </select>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={prevWeek} className="px-2 py-1 text-sm border rounded hover:bg-gray-100">← Prev</button>
          <button onClick={thisWeek} className="px-2 py-1 text-sm border rounded hover:bg-gray-100">Today</button>
          <button onClick={nextWeek} className="px-2 py-1 text-sm border rounded hover:bg-gray-100">Next →</button>
          <span className="text-sm text-gray-600 ml-2">
            {weekDates[0]} — {weekDates[6]}
          </span>
        </div>
      </div>

      {/* State badge */}
      {currentStore && (
        <div className="mb-3 text-xs text-gray-500">
          Evaluating against: <span className="font-semibold text-gray-700">{currentStore.state}</span> + Federal rules
          ({currentStore.city}{currentStore.state === "NY" ? " — Fair Workweek applies" : ""})
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-card border border-gray-200 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left w-40 sticky left-0 bg-gray-100 z-10">Employee</th>
              {weekDates.map(d => (
                <th key={d} className="border p-2 text-center min-w-[120px]">{formatDay(d)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="border p-2 sticky left-0 bg-white z-10">
                  <div className="font-medium text-gray-900">{emp.name}</div>
                  <div className="text-xs text-gray-500">
                    {emp.age < 18 && <span className="text-orange-600 font-medium">Minor ({emp.age}) • </span>}
                    {emp.exemptStatus === "exempt" ? "Exempt" : `$${emp.hourlyRate}/hr`}
                  </div>
                </td>
                {weekDates.map(date => {
                  const cellShifts = getShiftsForCell(emp.id, date);
                  return (
                    <td
                      key={date}
                      className="border p-1 align-top cursor-pointer hover:bg-blue-50 relative"
                      onClick={() => cellShifts.length === 0 && openNewShift(emp.id, date)}
                    >
                      {cellShifts.map(s => (
                        <ShiftBlock
                          key={s.id}
                          shift={s}
                          isPopoverOpen={popoverShift === s.id}
                          onTogglePopover={() => setPopoverShift(popoverShift === s.id ? null : s.id)}
                          onEdit={() => openEditShift(s)}
                          onDelete={() => deleteShift(s.id)}
                        />
                      ))}
                      {cellShifts.length === 0 && (
                        <div className="text-center text-gray-300 text-lg py-2">+</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shift Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">
              {editingShiftId ? "Edit Shift" : "Add Shift"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <div className="text-sm text-gray-900">
                  {employees.find(e => e.id === modalEmployee)?.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <div className="text-sm text-gray-900">{modalDate}</div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <input
                    type="time"
                    value={modalStart}
                    onChange={e => setModalStart(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <input
                    type="time"
                    value={modalEnd}
                    onChange={e => setModalEnd(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={saveShift}
                className="flex-1 bg-blue-600 text-white rounded px-3 py-2 text-sm font-medium hover:bg-blue-700"
              >
                {editingShiftId ? "Update" : "Add Shift"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border rounded px-3 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shift Block Component ─────────────────────────────────────────

function ShiftBlock({
  shift,
  isPopoverOpen,
  onTogglePopover,
  onEdit,
  onDelete,
}: {
  shift: ShiftWithViolations;
  isPopoverOpen: boolean;
  onTogglePopover: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasViolations = shift.violations.length > 0;
  const hasWarnings = shift.warnings.length > 0;
  const isClean = !hasViolations && !hasWarnings;

  const bgColor = hasViolations
    ? "bg-red-50 border-red-300"
    : hasWarnings
    ? "bg-yellow-50 border-yellow-300"
    : "bg-green-50 border-green-300";

  return (
    <div className={`relative rounded border px-1.5 py-1 mb-1 text-xs ${bgColor}`}>
      {/* Time display */}
      <div className="font-medium text-gray-800">
        {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
      </div>

      {/* Badges */}
      <div className="flex gap-1 mt-0.5">
        {hasViolations && (
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePopover(); }}
            className="bg-red-600 text-white rounded-full px-1.5 py-0 text-[10px] font-bold hover:bg-red-700"
          >
            {shift.violations.length} ✕
          </button>
        )}
        {hasWarnings && (
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePopover(); }}
            className="bg-yellow-500 text-white rounded-full px-1.5 py-0 text-[10px] font-bold hover:bg-yellow-600"
          >
            {shift.warnings.length} ⚠
          </button>
        )}
        {isClean && (
          <span className="text-green-600 text-[10px]">✓ OK</span>
        )}
      </div>

      {/* Popover */}
      {isPopoverOpen && (
        <div
          className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-72"
          onClick={e => e.stopPropagation()}
        >
          {shift.violations.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-bold text-red-700 mb-1">Violations:</div>
              {shift.violations.map((v, i) => (
                <div key={i} className="mb-1.5 pl-2 border-l-2 border-red-300">
                  <div className="text-xs font-medium text-gray-900">{v.title}</div>
                  <div className="text-[11px] text-gray-600">{v.explanation}</div>
                </div>
              ))}
            </div>
          )}
          {shift.warnings.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-bold text-yellow-700 mb-1">Warnings:</div>
              {shift.warnings.map((v, i) => (
                <div key={i} className="mb-1.5 pl-2 border-l-2 border-yellow-300">
                  <div className="text-xs font-medium text-gray-900">{v.title}</div>
                  <div className="text-[11px] text-gray-600">{v.explanation}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-2 pt-2 border-t">
            <button onClick={onEdit} className="text-xs text-blue-600 hover:underline">Edit</button>
            <button onClick={onDelete} className="text-xs text-red-600 hover:underline">Delete</button>
            <button onClick={onTogglePopover} className="text-xs text-gray-500 hover:underline ml-auto">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
