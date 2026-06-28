import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// GET /api/jurisdictions
app.get("/api/jurisdictions", async (_req, res) => {
  const jurisdictions = await prisma.jurisdiction.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  res.json(jurisdictions);
});

// GET /api/law-categories
app.get("/api/law-categories", async (_req, res) => {
  const categories = await prisma.lawCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  res.json(categories);
});

// GET /api/applicability-variables
app.get("/api/applicability-variables", async (_req, res) => {
  const variables = await prisma.applicabilityVariable.findMany({
    orderBy: [{ category: "asc" }, { path: "asc" }],
  });
  res.json(variables);
});

// GET /api/law-sources
app.get("/api/law-sources", async (_req, res) => {
  const sources = await prisma.lawSource.findMany({
    include: {
      jurisdiction: true,
      lawCategory: true,
    },
    orderBy: { title: "asc" },
  });
  res.json(sources);
});

// GET /api/law-sources/:id
app.get("/api/law-sources/:id", async (req, res) => {
  const source = await prisma.lawSource.findUnique({
    where: { id: req.params.id },
    include: {
      jurisdiction: true,
      lawCategory: true,
      applicabilityVariables: {
        include: { applicabilityVariable: true },
      },
    },
  });
  if (!source) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(source);
});

// PATCH /api/law-sources/:id/verification
app.patch("/api/law-sources/:id/verification", async (req, res) => {
  const { verificationStatus, verificationNotes } = req.body;

  const allowed = ["auto_generated", "verified", "suspended"];
  if (!verificationStatus || !allowed.includes(verificationStatus)) {
    res.status(400).json({ error: "verificationStatus must be one of: auto_generated, verified, suspended" });
    return;
  }

  try {
    const updated = await prisma.lawSource.update({
      where: { id: req.params.id },
      data: {
        verificationStatus,
        verificationNotes: verificationNotes ?? null,
      },
      include: {
        jurisdiction: true,
        lawCategory: true,
        applicabilityVariables: { include: { applicabilityVariable: true } },
      },
    });
    res.json(updated);
  } catch (e: any) {
    if (e.code === "P2025") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/law-sources/:id/structured-text
// Allows manual editing of the structured rule JSON for a LawSource.
app.patch("/api/law-sources/:id/structured-text", async (req, res) => {
  const { structuredText, editNote } = req.body;

  // Validate JSON
  if (structuredText !== null && structuredText !== "") {
    try {
      JSON.parse(structuredText);
    } catch {
      res.status(400).json({ error: "Invalid JSON: could not parse structuredText." });
      return;
    }
  }

  // Disallow saving empty without explicit intent
  if (structuredText === "" || structuredText === null) {
    res.status(400).json({ error: "Cannot save empty structured text. Use null explicitly to clear." });
    return;
  }

  try {
    const existing = await prisma.lawSource.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    // Append edit note to existing notes
    let notes = existing.notes || "";
    if (editNote) {
      const timestamp = new Date().toISOString().slice(0, 16);
      notes = notes ? `${notes}\n[${timestamp}] Manual edit: ${editNote}` : `[${timestamp}] Manual edit: ${editNote}`;
    } else {
      const timestamp = new Date().toISOString().slice(0, 16);
      notes = notes ? `${notes}\n[${timestamp}] Structured JSON manually edited.` : `[${timestamp}] Structured JSON manually edited.`;
    }

    const updated = await prisma.lawSource.update({
      where: { id: req.params.id },
      data: { structuredText, notes },
      include: {
        jurisdiction: true,
        lawCategory: true,
        applicabilityVariables: { include: { applicabilityVariable: true } },
      },
    });
    res.json(updated);
  } catch (e: any) {
    if (e.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/candidates/:id/structured-rule
// Allows manual editing of the structured rule JSON for a CrawlerCandidate.
app.patch("/api/candidates/:id/structured-rule", async (req, res) => {
  const { structuredRule, editNote } = req.body;

  // Validate JSON (structuredRule is an object, not a string)
  if (structuredRule !== null && structuredRule !== undefined) {
    if (typeof structuredRule !== "object") {
      res.status(400).json({ error: "structuredRule must be a JSON object." });
      return;
    }
  }

  if (structuredRule === null || (typeof structuredRule === "object" && Object.keys(structuredRule).length === 0)) {
    res.status(400).json({ error: "Cannot save empty structuredRule." });
    return;
  }

  try {
    const existing = await prisma.crawlerCandidate.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    // Update actionableFacts.structuredRule
    const facts = (existing.actionableFacts as Record<string, unknown>) || {};
    facts.structuredRule = structuredRule;

    // Append edit note
    let notes = existing.notes || "";
    if (editNote) {
      const timestamp = new Date().toISOString().slice(0, 16);
      notes = notes ? `${notes}\n[${timestamp}] Manual edit: ${editNote}` : `[${timestamp}] Manual edit: ${editNote}`;
    } else {
      const timestamp = new Date().toISOString().slice(0, 16);
      notes = notes ? `${notes}\n[${timestamp}] Structured JSON manually edited.` : `[${timestamp}] Structured JSON manually edited.`;
    }

    // If structuredRule is now valid, ensure contentAssessmentStatus is actionable
    const updateData: Record<string, unknown> = {
      actionableFacts: facts,
      notes,
    };
    if (existing.contentAssessmentStatus !== "actionable") {
      updateData.contentAssessmentStatus = "actionable";
    }

    const updated = await prisma.crawlerCandidate.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        guessedJurisdiction: { select: { id: true, name: true, type: true, state: true } },
        guessedLawCategory: { select: { id: true, name: true, level: true } },
      },
    });
    res.json(updated);
  } catch (e: any) {
    if (e.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
    res.status(500).json({ error: e.message });
  }
});

// POST /api/law-sources/:id/regenerate
// Re-runs content assessment on the linked candidate and refreshes structuredText.
app.post("/api/law-sources/:id/regenerate", async (req, res) => {
  const { assessContent } = await import("./crawler/content-assessor.js");

  try {
    const lawSource = await prisma.lawSource.findUnique({
      where: { id: req.params.id },
      include: { jurisdiction: true, lawCategory: true },
    });
    if (!lawSource) { res.status(404).json({ error: "Not found" }); return; }

    if (!lawSource.sourceUrl) {
      res.status(400).json({ error: "Cannot regenerate: no source URL on this LawSource." });
      return;
    }

    // Determine topic
    const catName = lawSource.lawCategory.name.toLowerCase();
    let topic: string | undefined;
    if (catName.includes("minimum wage")) topic = "minimum_wage";
    else if (catName.includes("overtime")) topic = "overtime";
    else if (catName.includes("sick leave")) topic = "paid_sick_leave";
    else if (catName.includes("scheduling") || catName.includes("predictive") || catName.includes("workweek")) topic = "predictive_scheduling";
    else if (catName.includes("meal") || catName.includes("break")) topic = "meal_break";
    else if (catName.includes("tipped") || catName.includes("tip credit")) topic = "tipped_compensation";
    else if (catName.includes("compensable")) topic = "compensable_time";
    else if (catName.includes("equal pay")) topic = "equal_pay";
    else if (catName.includes("family") || catName.includes("medical leave")) topic = "family_medical_leave";
    else if (catName.includes("minor") || catName.includes("child labor")) topic = "minor_labor";
    else if (catName.includes("warn")) topic = "warn_act";
    else if (catName.includes("discrimination")) topic = "anti_discrimination";
    else if (catName.includes("safety")) topic = "workplace_safety";
    else if (catName.includes("classification") || catName.includes("contractor")) topic = "worker_classification";

    const result = await assessContent(lawSource.sourceUrl, topic, lawSource.title, lawSource.jurisdiction.name);

    if (result.status !== "actionable") {
      res.status(422).json({ error: `Assessment returned "${result.status}": ${result.summary || "No actionable content found."}` });
      return;
    }

    const facts = result.actionableFacts as Record<string, unknown> | null;
    if (!facts || !facts.structuredRule) {
      res.status(422).json({ error: "Assessment was actionable but no structuredRule was produced." });
      return;
    }

    const structuredText = JSON.stringify(facts.structuredRule, null, 2);
    const timestamp = new Date().toISOString().slice(0, 16);
    const notes = (lawSource.notes || "") + `\n[${timestamp}] Regenerated from source URL.`;

    const updated = await prisma.lawSource.update({
      where: { id: req.params.id },
      data: { structuredText, notes: notes.trim() },
      include: {
        jurisdiction: true,
        lawCategory: true,
        applicabilityVariables: { include: { applicabilityVariable: true } },
      },
    });
    res.json(updated);
  } catch (e: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || "Regeneration failed" });
    }
  }
});

// POST /api/law-sources/:id/suggest-correction
// Takes a plain-English correction and proposes a new structuredRule JSON.
// Does NOT save — returns the proposal for user review.
app.post("/api/law-sources/:id/suggest-correction", async (req, res) => {
  const { applyCorrectionToRule } = await import("./crawler/rule-corrector.js");
  const { correction } = req.body;

  if (!correction || typeof correction !== "string" || correction.trim().length < 5) {
    res.status(400).json({ error: "Please provide a correction description (at least 5 characters)." });
    return;
  }

  try {
    const lawSource = await prisma.lawSource.findUnique({
      where: { id: req.params.id },
      include: { jurisdiction: true, lawCategory: true },
    });
    if (!lawSource) { res.status(404).json({ error: "Not found" }); return; }

    // Parse current structured rule
    let currentRule: Record<string, unknown> = {};
    if (lawSource.structuredText) {
      try { currentRule = JSON.parse(lawSource.structuredText); } catch {}
    }

    const result = await applyCorrectionToRule(
      currentRule,
      lawSource.sourceUrl,
      correction.trim(),
      lawSource.jurisdiction.name,
    );

    res.json({
      proposedRule: result.proposedRule,
      explanation: result.explanation,
      confidence: result.confidence,
    });
  } catch (e: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || "Correction failed" });
    }
  }
});

