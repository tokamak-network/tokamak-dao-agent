/**
 * Tenant Routes
 *
 * POST /api/v1/tenants         — Onboard a new tenant
 * POST /api/v1/discover        — Auto-detect governance framework
 * GET  /api/v1/tenants/:slug   — Get tenant info
 */

import { Hono } from "hono";
import type { Address } from "viem";
import { createTenant, getTenantBySlug } from "../../db/tenants.js";
import { getChainManager } from "../../chain/client.js";
import { detectFramework, getAllAdapters } from "../../adapters/index.js";
import { validateAddress, validateChainId, validateSlug } from "../../core/validation.js";
import {
  DEFAULT_CRITERIA,
  DEFAULT_LENSES,
  DEFAULT_VERDICT_THRESHOLDS,
  DEFAULT_HARD_VETO,
  DEFAULT_OUTCOME_MAPPING,
} from "../../core/defaults.js";
import type { TenantConfig } from "../../types/index.js";
import { requireAuth, requireTenantMatch } from "../middleware/auth.js";

export const tenantRoutes = new Hono();

// ─── POST /api/v1/discover ───────────────────────────────────

tenantRoutes.post("/discover", async (c) => {
  const body = await c.req.json<{ address: string; chainId: number }>();

  const addrError = validateAddress(body.address);
  if (addrError) return c.json({ code: "INVALID_INPUT", message: addrError }, 400);

  const chainError = validateChainId(body.chainId);
  if (chainError) return c.json({ code: "INVALID_INPUT", message: chainError }, 400);

  const client = getChainManager();
  const adapters = getAllAdapters();

  const result = await detectFramework(
    body.address as Address,
    body.chainId,
    client,
    adapters,
  );

  if (!result) {
    return c.json({
      code: "NOT_FOUND",
      message: "Could not detect governance framework at this address",
    }, 404);
  }

  return c.json({
    framework: result.framework,
    confidence: result.confidence,
    contracts: result.contracts.map((entry) => ({
      address: entry.address,
      name: entry.name,
      role: entry.role,
    })),
  });
});

// ─── POST /api/v1/tenants ────────────────────────────────────

tenantRoutes.post("/tenants", async (c) => {
  const body = await c.req.json<{
    slug: string;
    name: string;
    address: string;
    chainId: number;
  }>();

  // Validate inputs
  const slugError = validateSlug(body.slug);
  if (slugError) return c.json({ code: "INVALID_INPUT", message: slugError }, 400);

  const addrError = validateAddress(body.address);
  if (addrError) return c.json({ code: "INVALID_INPUT", message: addrError }, 400);

  const chainError = validateChainId(body.chainId);
  if (chainError) return c.json({ code: "INVALID_INPUT", message: chainError }, 400);

  // Check slug uniqueness
  const existing = await getTenantBySlug(body.slug);
  if (existing) {
    return c.json({ code: "CONFLICT", message: "Slug already taken" }, 409);
  }

  // Auto-detect governance framework
  const client = getChainManager();
  const adapters = getAllAdapters();
  const discovery = await detectFramework(
    body.address as Address,
    body.chainId,
    client,
    adapters,
  );

  if (!discovery) {
    return c.json({
      code: "DETECTION_FAILED",
      message: "Could not detect governance framework. Use POST /discover to check manually.",
    }, 422);
  }

  // Build default config
  const config: TenantConfig = {
    criteria: DEFAULT_CRITERIA,
    lenses: DEFAULT_LENSES,
    verdictThresholds: DEFAULT_VERDICT_THRESHOLDS,
    hardVetoRule: DEFAULT_HARD_VETO,
    outcomeMapping: DEFAULT_OUTCOME_MAPPING,
    additionalContracts: discovery.contracts,
  };

  // Create tenant
  const { tenant, apiKey } = await createTenant({
    slug: body.slug,
    name: body.name,
    chainId: body.chainId,
    governorAddress: body.address as Address,
    frameworkType: discovery.framework,
    config,
  });

  return c.json(
    {
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        framework: tenant.frameworkType,
        chainId: tenant.chainId,
        governorAddress: tenant.governorAddress,
      },
      apiKey, // Only returned once at creation!
      discovery: {
        framework: discovery.framework,
        confidence: discovery.confidence,
        contracts: discovery.contracts.length,
      },
    },
    201,
  );
});

// ─── GET /api/v1/tenants/:slug ───────────────────────────────

tenantRoutes.get("/tenants/:slug", requireAuth, requireTenantMatch, async (c) => {
  const tenant = c.get("tenant");
  return c.json({
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    framework: tenant.frameworkType,
    chainId: tenant.chainId,
    governorAddress: tenant.governorAddress,
    criteria: tenant.config.criteria.map((c) => ({ id: c.id, label: c.label })),
    lenses: tenant.config.lenses.map((l) => ({ id: l.id, name: l.name })),
  });
});
