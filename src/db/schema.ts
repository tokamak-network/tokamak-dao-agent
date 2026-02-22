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
  on_chain_created_at TEXT,
  on_chain_status TEXT,
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

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stakeholder_type TEXT NOT NULL,
  personality TEXT NOT NULL,
  priorities_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agenda_id INTEGER NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  validator_type TEXT NOT NULL,
  status TEXT NOT NULL,
  score INTEGER,
  feedback TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_validations_agenda_type
  ON validations(agenda_id, validator_type);

CREATE TABLE IF NOT EXISTS qoc_criterion_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agenda_id INTEGER NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  criterion_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  evidence TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(agenda_id, criterion_id)
);

CREATE TABLE IF NOT EXISTS qoc_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agenda_id INTEGER NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  criterion_scores_json TEXT NOT NULL,
  lens_results_json TEXT NOT NULL,
  final_score REAL NOT NULL,
  verdict TEXT NOT NULL,
  hard_veto INTEGER NOT NULL DEFAULT 0,
  avg_tech_safety REAL NOT NULL,
  contributing_criteria INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(agenda_id)
);

CREATE TABLE IF NOT EXISTS deliberation_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agenda_id INTEGER NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL CHECK(phase BETWEEN 1 AND 2),
  criterion_id TEXT,
  agent_name TEXT NOT NULL,
  score INTEGER,
  evidence TEXT,
  reasoning TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(agenda_id, phase, agent_name)
);

CREATE TABLE IF NOT EXISTS agent_credibility (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  agenda_id INTEGER NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  predicted_verdict TEXT NOT NULL,
  predicted_score REAL NOT NULL,
  actual_outcome TEXT,
  score_delta INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  UNIQUE(agent_name, agenda_id)
);

CREATE TABLE IF NOT EXISTS user_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agenda_id INTEGER NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
