/**
 * Tokamak DAO Agent - MCP Server
 *
 * Provides tools for Claude Code to analyze Tokamak Network contracts,
 * query on-chain state, and analyze DAO proposals.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.ts";

const server = new McpServer({
  name: "tokamak-dao",
  version: "1.0.0",
});

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
