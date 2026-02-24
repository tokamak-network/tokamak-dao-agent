/**
 * GovLens API Server
 *
 * Main entry point. Starts the Hono server with all routes.
 *
 * Usage: bun run --hot src/server.ts
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { tenantRoutes } from "./api/routes/tenants.js";
import { proposalRoutes } from "./api/routes/proposals.js";
import { credibilityRoutes } from "./api/routes/credibility.js";

const app = new Hono();

// ─── Middleware ───────────────────────────────────────────────

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Health Check ────────────────────────────────────────────

app.get("/health", (c) =>
  c.json({ status: "ok", service: "govlens", version: "0.1.0" }),
);

// ─── API Routes ──────────────────────────────────────────────

// Public routes (no auth required)
app.route("/api/v1", tenantRoutes);

// Tenant-scoped routes
app.route("/api/v1/tenants/:slug/proposals", proposalRoutes);
app.route("/api/v1/tenants/:slug/credibility", credibilityRoutes);

// ─── Error Handler ───────────────────────────────────────────

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    },
    500,
  );
});

// ─── 404 Handler ─────────────────────────────────────────────

app.notFound((c) =>
  c.json({ code: "NOT_FOUND", message: "Route not found" }, 404),
);

// ─── Start Server ────────────────────────────────────────────

const port = parseInt(process.env.PORT ?? "4000", 10);

console.log(`
╔══════════════════════════════════════════╗
║            GovLens API Server            ║
║                                          ║
║  Universal DAO Governance Analysis       ║
╚══════════════════════════════════════════╝

  → http://localhost:${port}
  → Health: http://localhost:${port}/health

  Endpoints:
    POST /api/v1/discover
    POST /api/v1/tenants
    GET  /api/v1/tenants/:slug
    GET  /api/v1/tenants/:slug/proposals
    GET  /api/v1/tenants/:slug/proposals/:id
    POST /api/v1/tenants/:slug/proposals/:id/analyze
    POST /api/v1/tenants/:slug/proposals/:id/deliberate
    POST /api/v1/tenants/:slug/proposals/:id/simulate
    GET  /api/v1/tenants/:slug/credibility
`);

export default {
  port,
  fetch: app.fetch,
};
