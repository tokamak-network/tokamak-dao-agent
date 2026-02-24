/**
 * Credibility Routes
 *
 * GET /api/v1/tenants/:slug/credibility — Agent credibility summaries
 */

import { Hono } from "hono";
import { getCredibilityRecords } from "../../db/evaluations.js";
import { summarizeCredibility } from "../../core/credibility.js";
import { requireAuth, requireTenantMatch } from "../middleware/auth.js";

export const credibilityRoutes = new Hono();

credibilityRoutes.use("/*", requireAuth, requireTenantMatch);

credibilityRoutes.get("/", async (c) => {
  const tenant = c.get("tenant");
  const records = await getCredibilityRecords(tenant.id);
  const summaries = summarizeCredibility(records);

  return c.json({ agents: summaries });
});
