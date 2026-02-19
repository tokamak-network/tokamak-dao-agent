/**
 * Multi-agent deliberation protocol using criterion-based QOC framework.
 *
 * Two phases:
 *   Phase 1 — 7 criterion agents evaluate independently (same as standard QOC)
 *   Phase 2 — Meta-agent synthesizes all 7 results, detects contradictions,
 *             evaluates evidence quality, and proposes score adjustments (±10)
 *
 * After Phase 2, the final aggregation uses adjusted scores.
 */

import { detectProvider, getOrCreateProvider } from "./providers/index.ts";
import type { ForumAgenda } from "../db/agendas.ts";
import type {
  QocCriterionEvaluation,
  QocAggregatedResult,
  CriterionId,
} from "./qoc-types.ts";
import { CRITERION_IDS } from "./qoc-types.ts";
import { CRITERION_AGENTS } from "./qoc-weights.ts";
import { aggregateCriterionBased } from "./qoc-aggregation.ts";
import {
  saveQocResult,
  clearQocResultForAgenda,
  clearCriterionEvaluationsForAgenda,
  createCriterionEvaluation,
} from "../db/qoc.ts";
import { getDb } from "../db/index.ts";
import { QOC_MODEL, QOC_MAX_TOKENS } from "../config.ts";
import { runQocEvaluation } from "./qoc-agents.ts";

// ── Types ────────────────────────────────────────────────────────────

export interface DeliberationPhase {
  id: number;
  agendaId: number;
  phase: number;
  criterionId: string | null;
  agentName: string;
  score: number | null;
  evidence: string | null;
  reasoning: string;
  createdAt: string;
}

interface MetaAdjustment {
  criterionId: CriterionId;
  originalScore: number;
  adjustedScore: number;
  adjustmentReason: string;
}

interface MetaAnalysisResponse {
  contradictions: string[];
  evidenceQuality: Record<string, string>;
  adjustments: MetaAdjustment[];
  synthesis: string;
}

// ── DB helpers ───────────────────────────────────────────────────────

function savePhase(input: {
  agendaId: number;
  phase: number;
  criterionId?: string;
  agentName: string;
  score?: number;
  evidence?: string;
  reasoning: string;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO deliberation_rounds
     (agenda_id, phase, criterion_id, agent_name, score, evidence, reasoning)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.agendaId,
    input.phase,
    input.criterionId ?? null,
    input.agentName,
    input.score ?? null,
    input.evidence ?? null,
    input.reasoning,
  );
}

function rowToPhase(row: any): DeliberationPhase {
  return {
    id: row.id,
    agendaId: row.agenda_id,
    phase: row.phase,
    criterionId: row.criterion_id,
    agentName: row.agent_name,
    score: row.score,
    evidence: row.evidence,
    reasoning: row.reasoning,
    createdAt: row.created_at,
  };
}

export function getDeliberationRounds(agendaId: number): DeliberationPhase[] {
  const db = getDb();
  const rows = db
    .query(
      `SELECT * FROM deliberation_rounds WHERE agenda_id = ? ORDER BY phase ASC, agent_name ASC`,
    )
    .all(agendaId);
  return rows.map(rowToPhase);
}