// POST /api/candidates/:id/suggest-correction
// Takes a plain-English correction and proposes a new structuredRule JSON.
// Does NOT save — returns the proposal for user review.
app.post("/api/candidates/:id/suggest-correction", async (req, res) => {
  const { applyCorrectionToRule } = await import("./crawler/rule-corrector.js");
  const { correction } = req.body;

  if (!correction || typeof correction !== "string" || correction.trim().length < 5) {
    res.status(400).json({ error: "Please provide a correction description (at least 5 characters)." });
    return;
  }

  try {
    const candidate = await prisma.crawlerCandidate.findUnique({
      where: { id: req.params.id },
      include: { guessedJurisdiction: true, guessedLawCategory: true },
    });
    if (!candidate) { res.status(404).json({ error: "Not found" }); return; }

    // Parse current structured rule from actionableFacts
    const facts = (candidate.actionableFacts as Record<string, unknown>) || {};
    let currentRule: Record<string, unknown> = {};
    if (facts.structuredRule && typeof facts.structuredRule === "object") {
      currentRule = facts.structuredRule as Record<string, unknown>;
    }

    const sourceUrl = candidate.finalUrl || candidate.sourceUrl;
    const result = await applyCorrectionToRule(
      currentRule,
      sourceUrl,
      correction.trim(),
      candidate.guessedJurisdiction?.name,
    );

    res.json({
      proposedRule: result.proposedRule,
      explanation: result.explanation,
      confidence: result.confidence,
    });
  } catch (e: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || "Correction failed" });
    }
  }
});

