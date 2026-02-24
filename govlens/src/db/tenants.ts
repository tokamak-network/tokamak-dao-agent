/**
 * Tenant Data Access
 */

import type { Address } from "viem";
import type { Tenant, TenantConfig, GovernanceFramework } from "../types/index.js";
import { getDb } from "./client.js";

// ─── API Key Hashing ─────────────────────────────────────────

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── CRUD ────────────────────────────────────────────────────

export async function createTenant(params: {
  slug: string;
  name: string;
  chainId: number;
  governorAddress: Address;
  frameworkType: GovernanceFramework;
  config: TenantConfig;
}): Promise<{ tenant: Tenant; apiKey: string }> {
  const sql = getDb();

  // Generate API key
  const apiKey = `gvl_${crypto.randomUUID().replace(/-/g, "")}`;
  const apiKeyHash = await hashApiKey(apiKey);

  const [row] = await sql`
    INSERT INTO tenants (slug, name, chain_id, governor_address, framework_type, config, api_key_hash)
    VALUES (${params.slug}, ${params.name}, ${params.chainId}, ${params.governorAddress}, ${params.frameworkType}, ${JSON.stringify(params.config)}, ${apiKeyHash})
    RETURNING *
  `;

  return {
    tenant: rowToTenant(row),
    apiKey,
  };
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT * FROM tenants WHERE slug = ${slug}
  `;
  return row ? rowToTenant(row) : null;
}

export async function getTenantByApiKey(
  apiKey: string,
): Promise<Tenant | null> {
  const sql = getDb();
  const hash = await hashApiKey(apiKey);
  const [row] = await sql`
    SELECT * FROM tenants WHERE api_key_hash = ${hash}
  `;
  return row ? rowToTenant(row) : null;
}

export async function updateTenantConfig(
  tenantId: string,
  config: Partial<TenantConfig>,
): Promise<Tenant | null> {
  const sql = getDb();
  const [row] = await sql`
    UPDATE tenants
    SET config = config || ${JSON.stringify(config)}::jsonb,
        updated_at = NOW()
    WHERE id = ${tenantId}
    RETURNING *
  `;
  return row ? rowToTenant(row) : null;
}

export async function listTenants(): Promise<Tenant[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM tenants ORDER BY created_at DESC`;
  return rows.map(rowToTenant);
}

// ─── Row Mapping ─────────────────────────────────────────────

function rowToTenant(row: Record<string, any>): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    chainId: row.chain_id,
    governorAddress: row.governor_address as Address,
    frameworkType: row.framework_type as GovernanceFramework,
    config: typeof row.config === "string" ? JSON.parse(row.config) : row.config,
    apiKeyHash: row.api_key_hash,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}
