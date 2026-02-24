/**
 * Agent credibility scoring system.
 *
 * Compares QOC predictions vs actual on-chain voting outcomes.
 * Scoring:
 *   high confidence + correct  = +3
 *   low confidence  + correct  = +1
 *   high confidence + wrong    = -2
 *   low confidence  + wrong    = -1
 *
 * "High confidence" = weighted score >= 70 or <= 30 (strong opinion)
 * "Correct" = predicted verdict matches actual outcome
 */

import { getDb } from "../db/index.ts";
import type { QocVerdict } from "./qoc/types.ts";

// ── Types ────────────────────────────────────────────────────────────

export interface AgentCredibilityRecord {
  id: number;
  agentName: string;
  agendaId: number;
  predictedVerdict: string;
  predictedScore: number;
  actualOutcome: string | null;
  scoreDelta: number;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AgentCredibilitySummary {
  agentName: string;
  totalPredictions: number;
  resolvedPredictions: number;
  totalScore: number;
  correctCount: number;
  accuracy: number;
}

// ── DB operations ────────────────────────────────────────────────────

function rowToRecord(row: any): AgentCredibilityRecord {
  return {
    id: row.id,
    agentName: row.agent_name,
    agendaId: row.agenda_id,
    predictedVerdict: row.predicted_verdict,
    predictedScore: row.predicted_score,
    actualOutcome: row.actual_outcome,
    scoreDelta: row.score_delta,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

/**
 * Record a QOC prediction for later comparison with actual outcome.
 */
export function recordPrediction(input: {
  agentName: string;
  agendaId: number;
  predictedVerdict: QocVerdict;
  predictedScore: number;
}): AgentCredibilityRecord {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO agent_credibility
     (agent_name, agenda_id, predicted_verdict, predicted_score)
     VALUES (?, ?, ?, ?)`,
  ).run(input.agentName, input.agendaId, input.predictedVerdict, input.predictedScore);

  const row = db
    .query(
      `SELECT * FROM agent_credibility WHERE agent_name = ? AND agenda_id = ?`,
    )
    .get(input.agentName, input.agendaId);
  return rowToRecord(row);
}

/**
 * Determine if a prediction was "high confidence" (strong opinion).
 */
function isHighConfidence(predictedScore: number): boolean {
  return predictedScore >= 70 || predictedScore <= 30;
}

/**
 * Map actual on-chain outcome to a verdict for comparison.
 * On-chain: EXECUTED = approve succeeded, REJECTED/EXPIRED = rejected
 */
function outcomeToVerdict(outcome: string): "positive" | "negative" {
  const normalized = outcome.toUpperCase();
  if (normalized === "EXECUTED" || normalized === "APPROVE" || normalized === "PASSED") {
    return "positive";
  }
  return "negative";
}

function predictionToDirection(verdict: string): "positive" | "negative" {
  return verdict === "APPROVE" ? "positive" : "negative";
}

/**
 * Resolve a prediction with an actual on-chain outcome.
 * Computes the credibility score delta.
 */
export function resolvePrediction(
  agentName: string,
  agendaId: number,
  actualOutcome: string,
): AgentCredibilityRecord | null {
  const db = getDb();
  const existing = db
    .query(
      `SELECT * FROM agent_credibility WHERE agent_name = ? AND agenda_id = ?`,
    )
    .get(agentName, agendaId) as any;

  if (!existing) return null;

  const highConf = isHighConfidence(existing.predicted_score);
  const predicted = predictionToDirection(existing.predicted_verdict);
  const actual = outcomeToVerdict(actualOutcome);
  const correct = predicted === actual;

  let delta: number;
  if (correct && highConf) delta = 3;
  else if (correct && !highConf) delta = 1;
  else if (!correct && highConf) delta = -2;
  else delta = -1;

  db.prepare(
    `UPDATE agent_credibility
     SET actual_outcome = ?, score_delta = ?, resolved_at = datetime('now')
     WHERE agent_name = ? AND agenda_id = ?`,
  ).run(actualOutcome, delta, agentName, agendaId);

  const row = db
    .query(
      `SELECT * FROM agent_credibility WHERE agent_name = ? AND agenda_id = ?`,
    )
    .get(agentName, agendaId);
  return rowToRecord(row);
}

/**
 * Get all credibility records for an agent.
 */
export function getAgentCredibilityHistory(agentName: string): AgentCredibilityRecord[] {
  const db = getDb();
  const rows = db
    .query(
      `SELECT * FROM agent_credibility WHERE agent_name = ? ORDER BY created_at DESC`,
    )
    .all(agentName);
  return rows.map(rowToRecord);
}

/**
 * Get credibility summary for all agents.
 */
export function getCredibilitySummaries(): AgentCredibilitySummary[] {
  const db = getDb();
  const rows = db
    .query(
      `SELECT
         agent_name,
         COUNT(*) as total_predictions,
         SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved_predictions,
         SUM(CASE WHEN resolved_at IS NOT NULL THEN score_delta ELSE 0 END) as total_score,
         SUM(CASE WHEN resolved_at IS NOT NULL AND score_delta > 0 THEN 1 ELSE 0 END) as correct_count
       FROM agent_credibility
       GROUP BY agent_name
       ORDER BY total_score DESC`,
    )
    .all() as any[];

  return rows.map((r) => ({
    agentName: r.agent_name,
    totalPredictions: r.total_predictions,
    resolvedPredictions: r.resolved_predictions,
    totalScore: r.total_score,
    correctCount: r.correct_count,
    accuracy:
      r.resolved_predictions > 0
        ? Math.round((r.correct_count / r.resolved_predictions) * 100)
        : 0,
  }));
}

/**
 * Get credibility records for a specific agenda.
 */
export function getCredibilityForAgenda(agendaId: number): AgentCredibilityRecord[] {
  const db = getDb();
  const rows = db
    .query(
      `SELECT * FROM agent_credibility WHERE agenda_id = ? ORDER BY agent_name ASC`,
    )
    .all(agendaId);
  return rows.map(rowToRecord);
}
