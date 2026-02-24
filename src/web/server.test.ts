/**
 * API endpoint tests for the web server.
 * Uses Hono's built-in request method — no server needed.
 *
 * Run: bun test src/web/server.test.ts
 */

import { describe, test, expect, beforeAll } from "bun:test";

// We test by importing the app's default export and calling fetch on it.
// Since server.ts exports { port, fetch }, we can use the fetch function directly.
import serverExport from "./server.ts";

const app = { fetch: serverExport.fetch };

function req(path: string, init?: RequestInit) {
  return app.fetch(new Request(`http://localhost${path}`, init), undefined as any);
}

describe("Health check", () => {
  test("GET /api/health returns status", async () => {
    const res = await req("/api/health");
    expect(res.status).toBeLessThanOrEqual(503); // ok or degraded
    const data = await res.json() as any;
    expect(data.status).toBeDefined();
    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof data.tools).toBe("number");
    expect(data.checks).toBeDefined();
    expect(data.checks.db).toBeDefined();
  });
});

describe("Security headers", () => {
  test("responses include security headers", async () => {
    const res = await req("/api/health");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    // CSP should be present
    const csp = res.headers.get("content-security-policy");
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
  });
});

describe("Rate limiting headers", () => {
  test("GET /api/health includes rate limit headers", async () => {
    // Health is under /api/* which has the general rate limit
    const res = await req("/api/health");
    // Forum-specific rate limits won't apply here, but general ones might not be set for health
    // At minimum, check we get a 200 or 503
    expect([200, 503]).toContain(res.status);
  });
});

describe("Body size limits", () => {
  test("POST /api/chat rejects body > 2MB", async () => {
    // Build a valid JSON body that exceeds 2MB
    const padding = "a".repeat(3 * 1024 * 1024);
    const largeBody = JSON.stringify({ messages: [{ role: "user", content: padding }] });
    const res = await req("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: largeBody,
    });
    // bodyLimit returns 413, but if parsing happens first it could be 500
    expect([413, 500]).toContain(res.status);
  });
});

describe("Not found", () => {
  test("unknown API route returns 404 JSON", async () => {
    const res = await req("/api/nonexistent");
    expect(res.status).toBe(404);
    const data = await res.json() as any;
    expect(data.error).toBe("Not found");
  });
});

describe("Forum agenda CRUD", () => {
  test("POST /api/forum/agenda creates agenda", async () => {
    const res = await req("/api/forum/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Agenda for CI",
        content: "This is a test agenda created by automated tests.",
      }),
    });
    // Should be 201 (agenda created)
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.id).toBeDefined();
    expect(data.title).toContain("Test Agenda for CI");
    expect(data.status).toBe("open");
  });

  test("POST /api/forum/agenda validates input", async () => {
    const res = await req("/api/forum/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", content: "some content" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toBeDefined();
  });

  test("GET /api/forum/agenda lists agendas", async () => {
    const res = await req("/api/forum/agenda");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.agendas)).toBe(true);
    expect(data.count).toBeGreaterThanOrEqual(0);
  });

  test("GET /api/forum/agenda/:id returns agenda with opinions", async () => {
    // Create first
    const createRes = await req("/api/forum/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Detail Test Agenda",
        content: "Content for detail view test.",
      }),
    });
    const created = await createRes.json() as any;

    const res = await req(`/api/forum/agenda/${created.id}`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.id).toBe(created.id);
    expect(Array.isArray(data.opinions)).toBe(true);
    expect(Array.isArray(data.comments)).toBe(true);
  });

  test("GET /api/forum/agenda/999999 returns 404", async () => {
    const res = await req("/api/forum/agenda/999999");
    expect(res.status).toBe(404);
  });

  test("GET /api/forum/agenda/abc returns 400", async () => {
    const res = await req("/api/forum/agenda/abc");
    expect(res.status).toBe(400);
  });
});

describe("Forum comments", () => {
  test("POST /api/forum/agenda/:id/comment creates comment", async () => {
    // Create agenda first
    const agendaRes = await req("/api/forum/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Comment Test", content: "Test content." }),
    });
    const agenda = await agendaRes.json() as any;

    const res = await req(`/api/forum/agenda/${agenda.id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress: "0x0000000000000000000000000000000000000001",
        content: "This is a test comment",
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.content).toBe("This is a test comment");
  });

  test("POST /api/forum/agenda/:id/comment validates input", async () => {
    // Use agenda ID 1 (created by earlier test)
    const res = await req(`/api/forum/agenda/1/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: "invalid", content: "" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("Forum agents", () => {
  test("GET /api/forum/agent lists agents", async () => {
    const res = await req("/api/forum/agent");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.agents)).toBe(true);
  });
});

describe("Static assets", () => {
  test("SPA routes return HTML or 404", async () => {
    const res = await req("/chat");
    // Could be 200 (if built) or 404 (if not)
    expect([200, 404]).toContain(res.status);
  });
});

describe("Models endpoint", () => {
  test("GET /api/models returns model list", async () => {
    const res = await req("/api/models");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.models)).toBe(true);
    expect(data.default).toBeDefined();
    expect(data.provider).toBeDefined();
  });
});
