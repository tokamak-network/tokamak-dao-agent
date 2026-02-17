/**
 * SQLite database singleton using bun:sqlite.
 * WAL mode for concurrent reads, foreign keys enabled.
 */

import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "./schema.ts";

const DB_PATH = process.env.DB_PATH || "data/forum.db";

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    // Ensure parent directory exists
    const dir = DB_PATH.substring(0, DB_PATH.lastIndexOf("/"));
    if (dir) {
      const fs = require("fs");
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(SCHEMA_SQL);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
