/**
 * Agent CRUD operations for user-created governance agents.
 */

import { getDb } from "./index.ts";

export interface DbAgent {
  id: string;
  name: string;
  stakeholderType: string;
  personality: string;
  prioritiesJson: string;
  createdAt: string;
}

export interface CreateAgentInput {
  id: string;
  name: string;
  stakeholderType: string;
  personality: string;
  priorities: { id: string; label: string; weight: number }[];
}

function rowToAgent(row: any): DbAgent {
  return {
    id: row.id,
    name: row.name,
    stakeholderType: row.stakeholder_type,
    personality: row.personality,
    prioritiesJson: row.priorities_json,
    createdAt: row.created_at,
  };
}

export function createAgent(input: CreateAgentInput): DbAgent {
  const db = getDb();
  db.prepare(
    `INSERT INTO agents (id, name, stakeholder_type, personality, priorities_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.name,
    input.stakeholderType,
    input.personality,
    JSON.stringify(input.priorities),
  );

  const row = db.query(`SELECT * FROM agents WHERE id = ?`).get(input.id);
  return rowToAgent(row);
}

export function getAgent(id: string): DbAgent | null {
  const db = getDb();
  const row = db.query(`SELECT * FROM agents WHERE id = ?`).get(id);
  if (!row) return null;
  return rowToAgent(row);
}

export function listAgents(): DbAgent[] {
  const db = getDb();
  const rows = db
    .query(`SELECT * FROM agents ORDER BY created_at ASC`)
    .all();
  return rows.map(rowToAgent);
}

export function deleteAgent(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM agents WHERE id = ?`).run(id);
  return result.changes > 0;
}
