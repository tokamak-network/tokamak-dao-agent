/**
 * Tenant Authentication Middleware
 *
 * Authenticates requests via Bearer token and attaches tenant to context.
 */

import type { Context, Next } from "hono";
import { getTenantByApiKey, getTenantBySlug } from "../../db/tenants.js";
import type { Tenant } from "../../types/index.js";

// Extend Hono context with tenant
declare module "hono" {
  interface ContextVariableMap {
    tenant: Tenant;
  }
}

/**
 * Require valid API key in Authorization header.
 * Sets `c.get("tenant")` on success.
 */
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(
      { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" },
      401,
    );
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey.startsWith("gvl_")) {
    return c.json(
      { code: "UNAUTHORIZED", message: "Invalid API key format" },
      401,
    );
  }

  const tenant = await getTenantByApiKey(apiKey);
  if (!tenant) {
    return c.json(
      { code: "UNAUTHORIZED", message: "Invalid API key" },
      401,
    );
  }

  c.set("tenant", tenant);
  return next();
}

/**
 * Verify that the :slug param matches the authenticated tenant.
 * Must be used after requireAuth.
 */
export async function requireTenantMatch(c: Context, next: Next) {
  const tenant = c.get("tenant");
  const slug = c.req.param("slug");

  if (!tenant) {
    return c.json(
      { code: "UNAUTHORIZED", message: "Not authenticated" },
      401,
    );
  }

  if (slug && tenant.slug !== slug) {
    return c.json(
      { code: "FORBIDDEN", message: "API key does not match tenant" },
      403,
    );
  }

  return next();
}