// ── Helper: build clean LawSource data from candidate facts ─────────
function buildLawSourceFromCandidate(candidate: {
  title: string | null;
  contentAssessmentSummary: string | null;
  summary: string | null;
  actionableFacts: unknown;
}): { summary: string; structuredText: string } {
  const facts = candidate.actionableFacts as Record<string, unknown> | null;
  let summary = candidate.summary || "";
  let structuredText = "";

  // Prefer structuredRule if present (new format)
  if (facts && facts.structuredRule) {
    structuredText = JSON.stringify(facts.structuredRule, null, 2);
    // Build summary from structuredRule
    const rule = facts.structuredRule as Record<string, unknown>;
    let titlePart = candidate.title || "Rule";
    const firstSentenceEnd = titlePart.indexOf(". ");
    if (firstSentenceEnd > 0 && firstSentenceEnd < 80) titlePart = titlePart.slice(0, firstSentenceEnd);
    else if (titlePart.length > 80) titlePart = titlePart.slice(0, 80).replace(/\s+\S*$/, "");

    if (rule.ruleType === "overtime") {
      const threshold = rule.threshold as { hours: number; period: string } | undefined;
      const rate = rule.premiumRate as number | undefined;
      summary = `${titlePart}: ${threshold?.hours || 40}-hour ${threshold?.period || "workweek"} threshold at ${rate || 1.5}x premium rate.`;
    } else if (rule.ruleType === "minimum_wage") {
      const sel = rule.selectedRate as { amount: string; year: string } | undefined;
      if (sel) {
        summary = `${titlePart} is ${sel.amount}/hour for ${sel.year}.`;
      } else {
        summary = candidate.contentAssessmentSummary || titlePart;
      }
    } else {
      summary = candidate.contentAssessmentSummary || titlePart;
    }
    return { summary, structuredText };
  }

  // Legacy format: selectedRate at top level (old minimum_wage assessments)
  if (facts && facts.selectedRate) {
    const sel = facts.selectedRate as { amount: string; year: string; reason: string };
    const rates = (facts.rates as { amount: string; year: string | null }[] | undefined) || [];
    const multiRate = facts.multiRate === true;

    let titlePart = candidate.title || "Minimum wage";
    const firstSentenceEnd = titlePart.indexOf(". ");
    if (firstSentenceEnd > 0 && firstSentenceEnd < 80) {
      titlePart = titlePart.slice(0, firstSentenceEnd);
    } else if (titlePart.length > 80) {
      titlePart = titlePart.slice(0, 80).replace(/\s+\S*$/, "");
    }
    if (multiRate) {
      summary = `${titlePart} includes multiple rates. Selected current rate: ${sel.amount}/hour for ${sel.year}.`;
    } else {
      summary = `${titlePart} is ${sel.amount}/hour for ${sel.year}.`;
    }

    const cleanRates = rates.map((r) => ({ amount: r.amount, year: r.year }));
    structuredText = JSON.stringify({
      selectedRate: { amount: sel.amount, year: sel.year, reason: sel.reason },
      rates: cleanRates,
      multiRate,
    }, null, 2);
  } else if (candidate.contentAssessmentSummary) {
    summary = candidate.contentAssessmentSummary;
  }

  return { summary, structuredText };
}

