import { useState } from "react";

interface StructuredRuleEditorProps {
  /** Current JSON string (pretty-printed) or null */
  currentJson: string | null;
  /** Whether the notes field indicates manual editing */
  isManuallyEdited: boolean;
  /** Save handler — receives the new JSON string */
  onSave: (json: string) => Promise<{ ok: boolean; error?: string }>;
  /** Suggest correction handler — sends plain text, returns proposed JSON */
  onSuggestCorrection: (correction: string) => Promise<{
    ok: boolean;
    proposedRule?: Record<string, unknown>;
    explanation?: string;
    confidence?: string;
    error?: string;
  }>;
  /** Regenerate handler — if provided, shows the Regenerate button */
  onRegenerate?: () => Promise<{ ok: boolean; error?: string }>;
  /** Label for regenerate unavailable */
  regenerateUnavailableReason?: string;
}

export function StructuredRuleEditor({
  currentJson,
  isManuallyEdited,
  onSave,
  onSuggestCorrection,
  onRegenerate,
  regenerateUnavailableReason,
}: StructuredRuleEditorProps) {
  // Correction flow state
  const [correction, setCorrection] = useState("");
  const [generating, setGenerating] = useState(false);
  const [proposedJson, setProposedJson] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);

  // Raw edit state (de-emphasized)
  const [showRawEdit, setShowRawEdit] = useState(false);
  const [rawDraft, setRawDraft] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  // Shared state
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ─── Correction flow ─────────────────────────────────────────────

  async function handleSuggestCorrection() {
    if (!correction.trim()) return;
    setGenerating(true);
    setMsg(null);
    setProposedJson(null);

    const result = await onSuggestCorrection(correction.trim());
    setGenerating(false);

    if (result.ok && result.proposedRule) {
      setProposedJson(JSON.stringify(result.proposedRule, null, 2));
      setExplanation(result.explanation || null);
      setConfidence(result.confidence || null);
    } else {
      setMsg({ type: "error", text: result.error || "Failed to generate correction." });
    }
  }

  async function handleAcceptProposed() {
    if (!proposedJson) return;
    setSaving(true);
    setMsg(null);
    const result = await onSave(proposedJson);
    setSaving(false);

    if (result.ok) {
      setMsg({ type: "success", text: "Correction accepted and saved." });
      setProposedJson(null);
      setCorrection("");
      setExplanation(null);
      setConfidence(null);
    } else {
      setMsg({ type: "error", text: result.error || "Save failed." });
    }
  }

  function handleCancelProposed() {
    setProposedJson(null);
    setExplanation(null);
    setConfidence(null);
  }

  // ─── Raw edit flow ───────────────────────────────────────────────

  function handleStartRawEdit() {
    setRawDraft(currentJson || "{\n  \n}");
    setParseError(null);
    setShowRawEdit(true);
    setMsg(null);
  }

  function handleCancelRawEdit() {
    setShowRawEdit(false);
    setRawDraft("");
    setParseError(null);
  }

  async function handleSaveRawEdit() {
    if (!rawDraft.trim()) {
      setParseError("JSON cannot be empty.");
      return;
    }
    try {
      JSON.parse(rawDraft);
    } catch (e: any) {
      setParseError(`Invalid JSON: ${e.message}`);
      return;
    }
    setParseError(null);
    setSaving(true);
    setMsg(null);
    const result = await onSave(rawDraft);
    setSaving(false);

    if (result.ok) {
      setMsg({ type: "success", text: "Saved." });
      setShowRawEdit(false);
    } else {
      setMsg({ type: "error", text: result.error || "Save failed." });
    }
  }

  // ─── Regenerate ──────────────────────────────────────────────────

  async function handleRegenerate() {
    if (!onRegenerate) return;
    setRegenerating(true);
    setMsg(null);
    const result = await onRegenerate();
    setRegenerating(false);

    if (result.ok) {
      setMsg({ type: "success", text: "Regenerated successfully." });
    } else {
      setMsg({ type: "error", text: result.error || "Regeneration failed." });
    }
  }

  // ─── Display ─────────────────────────────────────────────────────

  let displayJson: string | null = null;
  if (currentJson) {
    try {
      displayJson = JSON.stringify(JSON.parse(currentJson), null, 2);
    } catch {
      displayJson = currentJson;
    }
  }

  const CONFIDENCE_COLORS: Record<string, string> = {
    high: "bg-green-100 text-green-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-red-100 text-red-800",
  };

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-lg font-semibold">Structured Rule</h2>
        {isManuallyEdited && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
            Manually edited
          </span>
        )}
      </div>

      {/* Messages */}
      {msg && (
        <div className={`mb-3 px-3 py-2 rounded text-xs ${msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Current JSON display */}
      {displayJson ? (
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto max-h-80 overflow-y-auto">
          {displayJson}
        </pre>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800 font-medium">⚠ No structured rule JSON.</p>
        </div>
      )}

      {/* ─── Suggest Correction section ───────────────────────────── */}
      {!proposedJson && !showRawEdit && (
        <div className="mt-4 bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Suggest Correction</h3>
          <textarea
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="Describe what is wrong or missing. Example: This rule is missing the Government Supported Employees exception."
            className="w-full border rounded px-3 py-2 text-sm resize-none min-h-[60px]"
            rows={2}
            disabled={generating}
          />
          <div className="flex gap-2 mt-2 items-center">
            <button
              onClick={handleSuggestCorrection}
              disabled={generating || !correction.trim()}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                generating || !correction.trim()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {generating ? "Generating…" : "Regenerate Structured JSON"}
            </button>

            {onRegenerate ? (
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  regenerating
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                {regenerating ? "Regenerating…" : "Re-extract from Source"}
              </button>
            ) : regenerateUnavailableReason ? (
              <span className="text-[10px] text-gray-400 italic">{regenerateUnavailableReason}</span>
            ) : null}

            <button
              onClick={handleStartRawEdit}
              className="px-3 py-1.5 text-xs font-medium rounded text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            >
              Edit JSON directly
            </button>
          </div>
        </div>
      )}

      {/* ─── Proposed correction (review before saving) ───────────── */}
      {proposedJson && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-blue-800">Proposed Correction</h3>
            {confidence && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CONFIDENCE_COLORS[confidence] || "bg-gray-100 text-gray-600"}`}>
                {confidence} confidence
              </span>
            )}
          </div>

          {explanation && (
            <p className="text-xs text-blue-700 mb-3">{explanation}</p>
          )}

          <pre className="bg-gray-900 text-gray-100 rounded p-3 text-[11px] overflow-x-auto max-h-64 overflow-y-auto">
            {proposedJson}
          </pre>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAcceptProposed}
              disabled={saving}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                saving
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {saving ? "Saving…" : "Accept Generated JSON"}
            </button>
            <button
              onClick={handleCancelProposed}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Raw JSON edit (de-emphasized) ─────────────────────────── */}
      {showRawEdit && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Edit Raw JSON</h3>
          <textarea
            value={rawDraft}
            onChange={(e) => {
              setRawDraft(e.target.value);
              if (parseError) {
                try { JSON.parse(e.target.value); setParseError(null); } catch {}
              }
            }}
            className={`w-full font-mono text-sm border rounded p-3 min-h-[180px] max-h-[400px] resize-y ${
              parseError ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
            }`}
            spellCheck={false}
          />
          {parseError && (
            <div className="mt-1 px-3 py-1.5 rounded bg-red-50 text-red-700 text-xs font-mono">
              {parseError}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSaveRawEdit}
              disabled={saving}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                saving ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving…" : "Save JSON"}
            </button>
            <button
              onClick={handleCancelRawEdit}
              disabled={saving}
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
