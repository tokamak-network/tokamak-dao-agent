/**
 * list_dao_actions tool handler
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DAO_ACTIONS, findDaoAction } from "../data/dao-actions.ts";
import type { AbiFunction } from "../data/dao-actions.ts";

function formatFn(fn: AbiFunction): string {
  const args = fn.inputs.map((i) => `${i.type} ${i.name}`).join(", ");
  return `${fn.name}(${args})`;
}

export async function handleListDaoActions(args: {
  contract_name?: string;
}): Promise<string> {
  if (args.contract_name) {
    const action = findDaoAction(args.contract_name);
    if (!action) {
      return `No DAO action found for "${args.contract_name}".\n\nAvailable contracts:\n${DAO_ACTIONS.map((a) => `- ${a.name} (${a.address})`).join("\n")}`;
    }

    const fns = action.abi.map((fn) => `- ${formatFn(fn)}`).join("\n");
    return [
      `## ${action.name}`,
      `**Address**: ${action.address}`,
      `**Description**: ${action.description}`,
      `**Functions** (${action.abi.length}):`,
      fns,
    ].join("\n");
  }

  // List all
  const sections = DAO_ACTIONS.map((action) => {
    const fns = action.abi.map((fn) => `  - ${formatFn(fn)}`).join("\n");
    return `### ${action.name} (${action.address})\n${action.description} — ${action.abi.length} functions\n${fns}`;
  });

  return `# DAO-Callable Contracts\n\n${sections.join("\n\n")}`;
}

export function registerListDaoActionsTool(server: McpServer) {
  server.tool(
    "list_dao_actions",
    "List all DAO-callable contracts and their governance functions. Use to discover what functions the DAO can call via proposals.",
    {
      contract_name: z.string().optional().describe("Filter by contract name (optional)"),
    },
    async ({ contract_name }) => {
      try {
        const text = await handleListDaoActions({ contract_name });
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err}` }],
          isError: true,
        };
      }
    }
  );
}
