/**
 * Agenda CRUD operations.
 */

import { getDb } from "./index.ts";

export interface ForumAgenda {
  id: number;
  title: string;
  content: string;
  onChainAgendaId: number | null;
  onChainCreatedAt: string | null;
  onChainStatus: string | null;
  creator: string;
  deadline: string;
  status: "draft" | "pending_review" | "rejected" | "open" | "closed" | "archived";
  createdAt: string;
  updatedAt: string;
  opinionCount?: number;
}

export interface CreateAgendaInput {
  title: string;
  content: string;
  onChainAgendaId?: number;
  onChainCreatedAt?: string;
  onChainStatus?: string;
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
    onChainCreatedAt: row.on_chain_created_at ?? null,
    onChainStatus: row.on_chain_status ?? null,
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
    INSERT INTO agendas (title, content, on_chain_agenda_id, on_chain_created_at, on_chain_status, creator, deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    input.title,
    input.content,
    input.onChainAgendaId ?? null,
    input.onChainCreatedAt ?? null,
    input.onChainStatus ?? null,
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

/** Look up an agenda by its on-chain agenda ID (from DAOAgendaManager). */
export function getAgendaByOnChainId(onChainId: number): ForumAgenda | null {
  const db = getDb();
  const row = db
    .query(
      `SELECT a.*, COUNT(o.id) as opinion_count
       FROM agendas a
       LEFT JOIN opinions o ON o.agenda_id = a.id
       WHERE a.on_chain_agenda_id = ?
       GROUP BY a.id`,
    )
    .get(onChainId);
  return row ? rowToAgenda(row) : null;
}

/** Resolve an agenda by DB ID first, then fall back to on-chain agenda ID. */
export function resolveAgenda(id: number): ForumAgenda | null {
  return getAgenda(id) ?? getAgendaByOnChainId(id);
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
      orderBy = "COALESCE(a.on_chain_created_at, a.created_at) DESC";
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

/** Return the next available TIP number (max existing TIP-N + 1). */
export function getNextTipNumber(): number {
  const db = getDb();
  const row = db
    .query(
      `SELECT MAX(CAST(SUBSTR(title, 5, INSTR(title, ':') - 5) AS INTEGER)) AS max_tip
       FROM agendas
       WHERE title LIKE 'TIP-%:%'`,
    )
    .get() as { max_tip: number | null } | null;
  return (row?.max_tip ?? 0) + 1;
}

export function updateAgendaStatus(
  id: number,
  status: "draft" | "pending_review" | "rejected" | "open" | "closed" | "archived",
): ForumAgenda | null {
  const db = getDb();
  db.prepare(
    `UPDATE agendas SET status = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(status, id);
  return getAgenda(id);
}

export function updateAgenda(
  id: number,
  fields: { title?: string; content?: string; deadline?: string },
): ForumAgenda | null {
  const db = getDb();
  const sets: string[] = [];
  const params: any[] = [];

  if (fields.title !== undefined) {
    sets.push("title = ?");
    params.push(fields.title);
  }
  if (fields.content !== undefined) {
    sets.push("content = ?");
    params.push(fields.content);
  }
  if (fields.deadline !== undefined) {
    sets.push("deadline = ?");
    params.push(fields.deadline);
  }

  if (sets.length === 0) return getAgenda(id);

  sets.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE agendas SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return getAgenda(id);
}
