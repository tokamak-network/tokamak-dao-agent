/**
 * User comment CRUD operations.
 */

import { getDb } from "./index.ts";

export interface UserComment {
  id: number;
  agendaId: number;
  walletAddress: string;
  content: string;
  createdAt: string;
}

export interface CreateCommentInput {
  agendaId: number;
  walletAddress: string;
  content: string;
}

function rowToComment(row: any): UserComment {
  return {
    id: row.id,
    agendaId: row.agenda_id,
    walletAddress: row.wallet_address,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function createComment(input: CreateCommentInput): UserComment {
  const db = getDb();
  db.prepare(
    `INSERT INTO user_comments (agenda_id, wallet_address, content) VALUES (?, ?, ?)`,
  ).run(input.agendaId, input.walletAddress, input.content);

  const { id } = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
  const row = db.query(`SELECT * FROM user_comments WHERE id = ?`).get(id);
  return rowToComment(row);
}

export function updateComment(id: number, content: string): UserComment | null {
  const db = getDb();
  const result = db
    .prepare(`UPDATE user_comments SET content = ? WHERE id = ?`)
    .run(content, id);
  if (result.changes === 0) return null;
  const row = db.query(`SELECT * FROM user_comments WHERE id = ?`).get(id);
  return rowToComment(row);
}

export function deleteComment(id: number): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM user_comments WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function getComment(id: number): UserComment | null {
  const db = getDb();
  const row = db.query(`SELECT * FROM user_comments WHERE id = ?`).get(id);
  return row ? rowToComment(row) : null;
}

export function getCommentsForAgenda(agendaId: number): UserComment[] {
  const db = getDb();
  const rows = db
    .query(
      `SELECT * FROM user_comments WHERE agenda_id = ? ORDER BY created_at ASC`,
    )
    .all(agendaId);
  return rows.map(rowToComment);
}
