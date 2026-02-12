/**
 * Tool registry - registers all MCP tools on the server
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerContractInfoTool } from "./contract-info.ts";
import { registerContractSourceTools } from "./contract-source.ts";
import { registerStorageTools } from "./storage.ts";
import { registerOnChainTool } from "./on-chain.ts";
import { registerGovernanceTools } from "./governance.ts";
import { registerSimulationTool } from "./simulation.ts";

import { registerForkTestTool } from "./fork-test.ts";
import { registerEncodeTool } from "./encode.ts";
import { registerAnalysisTool } from "./agenda-analysis.ts";

export function registerAllTools(server: McpServer) {
  // Phase 1: Code exploration
  registerContractInfoTool(server);
  registerContractSourceTools(server);

  // Phase 2: On-chain queries
  registerStorageTools(server);
  registerOnChainTool(server);

  // Phase 3: Calldata decoding
  registerGovernanceTools(server);

  // Phase 4: Simulation
  registerSimulationTool(server);

  // Phase 5: Verification
  registerForkTestTool(server);

  // Phase 6: Proposal tools
  registerEncodeTool(server);
  registerAnalysisTool(server);
}