// POST /api/law-sources/:id/refresh-from-candidate
app.post("/api/law-sources/:id/refresh-from-candidate", async (req, res) => {
  try {
    const lawSource = await prisma.lawSource.findUnique({ where: { id: req.params.id } });
    if (!lawSource) { res.status(404).json({ error: "LawSource not found" }); return; }

    if (!lawSource.sourceCandidateId) {
      res.status(400).json({ error: "This LawSource has no linked CrawlerCandidate (sourceCandidateId is null)." });
      return;
    }

    const candidate = await prisma.crawlerCandidate.findUnique({ where: { id: lawSource.sourceCandidateId } });
    if (!candidate) { res.status(404).json({ error: "Linked CrawlerCandidate not found" }); return; }

    const { summary, structuredText } = buildLawSourceFromCandidate(candidate);

    const updated = await prisma.lawSource.update({
      where: { id: req.params.id },
      data: { summary, structuredText },
      include: {
        jurisdiction: true,
        lawCategory: true,
        applicabilityVariables: { include: { applicabilityVariable: true } },
      },
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/law-sources/:id/suspend
app.post("/api/law-sources/:id/suspend", async (req, res) => {
  try {
    const updated = await prisma.lawSource.update({
      where: { id: req.params.id },
      data: { verificationStatus: "suspended" },
      include: { jurisdiction: true, lawCategory: true },
    });
    res.json(updated);
  } catch (e: any) {
    if (e.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
    res.status(500).json({ error: e.message });
  }
});

// POST /api/law-sources/:id/select-active
// Marks this LawSource as the active rule and suspends all other LawSources
// in the same jurisdiction+category cell.
app.post("/api/law-sources/:id/select-active", async (req, res) => {
  try {
    const lawSource = await prisma.lawSource.findUnique({ where: { id: req.params.id } });
    if (!lawSource) { res.status(404).json({ error: "Not found" }); return; }

    // Suspend all other LawSources in the same cell
    await prisma.lawSource.updateMany({
      where: {
        jurisdictionId: lawSource.jurisdictionId,
        lawCategoryId: lawSource.lawCategoryId,
        id: { not: lawSource.id },
        verificationStatus: { not: "suspended" },
      },
      data: {
        verificationStatus: "suspended",
        verificationNotes: `Superseded: another rule was selected as active.`,
      },
    });

    // Mark this one as active (auto_generated if not already verified)
    const newStatus = lawSource.verificationStatus === "verified" ? "verified" : "auto_generated";
    const updated = await prisma.lawSource.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: newStatus,
        status: "active",
      },
      include: { jurisdiction: true, lawCategory: true },
    });

    res.json(updated);
  } catch (e: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    }
  }
});

// POST /api/law-sources/:id/reingest
// Re-ingests a law source from a new URL: assesses the page, extracts structured rule,
// and creates a new LawSource record with the updated data.
app.post("/api/law-sources/:id/reingest", async (req, res) => {
  const { assessContent } = await import("./crawler/content-assessor.js");
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  // Validate URL format
  try { new URL(url); } catch {
    res.status(400).json({ error: "Invalid URL format" });
    return;
  }

  try {
    const lawSource = await prisma.lawSource.findUnique({
      where: { id: req.params.id },
      include: { jurisdiction: true, lawCategory: true },
    });
    if (!lawSource) { res.status(404).json({ error: "LawSource not found" }); return; }

    // Determine topic from category name
    const catName = lawSource.lawCategory.name.toLowerCase();
    let topic: string | undefined;
    if (catName.includes("minimum wage")) topic = "minimum_wage";
    else if (catName.includes("overtime")) topic = "overtime";
    else if (catName.includes("sick leave")) topic = "paid_sick_leave";
    else if (catName.includes("scheduling") || catName.includes("predictive") || catName.includes("advance") || catName.includes("workweek")) topic = "predictive_scheduling";
    else if (catName.includes("meal") || catName.includes("break")) topic = "meal_break";
    else if (catName.includes("tipped") || catName.includes("tip credit")) topic = "tipped_compensation";
    else if (catName.includes("compensable")) topic = "compensable_time";
    else if (catName.includes("equal pay")) topic = "equal_pay";
    else if (catName.includes("family") || catName.includes("medical leave")) topic = "family_medical_leave";
    else if (catName.includes("minor") || catName.includes("child labor")) topic = "minor_labor";
    else if (catName.includes("warn")) topic = "warn_act";
    else if (catName.includes("discrimination")) topic = "anti_discrimination";
    else if (catName.includes("safety")) topic = "workplace_safety";
    else if (catName.includes("classification") || catName.includes("contractor")) topic = "worker_classification";

    // Assess the new URL
    const result = await assessContent(url, topic, lawSource.title, lawSource.jurisdiction.name);

    if (result.status !== "actionable") {
      res.status(422).json({
        error: `Page assessment returned "${result.status}": ${result.summary || "Could not extract actionable content from this URL."}`,
      });
      return;
    }

    const facts = result.actionableFacts as Record<string, unknown> | null;
    if (!facts || !facts.structuredRule) {
      res.status(422).json({
        error: "Page was assessed as actionable but no structured rule could be extracted.",
      });
      return;
    }

    // Build the new LawSource data from the assessment
    const { summary, structuredText } = buildLawSourceFromCandidate({
      title: lawSource.title,
      contentAssessmentSummary: result.summary,
      summary: null,
      actionableFacts: result.actionableFacts,
    });

    // Create a new LawSource with the re-ingested data
    const newLawSource = await prisma.lawSource.create({
      data: {
        title: lawSource.title,
        sourceUrl: url,
        sourceAuthority: lawSource.sourceAuthority,
        jurisdictionId: lawSource.jurisdictionId,
        lawCategoryId: lawSource.lawCategoryId,
        summary,
        structuredText,
        status: "active",
        verificationStatus: "auto_generated",
        verificationNotes: `Re-ingested from new URL. Previous source: ${lawSource.sourceUrl || "none"}`,
      },
      include: { jurisdiction: true, lawCategory: true },
    });

    // Suspend the old LawSource
    await prisma.lawSource.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: "suspended",
        verificationNotes: `Superseded by re-ingestion. New LawSource: ${newLawSource.id}`,
      },
    });

    res.status(201).json(newLawSource);
  } catch (e: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || "Internal server error during re-ingestion" });
    }
  }
});

// ── Crawler Candidates ───────────────────────────────────────────────

// GET /api/candidates/health-summary
app.get("/api/candidates/health-summary", async (_req, res) => {
  const candidates = await prisma.crawlerCandidate.findMany({
    select: {
      urlHealthStatus: true,
      httpStatus: true,
      failureReason: true,
      contentType: true,
      contentAssessmentStatus: true,
    },
  });

  const byHealthStatus: Record<string, number> = {};
  const byHttpStatus: Record<string, number> = {};
  const byFailureReason: Record<string, number> = {};
  const byContentType: Record<string, number> = {};
  const byContentAssessment: Record<string, number> = {};

  for (const c of candidates) {
    byHealthStatus[c.urlHealthStatus] = (byHealthStatus[c.urlHealthStatus] || 0) + 1;
    if (c.httpStatus) byHttpStatus[String(c.httpStatus)] = (byHttpStatus[String(c.httpStatus)] || 0) + 1;
    if (c.failureReason) byFailureReason[c.failureReason] = (byFailureReason[c.failureReason] || 0) + 1;
    if (c.contentType) byContentType[c.contentType] = (byContentType[c.contentType] || 0) + 1;
    byContentAssessment[c.contentAssessmentStatus] = (byContentAssessment[c.contentAssessmentStatus] || 0) + 1;
  }

  res.json({ total: candidates.length, byHealthStatus, byHttpStatus, byFailureReason, byContentType, byContentAssessment });
});

