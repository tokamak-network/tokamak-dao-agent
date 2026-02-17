/**
 * Opinion CRUD and summary caching operations.
 */

import { getDb } from "./index.ts";

export interface ForumOpinion {
  id: number;
  agendaId: number;
  agentName: string;
  stakeholderType: string;
  personality: string;
  verdict: string;
  reasoning: string;
  confidence: number;
  prioritiesJson: string | null;
  createdAt: string;
}

export interface CreateOpinionInput {
  agendaId: number;
  agentName: string;
  stakeholderType: string;
  personality: string;
  verdict: string;
  reasoning: string;
  confidence: number;
  priorities?: string[];
}

export interface CachedSummary {
  id: number;
  agendaId: number;
  opinionCount: number;
  summaryText: string;
  model: string;
  createdAt: string;
}

function rowToOpinion(row: any): ForumOpinion {
  return {
    id: row.id,
    agendaId: row.agenda_id,
    agentName: row.agent_name,
    stakeholderType: row.stakeholder_type,
    personality: row.personality,
    verdict: row.verdict,
    reasoning: row.reasoning,
    confidence: row.confidence,
    prioritiesJson: row.priorities_json,
    createdAt: row.created_at,
  };
}

export function createOpinion(input: CreateOpinionInput): ForumOpinion {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO opinions
     (agenda_id, agent_name, stakeholder_type, personality, verdict, reasoning, confidence, priorities_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.agendaId,
    input.agentName,
    input.stakeholderType,
    input.personality,
    input.verdict,
    input.reasoning,
    input.confidence,
    input.priorities ? JSON.stringify(input.priorities) : null,
  );

  const row = db
    .query(
      `SELECT * FROM opinions WHERE agenda_id = ? AND agent_name = ?`,
    )
    .get(input.agendaId, input.agentName);
  return rowToOpinion(row);
}

export function getOpinionsForAgenda(agendaId: number): ForumOpinion[] {
  const db = getDb();
  const rows = db
    .query(`SELECT * FROM opinions WHERE agenda_id = ? ORDER BY created_at ASC`)
    .all(agendaId);
  return rows.map(rowToOpinion);
}

export function getOpinionCount(agendaId: number): number {
  const db = getDb();
  const row = db
    .query(`SELECT COUNT(*) as count FROM opinions WHERE agenda_id = ?`)
    .get(agendaId) as { count: number };
  return row.count;
}

export function getCachedSummary(
  agendaId: number,
  opinionCount: number,
): CachedSummary | null {
  const db = getDb();
  const row = db
    .query(
      `SELECT * FROM summaries WHERE agenda_id = ? AND opinion_count = ?`,
    )
    .get(agendaId, opinionCount);
  if (!row) return null;
  const r = row as any;
  return {
    id: r.id,
    agendaId: r.agenda_id,
    opinionCount: r.opinion_count,
    summaryText: r.summary_text,
    model: r.model,
    createdAt: r.created_at,
  };
}

export function cacheSummary(
  agendaId: number,
  opinionCount: number,
  summaryText: string,
  model: string,
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO summaries (agenda_id, opinion_count, summary_text, model)
     VALUES (?, ?, ?, ?)`,
  ).run(agendaId, opinionCount, summaryText, model);
}
