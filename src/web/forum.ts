/**
 * Forum REST API router.
 * Handles agenda CRUD, opinion submission, AI summary, and webhook subscriptions.
 */

import { Hono } from "hono";
import {
  createAgenda,
  getAgenda,
  listAgendas,
  updateAgendaStatus,
} from "../db/agendas.ts";
import type { CreateAgendaInput, ListAgendaOptions } from "../db/agendas.ts";
import { createOpinion, getOpinionsForAgenda } from "../db/opinions.ts";
import {
  validateAgendaInput,
  validateOpinionInput,
  validateWebhookInput,
} from "./forum-validation.ts";
import { generateSummary } from "./forum-summary.ts";
import { getDb } from "../db/index.ts";

export const forumRouter = new Hono();

// ── Agenda endpoints ──────────────────────────────────────────────────

forumRouter.post("/agenda", async (c) => {
  const body = await c.req.json();
  const error = validateAgendaInput(body);
  if (error) return c.json({ error }, 400);

  const input: CreateAgendaInput = {
    title: body.title,
    content: body.content,
    deadline: body.deadline,
    onChainAgendaId: body.onChainAgendaId,
    creator: body.creator,
  };

  const agenda = createAgenda(input);

  // Fire-and-forget webhook notifications
  notifySubscribers("new_agenda", agenda);

  return c.json(agenda, 201);
});

forumRouter.get("/agenda", (c) => {
  const opts: ListAgendaOptions = {
    status: c.req.query("status") || undefined,
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
    offset: c.req.query("offset") ? Number(c.req.query("offset")) : undefined,
    sort: (c.req.query("sort") as ListAgendaOptions["sort"]) || undefined,
  };

  const agendas = listAgendas(opts);
  return c.json({ agendas, count: agendas.length });
});

forumRouter.get("/agenda/:id", (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid agenda ID" }, 400);

  const agenda = getAgenda(id);
  if (!agenda) return c.json({ error: "Agenda not found" }, 404);

  const opinions = getOpinionsForAgenda(id);
  return c.json({ ...agenda, opinions });
});

// ── Opinion endpoints ─────────────────────────────────────────────────

forumRouter.post("/agenda/:id/opinion", async (c) => {
  const agendaId = Number(c.req.param("id"));
  if (isNaN(agendaId)) return c.json({ error: "Invalid agenda ID" }, 400);

  const agenda = getAgenda(agendaId);
  if (!agenda) return c.json({ error: "Agenda not found" }, 404);

  if (agenda.status !== "open") {
    return c.json({ error: "Agenda is not open for opinions" }, 400);
  }

  if (new Date(agenda.deadline) <= new Date()) {
    return c.json({ error: "Agenda deadline has passed" }, 400);
  }

  const body = await c.req.json();
  const error = validateOpinionInput(body);
  if (error) return c.json({ error }, 400);

  const opinion = createOpinion({
    agendaId,
    agentName: body.agentName,
    stakeholderType: body.stakeholderType,
    personality: body.personality,
    verdict: body.verdict,
    reasoning: body.reasoning,
    confidence: body.confidence,
    priorities: body.priorities,
  });

  return c.json(opinion, 201);
});

forumRouter.get("/agenda/:id/opinions", (c) => {
  const agendaId = Number(c.req.param("id"));
  if (isNaN(agendaId)) return c.json({ error: "Invalid agenda ID" }, 400);

  const agenda = getAgenda(agendaId);
  if (!agenda) return c.json({ error: "Agenda not found" }, 404);

  const opinions = getOpinionsForAgenda(agendaId);
  return c.json({ opinions, count: opinions.length });
});

// ── Summary endpoint ──────────────────────────────────────────────────

forumRouter.get("/agenda/:id/summary", async (c) => {
  const agendaId = Number(c.req.param("id"));
  if (isNaN(agendaId)) return c.json({ error: "Invalid agenda ID" }, 400);

  const agenda = getAgenda(agendaId);
  if (!agenda) return c.json({ error: "Agenda not found" }, 404);

  const opinions = getOpinionsForAgenda(agendaId);

  try {
    const summary = await generateSummary(agenda, opinions);
    return c.json(summary);
  } catch (err) {
    console.error("[forum] summary generation error:", err);
    return c.json(
      { error: "Failed to generate summary", detail: String(err) },
      500,
    );
  }
});

// ── Webhook endpoints ─────────────────────────────────────────────────

forumRouter.post("/webhook/subscribe", async (c) => {
  const body = await c.req.json();
  const error = validateWebhookInput(body);
  if (error) return c.json({ error }, 400);

  const db = getDb();
  try {
    db.prepare(
      `INSERT INTO webhook_subscribers (url, label, secret) VALUES (?, ?, ?)`,
    ).run(body.url, body.label ?? null, body.secret ?? null);
  } catch (err: any) {
    if (err.message?.includes("UNIQUE")) {
      return c.json({ error: "URL already subscribed" }, 409);
    }
    throw err;
  }

  return c.json({ status: "subscribed", url: body.url }, 201);
});

forumRouter.post("/webhook/new-agenda", async (c) => {
  const body = await c.req.json();
  const agendaId = body.agendaId;
  if (!agendaId) return c.json({ error: "agendaId is required" }, 400);

  const agenda = getAgenda(Number(agendaId));
  if (!agenda) return c.json({ error: "Agenda not found" }, 404);

  const count = await notifySubscribers("new_agenda", agenda);
  return c.json({ status: "notified", subscribersNotified: count });
});

// ── Webhook notification helper ───────────────────────────────────────

async function notifySubscribers(
  event: string,
  data: Record<string, any>,
): Promise<number> {
  const db = getDb();
  const subscribers = db
    .query(`SELECT * FROM webhook_subscribers WHERE active = 1`)
    .all() as { url: string; secret: string | null }[];

  let notified = 0;
  for (const sub of subscribers) {
    try {
      const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      if (sub.secret) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(sub.secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
        headers["X-Webhook-Signature"] = Buffer.from(sig).toString("hex");
      }

      // Fire-and-forget with 5s timeout
      fetch(sub.url, {
        method: "POST",
        headers,
        body: payload,
        signal: AbortSignal.timeout(5000),
      }).catch((err) => console.error(`[webhook] failed to notify ${sub.url}:`, err));

      notified++;
    } catch (err) {
      console.error(`[webhook] error preparing notification for ${sub.url}:`, err);
    }
  }

  return notified;
}
