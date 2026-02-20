/**
 * Hono sub-router proxying requests to a local ElizaOS instance.
 * All endpoints fail gracefully — the client never sees a 5xx when ElizaOS is down.
 */

import { Hono } from "hono";
import { ELIZAOS_BASE_URL } from "../config.ts";
import {
  WEB_USER_ENTITY_ID,
  WEB_USER_NAME,
  joinChannel,
  sendSocketMessage,
} from "./elizaos-socket.ts";

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

async function proxyPostWithBody(path: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${ELIZAOS_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

/* ── Messaging endpoints ──────────────────────────────────────────── */

// Return fixed web user entity ID
elizaosRouter.get("/entity", (c) => {
  return c.json({ entityId: WEB_USER_ENTITY_ID, name: WEB_USER_NAME });
});

// Get current message server
elizaosRouter.get("/message-server", async (c) => {
  try {
    const res = await proxyGet("/api/messaging/message-server/current");
    if (!res.ok) return c.json({ error: `ElizaOS returned ${res.status}` }, 502);
    const data = await res.json();
    return c.json(data);
  } catch {
    return c.json({ error: "ElizaOS is not reachable" }, 502);
  }
});

// Get or create DM channel with an agent
elizaosRouter.get("/dm-channel", async (c) => {
  const agentId = c.req.query("agentId");
  if (!agentId) return c.json({ error: "agentId is required" }, 400);
  try {
    const res = await proxyGet(
      `/api/messaging/dm-channel?entityId=${WEB_USER_ENTITY_ID}&agentId=${agentId}`,
    );
    if (!res.ok) return c.json({ error: `ElizaOS returned ${res.status}` }, 502);
    const data = await res.json();
    return c.json(data);
  } catch {
    return c.json({ error: "ElizaOS is not reachable" }, 502);
  }
});

// Create group channel
elizaosRouter.post("/group-channel", async (c) => {
  try {
    const body = await c.req.json<{ name: string; agentIds: string[] }>();
    if (!body.name || !body.agentIds?.length) {
      return c.json({ error: "name and agentIds are required" }, 400);
    }
    const res = await proxyPostWithBody("/api/messaging/channels", {
      name: body.name,
      type: "GROUP",
      participantEntityIds: [WEB_USER_ENTITY_ID, ...body.agentIds],
    });
    if (!res.ok) return c.json({ error: `ElizaOS returned ${res.status}` }, 502);
    const data = await res.json();
    return c.json(data);
  } catch {
    return c.json({ error: "ElizaOS is not reachable" }, 502);
  }
});

// Send message to a channel (via Socket.IO)
elizaosRouter.post("/channels/:id/send", async (c) => {
  const channelId = c.req.param("id");
  try {
    const body = await c.req.json<{ content: string; messageServerId: string; targetAgentId?: string }>();
    if (!body.content?.trim()) return c.json({ error: "content is required" }, 400);
    if (!body.messageServerId) return c.json({ error: "messageServerId is required" }, 400);

    // Ensure we've joined the channel first
    const metadata: Record<string, string> = {};
    if (body.targetAgentId) metadata.targetUserId = body.targetAgentId;
    joinChannel(channelId, body.messageServerId, metadata);

    // Send message
    sendSocketMessage(channelId, body.messageServerId, body.content, metadata);

    return c.json({ success: true });
  } catch {
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// Get message history for a channel
elizaosRouter.get("/channels/:id/messages", async (c) => {
  const channelId = c.req.param("id");
  try {
    const res = await proxyGet(`/api/messaging/channels/${channelId}/messages`);
    if (!res.ok) return c.json({ messages: [], error: `ElizaOS returned ${res.status}` });
    const data = await res.json();
    const messages = data?.data?.messages ?? data?.messages ?? [];
    return c.json({ messages });
  } catch {
    return c.json({ messages: [], error: "ElizaOS is not reachable" });
  }
});
