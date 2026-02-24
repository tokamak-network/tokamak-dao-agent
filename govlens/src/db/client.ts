/**
 * Database Client
 *
 * PostgreSQL connection with multi-tenant RLS support.
 * Uses the `postgres` package (porsager/postgres).
 */

import postgres from "postgres";

// ─── Connection ──────────────────────────────────────────────

let _sql: ReturnType<typeof postgres> | null = null;

export function getDb(): ReturnType<typeof postgres> {
  if (!_sql) {
    const connectionString =
      process.env.DATABASE_URL ?? "postgresql://localhost:5432/govlens";

    _sql = postgres(connectionString, {
      max: 20,
      idle_timeout: 30,
      connect_timeout: 10,
      transform: {
        undefined: null,
      },
    });
  }
  return _sql;
}

// ─── Tenant-Scoped Query Helper ──────────────────────────────

/**
 * Execute a query in a tenant's RLS context.
 * Sets app.tenant_id for the transaction so RLS policies apply.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (sql: ReturnType<typeof postgres>) => Promise<T>,
): Promise<T> {
  const sql = getDb();
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

// ─── Migration Runner ────────────────────────────────────────

export async function runMigrations(): Promise<void> {
  const sql = getDb();
  const schema = await Bun.file(
    new URL("./schema.sql", import.meta.url).pathname,
  ).text();

  // Execute the entire schema as a single transaction
  try {
    await sql.unsafe(schema);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes("already exists")) {
      throw error;
    }
    // If "already exists" error, run statements individually for idempotency
    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        if (!m.includes("already exists")) {
          console.error(`Migration error: ${m}`);
          console.error(`Statement: ${statement.slice(0, 100)}...`);
        }
      }
    }
  }

  console.log("Migrations complete");
}

// ─── Shutdown ────────────────────────────────────────────────

export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end();
    _sql = null;
  }
}