function clearDeliberationRounds(agendaId: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM deliberation_rounds WHERE agenda_id = ?`).run(agendaId);
}

// ── LLM interaction ─────────────────────────────────────────────────

async function callLlm(systemPrompt: string, userPrompt: string): Promise<string> {
  const modelConfig = detectProvider(QOC_MODEL);
  const provider = await getOrCreateProvider(modelConfig.provider);

  let fullText = "";
  const events = provider.createStream({
    model: modelConfig.model,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    tools: [],
    maxTokens: QOC_MAX_TOKENS,
  });

  for await (const event of events) {
    if (event.type === "text_delta") {
      fullText += event.text;
    }
  }
  return fullText.trim();
}

// ── Meta-agent ──────────────────────────────────────────────────────

function buildMetaSystemPrompt(): string {
  return `You are a **Meta-Analysis Agent** for Tokamak Network DAO governance. Your role is to synthesize evaluations from 7 criterion-specialist agents and identify issues.

## Your Tasks
1. **Detect contradictions**: If techSafety is 90 but opsContinuity is 30, the evidence should explain why. Flag unexplained gaps.
2. **Evaluate evidence quality**: Is each agent's evidence grounded in specific on-chain data (addresses, storage slots, function calls)? Or is it generic/speculative?
3. **Propose score adjustments**: Based on contradictions and evidence quality, propose adjustments within ±10 points per criterion. Only adjust if there's a clear reason.
4. **Synthesize**: Provide an overall assessment of the evaluation quality and key findings.

## Response Format
Respond with ONLY valid JSON:
{
  "contradictions": ["description of contradiction 1", ...],
  "evidenceQuality": { "techSafety": "strong/moderate/weak — reason", ... },
  "adjustments": [
    { "criterionId": "techSafety", "originalScore": 85, "adjustedScore": 80, "adjustmentReason": "..." },
    ...
  ],
  "synthesis": "2-4 sentence overall assessment"
}

Only include adjustments for criteria that need changes. If no adjustments needed, use an empty array.
Write all text in English. Do not include text outside the JSON.`;
}

function buildMetaUserPrompt(
  agenda: ForumAgenda,
  evaluations: QocCriterionEvaluation[],
): string {
  const evalBlock = evaluations
    .map(
      (e) =>
        `### ${e.criterionId} (score: ${e.score})
Evidence: ${e.evidence}
Reasoning: ${e.reasoning}`,
    )
    .join("\n\n");

  return `# Agenda #${agenda.id}: ${agenda.title}

${agenda.content}

---

## Criterion Agent Evaluations

${evalBlock}`;
}

function parseMetaResponse(text: string): MetaAnalysisResponse | null {
  try {
    return validateMetaResponse(JSON.parse(text));
  } catch {}

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return validateMetaResponse(JSON.parse(match[0]));
    } catch {}
  }
  return null;
}

function validateMetaResponse(obj: any): MetaAnalysisResponse | null {
  if (!obj || typeof obj !== "object") return null;
  if (!Array.isArray(obj.contradictions)) return null;
  if (!obj.evidenceQuality || typeof obj.evidenceQuality !== "object") return null;
  if (!Array.isArray(obj.adjustments)) return null;
  if (typeof obj.synthesis !== "string") return null;

  // Validate adjustments are within ±10
  for (const adj of obj.adjustments) {
    if (!adj.criterionId || typeof adj.adjustedScore !== "number") return null;
    if (typeof adj.originalScore !== "number") return null;
    const delta = Math.abs(adj.adjustedScore - adj.originalScore);
    if (delta > 10) {
      // Clamp to ±10
      adj.adjustedScore =
        adj.adjustedScore > adj.originalScore
          ? adj.originalScore + 10
          : adj.originalScore - 10;
    }
  }

  return obj as MetaAnalysisResponse;
}

// ── Main deliberation flow ──────────────────────────────────────────

/**
 * Run 2-phase deliberation for an agenda.
 *
 * Phase 1: 7 criterion agents evaluate independently
 * Phase 2: Meta-agent synthesizes, detects contradictions, adjusts scores (±10)
 */
export async function runDeliberation(
  agenda: ForumAgenda,
): Promise<{ phases: DeliberationPhase[]; result: QocAggregatedResult }> {
  console.log(
    `[deliberation] starting 2-phase deliberation for agenda #${agenda.id}: "${agenda.title}"`,
  );

  clearDeliberationRounds(agenda.id);
  clearCriterionEvaluationsForAgenda(agenda.id);
  clearQocResultForAgenda(agenda.id);

  // ── Phase 1: Independent criterion evaluation ──────────────────────
  console.log(`[deliberation] Phase 1: Independent criterion evaluation`);

  const phase1Result = await runQocEvaluation(agenda);

  // Get the saved evaluations to pass to meta-agent
  const { getCriterionEvaluationsForAgenda } = await import("../db/qoc.ts");
  const phase1Evals = getCriterionEvaluationsForAgenda(agenda.id);

  // Save Phase 1 records
  for (const evaluation of phase1Evals) {
    savePhase({
      agendaId: agenda.id,
      phase: 1,
      criterionId: evaluation.criterionId,
      agentName: CRITERION_AGENTS.find((a) => a.criterionId === evaluation.criterionId)?.agentName ?? evaluation.criterionId,
      score: evaluation.score,
      evidence: evaluation.evidence,
      reasoning: evaluation.reasoning,
    });
  }

  console.log(`[deliberation] Phase 1: ${phase1Evals.length}/${CRITERION_IDS.length} criterion evaluations completed`);

  if (phase1Evals.length < 3) {
    throw new Error("Deliberation requires at least 3 criterion evaluations to proceed");
  }

  // ── Phase 2: Meta-agent synthesis ─────────────────────────────────
  console.log(`[deliberation] Phase 2: Meta-agent synthesis`);

  const metaText = await callLlm(
    buildMetaSystemPrompt(),
    buildMetaUserPrompt(agenda, phase1Evals),
  );

  const metaAnalysis = parseMetaResponse(metaText);

  if (!metaAnalysis) {
    console.error("[deliberation] Failed to parse meta-agent response:", metaText.slice(0, 500));
    // Use Phase 1 results as-is
    savePhase({
      agendaId: agenda.id,
      phase: 2,
      agentName: "Meta Analyst",
      reasoning: "Meta-analysis failed to parse. Using Phase 1 results as-is.",
    });

    const allPhases = getDeliberationRounds(agenda.id);
    return { phases: allPhases, result: phase1Result };
  }

  // Apply adjustments
  const adjustedEvals: QocCriterionEvaluation[] = phase1Evals.map((evaluation) => {
    const adjustment = metaAnalysis.adjustments.find(
      (a) => a.criterionId === evaluation.criterionId,
    );
    if (adjustment) {
      const adjustedScore = Math.round(Math.min(100, Math.max(0, adjustment.adjustedScore)));
      return { ...evaluation, score: adjustedScore };
    }
    return evaluation;
  });

  // Save meta-agent phase
  savePhase({
    agendaId: agenda.id,
    phase: 2,
    agentName: "Meta Analyst",
    reasoning: metaAnalysis.synthesis,
  });

  // Save adjusted evaluations to DB (overwrite Phase 1)
  clearCriterionEvaluationsForAgenda(agenda.id);
  for (const evaluation of adjustedEvals) {
    createCriterionEvaluation(evaluation);
  }

  // Re-aggregate with adjusted scores
  clearQocResultForAgenda(agenda.id);
  const adjustedResult = aggregateCriterionBased(adjustedEvals);
  adjustedResult.agendaId = agenda.id;
  const finalResult = saveQocResult(adjustedResult);

  console.log(
    `[deliberation] agenda #${agenda.id}: verdict=${finalResult.verdict}, score=${finalResult.finalScore}, hardVeto=${finalResult.hardVeto}`,
  );
  console.log(
    `[deliberation] meta-agent found ${metaAnalysis.contradictions.length} contradictions, ${metaAnalysis.adjustments.length} adjustments`,
  );

  const allPhases = getDeliberationRounds(agenda.id);
  return { phases: allPhases, result: finalResult };
}
