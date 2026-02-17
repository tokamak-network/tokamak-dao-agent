/**
 * SQLite DDL statements for the forum database.
 * All tables use CREATE IF NOT EXISTS for idempotent initialization.
 */

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS agendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  on_chain_agenda_id INTEGER,
  creator TEXT NOT NULL DEFAULT 'anonymous',
  deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opinions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agenda_id INTEGER NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  stakeholder_type TEXT NOT NULL,
  personality TEXT NOT NULL,
  verdict TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  confidence INTEGER CHECK(confidence BETWEEN 1 AND 5),
  priorities_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(agenda_id, agent_name)
);

CREATE TABLE IF NOT EXISTS summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agenda_id INTEGER NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  opinion_count INTEGER NOT NULL,
  summary_text TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(agenda_id, opinion_count)
);

CREATE TABLE IF NOT EXISTS webhook_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  label TEXT,
  secret TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
