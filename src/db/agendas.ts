/**
 * Agenda CRUD operations.
 */

import { getDb } from "./index.ts";

export interface ForumAgenda {
  id: number;
  title: string;
  content: string;
  onChainAgendaId: number | null;
  creator: string;
  deadline: string;
  status: "open" | "closed" | "archived";
  createdAt: string;
  updatedAt: string;
  opinionCount?: number;
}

export interface CreateAgendaInput {
  title: string;
  content: string;
  onChainAgendaId?: number;
  creator?: string;
  deadline: string;
}

export interface ListAgendaOptions {
  status?: string;
  limit?: number;
  offset?: number;
  sort?: "newest" | "deadline" | "most_opinions";
}

function rowToAgenda(row: any): ForumAgenda {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    onChainAgendaId: row.on_chain_agenda_id,
    creator: row.creator,
    deadline: row.deadline,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.opinion_count !== undefined
      ? { opinionCount: row.opinion_count }
      : {}),
  };
}

export function createAgenda(input: CreateAgendaInput): ForumAgenda {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO agendas (title, content, on_chain_agenda_id, creator, deadline)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    input.title,
    input.content,
    input.onChainAgendaId ?? null,
    input.creator ?? "anonymous",
    input.deadline,
  );

  const id = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
  return getAgenda(id.id)!;
}

export function getAgenda(id: number): ForumAgenda | null {
  const db = getDb();
  const row = db
    .query(
      `SELECT a.*, COUNT(o.id) as opinion_count
       FROM agendas a
       LEFT JOIN opinions o ON o.agenda_id = a.id
       WHERE a.id = ?
       GROUP BY a.id`,
    )
    .get(id);
  return row ? rowToAgenda(row) : null;
}

export function listAgendas(opts: ListAgendaOptions = {}): ForumAgenda[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: any[] = [];

  if (opts.status) {
    conditions.push("a.status = ?");
    params.push(opts.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy: string;
  switch (opts.sort) {
    case "deadline":
      orderBy = "a.deadline ASC";
      break;
    case "most_opinions":
      orderBy = "opinion_count DESC, a.created_at DESC";
      break;
    default:
      orderBy = "a.created_at DESC";
  }

  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const rows = db
    .query(
      `SELECT a.*, COUNT(o.id) as opinion_count
       FROM agendas a
       LEFT JOIN opinions o ON o.agenda_id = a.id
       ${where}
       GROUP BY a.id
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset);

  return rows.map(rowToAgenda);
}

export function updateAgendaStatus(
  id: number,
  status: "open" | "closed" | "archived",
): ForumAgenda | null {
  const db = getDb();
  db.prepare(
    `UPDATE agendas SET status = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(status, id);
  return getAgenda(id);
}
