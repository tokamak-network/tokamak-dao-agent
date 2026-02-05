/**
 * get_contract_info tool - Search and retrieve contract metadata
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchContracts, findRelatedContracts } from "../data/contracts.ts";

export async function handleGetContractInfo(args: { query: string }): Promise<string> {
  const results = searchContracts(args.query);

  if (results.length === 0) {
    return `No contracts found matching "${args.query}"`;
  }

  const lines: string[] = [];
  for (const contract of results) {
    lines.push(`## ${contract.name}`);
    lines.push(`- **Address**: ${contract.address}`);
    lines.push(`- **Type**: ${contract.type}`);
    lines.push(`- **Description**: ${contract.description}`);
    if (contract.implementation) {
      lines.push(`- **Implementation**: ${contract.implementation}`);
    }

    const related = findRelatedContracts(contract);
    if (related.length > 0) {
      lines.push(`- **Related contracts**:`);
      for (const r of related) {
        lines.push(`  - ${r.name} (${r.type}) - ${r.address}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function registerContractInfoTool(server: McpServer) {
  server.tool(
    "get_contract_info",
    "Search Tokamak Network contracts by name or address. Returns address, type, proxy relationships, and related contracts.",
    { query: z.string().describe("Contract name (partial match) or address (0x...)") },
    async ({ query }) => {
      const text = await handleGetContractInfo({ query });
      return { content: [{ type: "text" as const, text }] };
    }
  );
}
