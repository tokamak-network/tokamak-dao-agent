/**
 * Migration Runner (standalone)
 *
 * Usage: bun run src/db/migrate.ts
 */

import { runMigrations, closeDb } from "./client.js";

async function main() {
  console.log("Running GovLens database migrations...");
  await runMigrations();
  await closeDb();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
