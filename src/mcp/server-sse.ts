/**
 * SSE MCP Server — Legacy SSE transport for ElizaOS compatibility.
 *
 * ElizaOS's @fleek-platform/eliza-plugin-mcp expects the deprecated
 * SSE transport (GET /sse + POST /messages?sessionId=...).
 * This server provides that interface using the MCP SDK's SSEServerTransport.
 *
 * Usage:
 *   bun run src/mcp/server-sse.ts
 *   # or via supergateway (zero-code alternative):
 *   npx -y supergateway --port 3001 --stdio "bun run src/mcp/server.ts"
 */

import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerAllTools } from "./tools/index.ts";

const PORT = Number(process.env.MCP_SSE_PORT) || 3001;

const transports = new Map<string, SSEServerTransport>();

const httpServer = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url!, `http://localhost:${PORT}`);

  // Optional API key auth
  const apiKey = process.env.MCP_API_KEY;
  if (apiKey) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${apiKey}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
  }

  // GET /sse — Establish SSE stream
  if (req.method === "GET" && url.pathname === "/sse") {
    const server = new McpServer({ name: "tokamak-dao", version: "1.0.0" });
    registerAllTools(server);

    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);

    res.on("close", () => {
      transports.delete(transport.sessionId);
    });

    await server.connect(transport);
    return;
  }

  // POST /messages?sessionId=... — Send message to session
  if (req.method === "POST" && url.pathname === "/messages") {
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing sessionId query parameter" }));
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unknown session" }));
      return;
    }

    // Parse body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString());

    await transport.handlePostMessage(req, res, body);
    return;
  }

  // Health check
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", transport: "sse", sessions: transports.size }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

httpServer.listen(PORT, () => {
  console.log(`Tokamak DAO MCP SSE server listening on port ${PORT}`);
  console.log(`  SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`  Messages: http://localhost:${PORT}/messages`);
});
