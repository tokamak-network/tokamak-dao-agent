/**
 * Hono sub-router proxying requests to a local ElizaOS instance.
 * All endpoints fail gracefully — the client never sees a 5xx when ElizaOS is down.
 */

import { Hono } from "hono";
import { ELIZAOS_BASE_URL } from "../config.ts";

export const elizaosRouter = new Hono();

const TIMEOUT_MS = 15_000;

async function proxyGet(path: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${ELIZAOS_BASE_URL}${path}`, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function proxyPost(path: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${ELIZAOS_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Health check
elizaosRouter.get("/health", async (c) => {
  try {
    const res = await proxyGet("/healthz");
    return c.json({ available: res.ok });
  } catch {
    return c.json({ available: false });
  }
});

// List agents
elizaosRouter.get("/agents", async (c) => {
  try {
    const res = await proxyGet("/api/agents");
    if (!res.ok) {
      return c.json({ agents: [], error: `ElizaOS returned ${res.status}` });
    }
    const data = await res.json();
    // ElizaOS v1.7.2 wraps in { success, data: { agents } }
    const agents = data?.data?.agents ?? data?.agents ?? [];
    return c.json({ agents });
  } catch {
    return c.json({ agents: [], error: "ElizaOS is not reachable" });
  }
});

// Start agent
elizaosRouter.post("/agents/:id/start", async (c) => {
  const { id } = c.req.param();
  try {
    const res = await proxyPost(`/api/agents/${id}/start`);
    const data = await res.json();
    return c.json(data, res.ok ? 200 : 502);
  } catch {
    return c.json({ error: "ElizaOS is not reachable" }, 502);
  }
});

// Stop agent
elizaosRouter.post("/agents/:id/stop", async (c) => {
  const { id } = c.req.param();
  try {
    const res = await proxyPost(`/api/agents/${id}/stop`);
    const data = await res.json();
    return c.json(data, res.ok ? 200 : 502);
  } catch {
    return c.json({ error: "ElizaOS is not reachable" }, 502);
  }
});
