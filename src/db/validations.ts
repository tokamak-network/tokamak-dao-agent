/**
 * Validation CRUD operations for agenda review workflow.
 */

import { getDb } from "./index.ts";

export interface ForumValidation {
  id: number;
  agendaId: number;
  validatorType: "format" | "relevance" | "feasibility";
  status: "pass" | "fail";
  score: number | null;
  feedback: string;
  createdAt: string;
}

export interface CreateValidationInput {
  agendaId: number;
  validatorType: "format" | "relevance" | "feasibility";
  status: "pass" | "fail";
  score?: number;
  feedback: string;
}

function rowToValidation(row: any): ForumValidation {
  return {
    id: row.id,
    agendaId: row.agenda_id,
    validatorType: row.validator_type,
    status: row.status,
    score: row.score,
    feedback: row.feedback,
    createdAt: row.created_at,
  };
}

export function createValidation(input: CreateValidationInput): ForumValidation {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO validations
     (agenda_id, validator_type, status, score, feedback)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    input.agendaId,
    input.validatorType,
    input.status,
    input.score ?? null,
    input.feedback,
  );

  const row = db
    .query(
      `SELECT * FROM validations WHERE agenda_id = ? AND validator_type = ?`,
    )
    .get(input.agendaId, input.validatorType);
  return rowToValidation(row);
}

export function getValidationsForAgenda(agendaId: number): ForumValidation[] {
  const db = getDb();
  const rows = db
    .query(`SELECT * FROM validations WHERE agenda_id = ? ORDER BY created_at ASC`)
    .all(agendaId);
  return rows.map(rowToValidation);
}

export function clearValidationsForAgenda(agendaId: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM validations WHERE agenda_id = ?`).run(agendaId);
}
