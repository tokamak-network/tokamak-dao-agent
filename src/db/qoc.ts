/**
 * QOC criterion evaluation and result CRUD operations.
 */

import { getDb } from "./index.ts";
import type {
  QocCriterionEvaluation,
  QocAggregatedResult,
  QocVerdict,
  QocLensResult,
  CriterionId,
} from "../web/qoc/types.ts";

// ── QOC Criterion Evaluations ────────────────────────────────────────

function rowToCriterionEvaluation(row: any): QocCriterionEvaluation {
  return {
    agendaId: row.agenda_id,
    criterionId: row.criterion_id as CriterionId,
    score: row.score,
    evidence: row.evidence,
    reasoning: row.reasoning,
    createdAt: row.created_at,
  };
}

export function createCriterionEvaluation(
  input: QocCriterionEvaluation,
): QocCriterionEvaluation {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO qoc_criterion_evaluations
     (agenda_id, criterion_id, score, evidence, reasoning)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    input.agendaId,
    input.criterionId,
    input.score,
    input.evidence,
    input.reasoning,
  );

  const row = db
    .query(
      `SELECT * FROM qoc_criterion_evaluations WHERE agenda_id = ? AND criterion_id = ?`,
    )
    .get(input.agendaId, input.criterionId);
  return rowToCriterionEvaluation(row);
}

export function getCriterionEvaluationsForAgenda(
  agendaId: number,
): QocCriterionEvaluation[] {
  const db = getDb();
  const rows = db
    .query(
      `SELECT * FROM qoc_criterion_evaluations WHERE agenda_id = ? ORDER BY criterion_id ASC`,
    )
    .all(agendaId);
  return rows.map(rowToCriterionEvaluation);
}

export function clearCriterionEvaluationsForAgenda(agendaId: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM qoc_criterion_evaluations WHERE agenda_id = ?`).run(agendaId);
}

// ── QOC Results ──────────────────────────────────────────────────────

function rowToResult(row: any): QocAggregatedResult {
  return {
    agendaId: row.agenda_id,
    criterionScores: JSON.parse(row.criterion_scores_json),
    lensResults: JSON.parse(row.lens_results_json) as QocLensResult[],
    finalScore: row.final_score,
    verdict: row.verdict as QocVerdict,
    hardVeto: Boolean(row.hard_veto),
    avgTechSafety: row.avg_tech_safety,
    contributingCriteria: row.contributing_criteria,
    createdAt: row.created_at,
  };
}

export function saveQocResult(input: QocAggregatedResult): QocAggregatedResult {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO qoc_results
     (agenda_id, criterion_scores_json, lens_results_json, final_score, verdict,
      hard_veto, avg_tech_safety, contributing_criteria)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.agendaId,
    JSON.stringify(input.criterionScores),
    JSON.stringify(input.lensResults),
    input.finalScore,
    input.verdict,
    input.hardVeto ? 1 : 0,
    input.avgTechSafety,
    input.contributingCriteria,
  );

  const row = db
    .query(`SELECT * FROM qoc_results WHERE agenda_id = ?`)
    .get(input.agendaId);
  return rowToResult(row);
}

export function getQocResult(agendaId: number): QocAggregatedResult | null {
  const db = getDb();
  const row = db
    .query(`SELECT * FROM qoc_results WHERE agenda_id = ?`)
    .get(agendaId);
  return row ? rowToResult(row) : null;
}

export function clearQocResultForAgenda(agendaId: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM qoc_results WHERE agenda_id = ?`).run(agendaId);
}