// GET /api/candidates
app.get("/api/candidates", async (_req, res) => {
  const candidates = await prisma.crawlerCandidate.findMany({
    include: {
      guessedJurisdiction: { select: { id: true, name: true, type: true, state: true } },
      guessedLawCategory: { select: { id: true, name: true, level: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(candidates);
});

// POST /api/candidates
app.post("/api/candidates", async (req, res) => {
  const { sourceUrl, title, sourceAuthority, guessedJurisdictionId, guessedLawCategoryId, summary, rawText, rawPayload, confidence, notes } = req.body;

  if (!sourceUrl) {
    res.status(400).json({ error: "sourceUrl is required" });
    return;
  }

  try {
    const candidate = await prisma.crawlerCandidate.create({
      data: {
        sourceUrl,
        title: title ?? null,
        sourceAuthority: sourceAuthority ?? null,
        guessedJurisdictionId: guessedJurisdictionId ?? null,
        guessedLawCategoryId: guessedLawCategoryId ?? null,
        summary: summary ?? null,
        rawText: rawText ?? null,
        rawPayload: rawPayload ?? undefined,
        confidence: confidence ?? null,
        notes: notes ?? null,
      },
      include: {
        guessedJurisdiction: { select: { id: true, name: true, type: true, state: true } },
        guessedLawCategory: { select: { id: true, name: true, level: true } },
      },
    });
    res.status(201).json(candidate);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/candidates/:id
app.patch("/api/candidates/:id", async (req, res) => {
  const allowed = ["title", "sourceUrl", "sourceAuthority", "guessedJurisdictionId", "guessedLawCategoryId", "summary", "confidence", "notes", "status"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) data[key] = req.body[key];
  }

  if (data.status && !["new", "promoted", "rejected"].includes(data.status as string)) {
    res.status(400).json({ error: "status must be new, promoted, or rejected" });
    return;
  }

  try {
    const updated = await prisma.crawlerCandidate.update({
      where: { id: req.params.id },
      data,
      include: {
        guessedJurisdiction: { select: { id: true, name: true, type: true, state: true } },
        guessedLawCategory: { select: { id: true, name: true, level: true } },
      },
    });
    res.json(updated);
  } catch (e: any) {
    if (e.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
    res.status(500).json({ error: e.message });
  }
});

// POST /api/candidates/:id/promote
app.post("/api/candidates/:id/promote", async (req, res) => {
  try {
    const candidate = await prisma.crawlerCandidate.findUnique({ where: { id: req.params.id } });
    if (!candidate) { res.status(404).json({ error: "Not found" }); return; }

    if (!candidate.title || !candidate.sourceUrl || !candidate.guessedJurisdictionId || !candidate.guessedLawCategoryId) {
      res.status(400).json({ error: "Cannot promote: title, sourceUrl, guessedJurisdictionId, and guessedLawCategoryId are all required" });
      return;
    }

    if (candidate.urlHealthStatus !== "ok" && candidate.urlHealthStatus !== "redirected") {
      res.status(400).json({ error: "Cannot promote: URL health must be ok or redirected" });
      return;
    }

    if (candidate.contentAssessmentStatus !== "actionable") {
      res.status(400).json({ error: "Cannot promote: content assessment must be actionable" });
      return;
    }

    if (!candidate.actionableFacts || Object.keys(candidate.actionableFacts as object).length === 0) {
      res.status(400).json({ error: "Cannot promote: no generated rule JSON (actionableFacts is empty)" });
      return;
    }

    const factsObj = candidate.actionableFacts as Record<string, unknown>;
    // New format requires structuredRule; legacy format requires selectedRate
    if (!factsObj.structuredRule && !factsObj.selectedRate) {
      res.status(400).json({ error: "Cannot promote: no structuredRule found in actionableFacts. Reassess this candidate." });
      return;
    }

    const { summary, structuredText } = buildLawSourceFromCandidate(candidate);

    const lawSource = await prisma.lawSource.create({
      data: {
        title: candidate.title,
        sourceUrl: candidate.sourceUrl,
        sourceAuthority: candidate.sourceAuthority ?? null,
        jurisdictionId: candidate.guessedJurisdictionId,
        lawCategoryId: candidate.guessedLawCategoryId,
        summary,
        structuredText,
        status: "active",
        verificationStatus: "auto_generated",
        verificationNotes: "",
        sourceCandidateId: candidate.id,
      },
      include: { jurisdiction: true, lawCategory: true },
    });

    await prisma.crawlerCandidate.update({
      where: { id: req.params.id },
      data: { status: "promoted" },
    });

    res.status(201).json(lawSource);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/candidates/:id/reject
app.post("/api/candidates/:id/reject", async (req, res) => {
  try {
    const updated = await prisma.crawlerCandidate.update({
      where: { id: req.params.id },
      data: { status: "rejected" },
      include: {
        guessedJurisdiction: { select: { id: true, name: true, type: true, state: true } },
        guessedLawCategory: { select: { id: true, name: true, level: true } },
      },
    });
    res.json(updated);
  } catch (e: any) {
    if (e.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
    res.status(500).json({ error: e.message });
  }
});

// POST /api/candidates/:id/auto-check
app.post("/api/candidates/:id/auto-check", async (req, res) => {
  const { scrapeDol } = await import("./auto-check/scrape-dol.js");
  const { scrapeBerkeley, normalizeLocality } = await import("./auto-check/scrape-berkeley.js");

  try {
    const candidate = await prisma.crawlerCandidate.findUnique({
      where: { id: req.params.id },
      include: { guessedJurisdiction: true, guessedLawCategory: true },
    });
    if (!candidate) { res.status(404).json({ error: "Not found" }); return; }

    const facts = candidate.actionableFacts as Record<string, unknown> | null;
    if (!facts?.structuredRule) {
      res.status(400).json({ error: "No structuredRule on this candidate" }); return;
    }
    const rule = facts.structuredRule as Record<string, unknown>;
    if (rule.ruleType !== "minimum_wage") {
      res.status(400).json({ error: "Auto-check only supports minimum_wage candidates" }); return;
    }

    const jurisdiction = candidate.guessedJurisdiction;
    if (!jurisdiction) {
      res.status(400).json({ error: "No jurisdiction linked" }); return;
    }

    const candidateRate = parseRateStr(rule.defaultRate as string);
    if (!candidateRate) {
      const updated = await prisma.crawlerCandidate.update({
        where: { id: candidate.id },
        data: { autoApprovalStatus: "insufficient_data", autoApprovalCheckedAt: new Date(), autoApprovalNotes: "No parseable defaultRate" },
      });
      res.json(updated); return;
    }

    let dolRate: string | null = null;
    let berkeleyRate: string | null = null;
    let status: string;
    let notes: string;

    if (jurisdiction.type === "state") {
      const dolMap = await scrapeDol();
      const stateCode = jurisdiction.state || "";
      const dolEntry = dolMap.get(stateCode);
      dolRate = dolEntry ? parseRateStr(dolEntry.wage) : null;

      if (!dolRate) { status = "insufficient_data"; notes = "DOL has no rate for this state"; }
      else if (dolRate === candidateRate) { status = "approved"; notes = "DOL rate matches candidate"; }
      else { status = "mismatch"; notes = `DOL: $${dolRate}, Candidate: $${candidateRate}`; }
    } else {
      const berkeleyMap = await scrapeBerkeley();
      const localKey = normalizeLocality(jurisdiction.name);
      const berkeleyEntry = berkeleyMap.get(localKey);
      berkeleyRate = berkeleyEntry ? parseRateStr(berkeleyEntry.rate) : null;

      if (!berkeleyRate) { status = "insufficient_data"; notes = `Berkeley has no entry for "${jurisdiction.name}"`; }
      else if (berkeleyRate === candidateRate) { status = "approved"; notes = "Berkeley rate matches candidate"; }
      else { status = "mismatch"; notes = `Berkeley: $${berkeleyRate}, Candidate: $${candidateRate}`; }
    }

    const updated = await prisma.crawlerCandidate.update({
      where: { id: candidate.id },
      data: {
        autoApprovalStatus: status,
        autoApprovalSources: { dolRate, berkeleyRate },
        autoApprovalCheckedAt: new Date(),
        autoApprovalNotes: notes,
      },
      include: {
        guessedJurisdiction: { select: { id: true, name: true, type: true, state: true } },
        guessedLawCategory: { select: { id: true, name: true, level: true } },
      },
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

function parseRateStr(s: string | undefined | null): string | null {
  if (!s) return null;
  const cleaned = s.replace(/^\$/, "").trim();
  if (!cleaned || isNaN(parseFloat(cleaned))) return null;
  return parseFloat(cleaned).toFixed(2);
}

// POST /api/candidates/:id/assess-content
app.post("/api/candidates/:id/assess-content", async (req, res) => {
  const { assessContent } = await import("./crawler/content-assessor.js");

  try {
    const candidate = await prisma.crawlerCandidate.findUnique({
      where: { id: req.params.id },
      include: { guessedLawCategory: true, guessedJurisdiction: true },
    });
    if (!candidate) { res.status(404).json({ error: "Not found" }); return; }

    // Determine topic from category name
    const catName = candidate.guessedLawCategory?.name?.toLowerCase() || "";
    let topic: string | undefined;
    if (catName.includes("minimum wage")) topic = "minimum_wage";
    else if (catName.includes("overtime")) topic = "overtime";
    else if (catName.includes("sick leave")) topic = "paid_sick_leave";
    else if (catName.includes("scheduling") || catName.includes("predictive") || catName.includes("advance") || catName.includes("workweek")) topic = "predictive_scheduling";
    else if (catName.includes("meal") || catName.includes("break")) topic = "meal_break";

    const urlToCheck = candidate.finalUrl || candidate.sourceUrl;
    const result = await assessContent(urlToCheck, topic, candidate.title, candidate.guessedJurisdiction?.name);

    const updated = await prisma.crawlerCandidate.update({
      where: { id: req.params.id },
      data: {
        contentAssessmentStatus: result.status,
        contentAssessmentSummary: result.summary,
        actionableFacts: (result.actionableFacts as any) || undefined,
        assessedAt: result.assessedAt,
      },
      include: {
        guessedJurisdiction: { select: { id: true, name: true, type: true, state: true } },
        guessedLawCategory: { select: { id: true, name: true, level: true } },
      },
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/candidates/:id/check-url
app.post("/api/candidates/:id/check-url", async (req, res) => {
  const { checkUrl } = await import("./crawler/url-checker.js");

  try {
    const candidate = await prisma.crawlerCandidate.findUnique({ where: { id: req.params.id } });
    if (!candidate) { res.status(404).json({ error: "Not found" }); return; }

    const result = await checkUrl(candidate.sourceUrl);

    const updated = await prisma.crawlerCandidate.update({
      where: { id: req.params.id },
      data: {
        originalUrl: result.finalUrl ? candidate.sourceUrl : null,
        finalUrl: result.finalUrl,
        httpStatus: result.httpStatus,
        urlHealthStatus: result.urlHealthStatus,
        checkedAt: result.checkedAt,
        lastError: result.lastError,
        failureReason: result.failureReason,
        checkedMethod: result.checkedMethod,
        contentType: result.contentType,
        contentLength: result.contentLength,
        retryCount: { increment: 1 },
      },
      include: {
        guessedJurisdiction: { select: { id: true, name: true, type: true, state: true } },
        guessedLawCategory: { select: { id: true, name: true, level: true } },
      },
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Matrix Cell Status ──────────────────────────────────────────────

// PATCH /api/matrix/cell-status
app.patch("/api/matrix/cell-status", async (req, res) => {
  const { jurisdictionId, lawCategoryId, status, notes } = req.body;

  if (!jurisdictionId || !lawCategoryId) {
    res.status(400).json({ error: "jurisdictionId and lawCategoryId are required" });
    return;
  }
  if (status !== "no_law_found") {
    res.status(400).json({ error: "status must be 'no_law_found'" });
    return;
  }

  try {
    const result = await prisma.matrixCellStatus.upsert({
      where: { jurisdictionId_lawCategoryId: { jurisdictionId, lawCategoryId } },
      update: { status, notes: notes ?? null },
      create: { jurisdictionId, lawCategoryId, status, notes: notes ?? null },
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/matrix/cell-status
app.delete("/api/matrix/cell-status", async (req, res) => {
  const { jurisdictionId, lawCategoryId } = req.body;

  if (!jurisdictionId || !lawCategoryId) {
    res.status(400).json({ error: "jurisdictionId and lawCategoryId are required" });
    return;
  }

  try {
    await prisma.matrixCellStatus.deleteMany({
      where: { jurisdictionId, lawCategoryId },
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Helper: determine if a candidate is "reviewable" (has structured rule) ──
function isReviewableCandidate(candidate: {
  urlHealthStatus: string;
  contentAssessmentStatus: string;
  actionableFacts: unknown;
}): boolean {
  // Must have healthy URL
  if (candidate.urlHealthStatus !== "ok" && candidate.urlHealthStatus !== "redirected") return false;
  // Must be actionable
  if (candidate.contentAssessmentStatus !== "actionable") return false;
  // Must have structuredRule in actionableFacts
  if (!candidate.actionableFacts || typeof candidate.actionableFacts !== "object") return false;
  const facts = candidate.actionableFacts as Record<string, unknown>;
  if (!facts.structuredRule) return false;
  if (typeof facts.structuredRule === "object" && Object.keys(facts.structuredRule as object).length === 0) return false;
  return true;
}

// GET /api/matrix
app.get("/api/matrix", async (_req, res) => {
  const { rankCandidates } = await import("./utils/rankCandidates.js");

  const [categories, jurisdictions, lawSources, cellStatuses, candidates] = await Promise.all([
    prisma.lawCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.jurisdiction.findMany({
      where: { type: { notIn: ["federal_agency", "state_agency", "tribal_agency"] } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.lawSource.findMany({
      select: {
        id: true,
        title: true,
        jurisdictionId: true,
        lawCategoryId: true,
        status: true,
        verificationStatus: true,
      },
    }),
    prisma.matrixCellStatus.findMany({
      select: {
        jurisdictionId: true,
        lawCategoryId: true,
        status: true,
        notes: true,
      },
    }),
    prisma.crawlerCandidate.findMany({
      where: { status: "new", guessedJurisdictionId: { not: null }, guessedLawCategoryId: { not: null } },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        sourceAuthority: true,
        confidence: true,
        contentAssessmentStatus: true,
        urlHealthStatus: true,
        contentType: true,
        status: true,
        actionableFacts: true,
        guessedJurisdictionId: true,
        guessedLawCategoryId: true,
        autoApprovalStatus: true,
      },
    }),
  ]);

  // Build cells: keyed by "lawCategoryId::jurisdictionId"
  // Only non-suspended LawSources appear in the matrix.
  const cells: Record<string, { count: number; lawSourceIds: string[]; titles: string[]; verificationStatus: string }> = {};
  for (const ls of lawSources) {
    if (ls.verificationStatus === "suspended") continue; // hide suspended from matrix
    const key = `${ls.lawCategoryId}::${ls.jurisdictionId}`;
    if (!cells[key]) {
      cells[key] = { count: 0, lawSourceIds: [], titles: [], verificationStatus: ls.verificationStatus };
    }
    cells[key].count++;
    cells[key].lawSourceIds.push(ls.id);
    cells[key].titles.push(ls.title);
    // Show "verified" (green) if any is verified, otherwise "auto_generated" (blue)
    if (ls.verificationStatus === "verified") {
      cells[key].verificationStatus = "verified";
    }
  }

  // Build candidate cells: only for cells that DON'T already have a LawSource
  // AND only count reviewable candidates (those with structuredRule)
  const candidateCells: Record<string, { count: number; primaryTitle: string | null; primaryId: string; autoApprovalStatus: string }> = {};
  // Group candidates by cell key — only reviewable ones
  const candidatesByCell: Record<string, typeof candidates> = {};
  for (const c of candidates) {
    const key = `${c.guessedLawCategoryId}::${c.guessedJurisdictionId}`;
    if (cells[key]) continue; // LawSource exists, skip
    if (!isReviewableCandidate(c)) continue; // Not reviewable, skip
    if (!candidatesByCell[key]) candidatesByCell[key] = [];
    candidatesByCell[key].push(c);
  }
  for (const [key, group] of Object.entries(candidatesByCell)) {
    const ranked = rankCandidates(group);
    if (ranked.length > 0) {
      candidateCells[key] = {
        count: ranked.length,
        primaryTitle: ranked[0].title,
        primaryId: ranked[0].id,
        autoApprovalStatus: ranked[0].autoApprovalStatus || "unchecked",
      };
    }
  }

  // Build investigated cells (no_law_found)
  const investigatedCells: Record<string, { status: string; notes: string | null }> = {};
  for (const cs of cellStatuses) {
    const key = `${cs.lawCategoryId}::${cs.jurisdictionId}`;
    investigatedCells[key] = { status: cs.status, notes: cs.notes };
  }

  res.json({ categories, jurisdictions, cells, candidateCells, investigatedCells });
});

// GET /api/matrix-cell/:jurisdictionId/:lawCategoryId
app.get("/api/matrix-cell/:jurisdictionId/:lawCategoryId", async (req, res) => {
  const { rankCandidates } = await import("./utils/rankCandidates.js");
  const { jurisdictionId, lawCategoryId } = req.params;

  const [jurisdiction, lawCategory, lawSources, candidates, cellStatus] = await Promise.all([
    prisma.jurisdiction.findUnique({ where: { id: jurisdictionId } }),
    prisma.lawCategory.findUnique({ where: { id: lawCategoryId } }),
    prisma.lawSource.findMany({
      where: { jurisdictionId, lawCategoryId },
      include: { applicabilityVariables: { include: { applicabilityVariable: true } } },
    }),
    prisma.crawlerCandidate.findMany({
      where: { guessedJurisdictionId: jurisdictionId, guessedLawCategoryId: lawCategoryId, status: "new" },
    }),
    prisma.matrixCellStatus.findFirst({ where: { jurisdictionId, lawCategoryId } }),
  ]);

  if (!jurisdiction || !lawCategory) {
    res.status(404).json({ error: "Jurisdiction or category not found" });
    return;
  }

  // Separate reviewable candidates (with structuredRule) from non-actionable
  const reviewable = candidates.filter(c => isReviewableCandidate(c));
  const nonActionable = candidates.filter(c => !isReviewableCandidate(c));

  const ranked = rankCandidates(reviewable);
  const primaryCandidate = ranked[0] || null;
  const secondaryCandidates = ranked.slice(1);

  // Rank non-actionable for diagnostics display
  const rankedNonActionable = rankCandidates(nonActionable);

  res.json({
    jurisdiction,
    lawCategory,
    lawSources,
    primaryCandidate,
    secondaryCandidates,
    nonActionableCandidates: rankedNonActionable,
    cellStatus: cellStatus ? { status: cellStatus.status, notes: cellStatus.notes } : null,
  });
});

// ══════════════════════════════════════════════════════════════════════
// TypeScript Rule System API (Phase 2)
// These endpoints serve rules from the deterministic TypeScript registry.
// They do NOT replace the old JSON endpoints above.
// ══════════════════════════════════════════════════════════════════════

import { RULES, evaluateRules, getAllFacts } from "./rules/index.js";
import type { Scenario } from "./rules/types.js";

// GET /api/ts-rules
// Returns all registered TypeScript rules (metadata only, no evaluation).
app.get("/api/ts-rules", (_req, res) => {
  const rules = RULES.map(r => ({
    id: r.id,
    title: r.title,
    jurisdiction: r.jurisdiction,
    topic: r.topic,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo || null,
    status: r.status,
    citations: r.citations,
    resultType: r.result.type,
  }));
  res.json({ count: rules.length, rules });
});

// GET /api/ts-rules/:id
// Returns a single rule by ID with full detail.
app.get("/api/ts-rules/:id", (req, res) => {
  const rule = RULES.find(r => r.id === req.params.id);
  if (!rule) {
    res.status(404).json({ error: `Rule "${req.params.id}" not found` });
    return;
  }
  res.json(rule);
});

// GET /api/ts-rules/facts
// Returns the full fact registry (for building scenario forms).
app.get("/api/ts-facts", (_req, res) => {
  const facts = getAllFacts().map(f => ({
    path: f.path,
    type: f.type,
    description: f.description,
    enumValues: f.enumValues || null,
    deprecated: f.deprecated || false,
    replacedBy: f.replacedBy || null,
  }));
  res.json({ count: facts.length, facts });
});

// POST /api/ts-rules/evaluate
// Evaluates all active TypeScript rules against a scenario.
// Body: { scenario: { "fact.path": value, ... } }
app.post("/api/ts-rules/evaluate", (req, res) => {
  const { scenario } = req.body;

  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
    res.status(400).json({ error: "Request body must contain a 'scenario' object with fact key-value pairs." });
    return;
  }

  // Validate that all keys look like fact paths (basic sanity check)
  for (const key of Object.keys(scenario)) {
    if (!key.includes(".")) {
      res.status(400).json({ error: `Invalid fact path: "${key}". Fact paths use dot notation (e.g. "employee.exempt_status").` });
      return;
    }
  }

  const result = evaluateRules(RULES, scenario as Scenario);

  res.json({
    scenario,
    summary: {
      violations: result.violations.length,
      warnings: result.warnings.length,
      passed: result.passed.length,
    },
    violations: result.violations,
    warnings: result.warnings,
    passed: result.passed,
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`  TypeScript rules: ${RULES.length} loaded`);
});

// ── Graceful shutdown ───────────────────────────────────────────────
function shutdown() {
  server.closeAllConnections();
  server.close();
  prisma.$disconnect().finally(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
