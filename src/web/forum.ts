/**
 * Forum REST API router.
 * Handles agenda CRUD, opinion submission, AI summary, and webhook subscriptions.
 */

import { Hono } from "hono";
import {
  createAgenda,
  getAgenda,
  listAgendas,
  updateAgenda,
  updateAgendaStatus,
} from "../db/agendas.ts";
import type { CreateAgendaInput, ListAgendaOptions } from "../db/agendas.ts";
import { createOpinion, getOpinionsForAgenda } from "../db/opinions.ts";
import {
  getValidationsForAgenda,
  clearValidationsForAgenda,
} from "../db/validations.ts";
import {
  validateAgendaInput,
  validateAgentInput,
  validateOpinionInput,
  validateWebhookInput,
} from "./forum-validation.ts";
import { generateSummary } from "./forum-summary.ts";
import { generateAgentOpinions, generateSingleAgentOpinion } from "./forum-agents.ts";
import { runValidationWorkflow } from "./forum-validators.ts";
import { translateText } from "./forum-translate.ts";
import { listAgents, createAgent, deleteAgent } from "../db/agents.ts";
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

  // Immediately move to pending_review and start validation
  const updated = updateAgendaStatus(agenda.id, "pending_review")!;

  // Fire-and-forget validation workflow
  runValidationWorkflow(updated).catch((err) =>
    console.error("[forum] validation workflow error:", err),
  );

  return c.json(updated, 201);
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

// ── Validation endpoints ──────────────────────────────────────────────

forumRouter.get("/agenda/:id/validations", (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid agenda ID" }, 400);

  const agenda = getAgenda(id);
  if (!agenda) return c.json({ error: "Agenda not found" }, 404);

  const validations = getValidationsForAgenda(id);
  const allPass =
    validations.length === 3 && validations.every((v) => v.status === "pass");

  return c.json({ validations, allPass });
});

forumRouter.patch("/agenda/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid agenda ID" }, 400);

  const agenda = getAgenda(id);
  if (!agenda) return c.json({ error: "Agenda not found" }, 404);

  if (agenda.status !== "draft" && agenda.status !== "rejected") {
    return c.json(
      { error: "Can only edit agendas in draft or rejected status" },
      400,
    );
  }

  const body = await c.req.json();
  const fields: { title?: string; content?: string; deadline?: string } = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.length < 1 || body.title.length > 200) {
      return c.json({ error: "title must be 1-200 characters" }, 400);
    }
    fields.title = body.title;
  }
  if (body.content !== undefined) {
    if (typeof body.content !== "string" || body.content.length < 1 || body.content.length > 10000) {
      return c.json({ error: "content must be 1-10000 characters" }, 400);
    }
    fields.content = body.content;
  }
  if (body.deadline !== undefined) {
    if (typeof body.deadline !== "string" || isNaN(new Date(body.deadline).getTime())) {
      return c.json({ error: "deadline must be a valid ISO 8601 date" }, 400);
    }
    fields.deadline = body.deadline;
  }

  // Update fields, reset status, clear old validations
  updateAgenda(id, fields);
  clearValidationsForAgenda(id);
  const updated = updateAgendaStatus(id, "pending_review")!;

  // Fire-and-forget re-validation
  runValidationWorkflow(updated).catch((err) =>
    console.error("[forum] re-validation workflow error:", err),
  );

  return c.json(updated);
});

// ── Opinion request endpoint ──────────────────────────────────────────

forumRouter.post("/agenda/:id/opinion/request", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid agenda ID" }, 400);

  const agenda = getAgenda(id);
  if (!agenda) return c.json({ error: "Agenda not found" }, 404);

  if (agenda.status !== "open") {
    return c.json({ error: "Agenda must be open to request opinions" }, 400);
  }

  const body = await c.req.json();
  const agentName = body?.agentName;
  if (typeof agentName !== "string" || !agentName) {
    return c.json({ error: "agentName is required" }, 400);
  }

  // Check if opinion already exists
  const existingOpinions = getOpinionsForAgenda(id);
  if (existingOpinions.some((o) => o.agentName === agentName)) {
    return c.json({ error: "Opinion already exists for this agent" }, 409);
  }

  // Synchronous — wait for LLM result so frontend gets immediate feedback
  try {
    const found = await generateSingleAgentOpinion(agenda, agentName);
    if (!found) {
      return c.json({ error: `Agent "${agentName}" not found` }, 404);
    }

    // Fetch the newly created opinion
    const opinions = getOpinionsForAgenda(id);
    const newOpinion = opinions.find((o) => o.agentName === agentName);
    return c.json({ status: "completed", opinion: newOpinion }, 201);
  } catch (err) {
    console.error(`[forum] opinion generation error for ${agentName}:`, err);
    return c.json(
      { error: `Failed to generate opinion: ${err instanceof Error ? err.message : String(err)}` },
      500,
    );
  }
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

// ── Agent endpoints ───────────────────────────────────────────────────

forumRouter.get("/agent", (c) => {
  const agents = listAgents();
  return c.json({ agents, count: agents.length });
});

forumRouter.post("/agent", async (c) => {
  const body = await c.req.json();
  const error = validateAgentInput(body);
  if (error) return c.json({ error }, 400);

  try {
    const agent = createAgent({
      id: body.id,
      name: body.name,
      stakeholderType: body.stakeholderType,
      personality: body.personality,
      priorities: body.priorities,
    });
    return c.json(agent, 201);
  } catch (err: any) {
    if (err.message?.includes("UNIQUE") || err.message?.includes("PRIMARY")) {
      return c.json({ error: "Agent with this ID already exists" }, 409);
    }
    throw err;
  }
});

forumRouter.delete("/agent/:id", (c) => {
  const id = c.req.param("id");
  const deleted = deleteAgent(id);
  if (!deleted) return c.json({ error: "Agent not found" }, 404);
  return c.json({ status: "deleted", id });
});

// ── Agent polling endpoint ────────────────────────────────────────────

forumRouter.get("/agent/:agentName/pending-agendas", (c) => {
  const agentName = c.req.param("agentName");
  const db = getDb();
  const rows = db
    .query(
      `SELECT a.* FROM agendas a
       WHERE a.status = 'open'
         AND a.deadline > datetime('now')
         AND a.id NOT IN (
           SELECT o.agenda_id FROM opinions o WHERE o.agent_name = ?
         )
       ORDER BY a.created_at DESC`,
    )
    .all(agentName);

  return c.json({ agendas: rows, count: rows.length });
});

// ── Translation endpoint ──────────────────────────────────────────────

forumRouter.post("/translate", async (c) => {
  const body = await c.req.json();
  const text = body?.text;

  if (!text || typeof text !== "string") {
    return c.json({ error: "text is required" }, 400);
  }

  if (text.length > 10_000) {
    return c.json({ error: "text exceeds 10,000 character limit" }, 400);
  }

  try {
    const translated = await translateText(text);
    return c.json({ translated });
  } catch (err) {
    console.error("[forum] translation error:", err);
    return c.json(
      { error: "Failed to translate", detail: String(err) },
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
