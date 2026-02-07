/**
 * run_fork_test tool - Execute Foundry fork tests via MCP
 *
 * Allows the agent to run `forge test` against a mainnet fork,
 * providing evidence-based verification of on-chain behavior.
 */

import { z } from "zod";
import { join } from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PROJECT_ROOT } from "../paths.ts";

const CONTRACTS_DIR = join(PROJECT_ROOT, "contracts");
const TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Validate test pattern to prevent command injection.
 * Only alphanumeric, underscores, and wildcards (*) are allowed.
 */
function isValidPattern(pattern: string): boolean {
  return /^[a-zA-Z0-9_*]+$/.test(pattern);
}

/**
 * Run a Foundry fork test and return the output.
 */
async function runForgeTest(args: {
  test_pattern: string;
  contract_pattern?: string;
  verbosity?: number;
}): Promise<string> {
  const rpcUrl = process.env.ALCHEMY_RPC_URL;
  if (!rpcUrl) {
    return "Error: ALCHEMY_RPC_URL environment variable is not set. Fork tests require an RPC endpoint.";
  }

  if (!isValidPattern(args.test_pattern)) {
    return `Error: Invalid test_pattern "${args.test_pattern}". Only alphanumeric characters, underscores, and * are allowed.`;
  }

  if (args.contract_pattern && !isValidPattern(args.contract_pattern)) {
    return `Error: Invalid contract_pattern "${args.contract_pattern}". Only alphanumeric characters, underscores, and * are allowed.`;
  }

  const verbosity = Math.min(Math.max(args.verbosity ?? 3, 1), 5);
  const verbosityFlag = "-" + "v".repeat(verbosity);

  // Build command arguments (no shell interpolation - using spawn with array args)
  const forgeArgs = [
    "test",
    "--match-test",
    args.test_pattern,
    "--fork-url",
    rpcUrl,
    verbosityFlag,
  ];

  if (args.contract_pattern) {
    forgeArgs.push("--match-contract", args.contract_pattern);
  }

  try {
    const proc = Bun.spawn(["forge", ...forgeArgs], {
      cwd: CONTRACTS_DIR,
      env: {
        ...process.env,
        FOUNDRY_PROFILE: "fork",
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    // Race between process completion and timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Forge test timed out after ${TIMEOUT_MS / 1000}s`));
      }, TIMEOUT_MS);
    });

    const exitCode = await Promise.race([proc.exited, timeoutPromise]);
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    return formatResult(args.test_pattern, exitCode as number, stdout, stderr);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `## Fork Test Error\n\n**Pattern**: \`${args.test_pattern}\`\n**Error**: ${message}`;
  }
}

/**
 * Format forge test output as readable markdown.
 */
function formatResult(
  pattern: string,
  exitCode: number,
  stdout: string,
  stderr: string,
): string {
  const lines: string[] = [];

  lines.push(`## Fork Test Results`);
  lines.push("");
  lines.push(`**Pattern**: \`${pattern}\``);
  lines.push(`**Exit code**: ${exitCode} (${exitCode === 0 ? "ALL PASSED" : "FAILURE"})`);
  lines.push("");

  // Extract test results summary
  const output = stdout || stderr;
  const testLines = output.split("\n");

  // Find individual test results (PASS/FAIL lines)
  const resultLines = testLines.filter(
    (l) => l.includes("[PASS]") || l.includes("[FAIL]"),
  );
  if (resultLines.length > 0) {
    lines.push("### Test Results");
    lines.push("");
    for (const rl of resultLines) {
      const icon = rl.includes("[PASS]") ? "PASS" : "FAIL";
      lines.push(`- **${icon}**: ${rl.trim()}`);
    }
    lines.push("");
  }

  // Extract revert reasons if any
  const revertLines = testLines.filter(
    (l) => l.includes("revert") || l.includes("Revert"),
  );
  if (revertLines.length > 0) {
    lines.push("### Revert Details");
    lines.push("");
    lines.push("```");
    for (const rl of revertLines.slice(0, 10)) {
      lines.push(rl.trim());
    }
    lines.push("```");
    lines.push("");
  }

  // Extract gas summary if present
  const suiteResult = testLines.find((l) => l.includes("Suite result:"));
  if (suiteResult) {
    lines.push(`**Suite**: ${suiteResult.trim()}`);
    lines.push("");
  }

  // Include full output (truncated) for detailed analysis
  const MAX_OUTPUT = 3000;
  const fullOutput = output.length > MAX_OUTPUT
    ? output.slice(0, MAX_OUTPUT) + "\n... (truncated)"
    : output;

  lines.push("<details>");
  lines.push("<summary>Full output</summary>");
  lines.push("");
  lines.push("```");
  lines.push(fullOutput);
  lines.push("```");
  lines.push("</details>");

  return lines.join("\n");
}

/**
 * Exported handler for use by the web server's executeTool dispatcher.
 */
export async function handleRunForkTest(args: {
  test_pattern: string;
  contract_pattern?: string;
  verbosity?: number;
}): Promise<string> {
  return runForgeTest(args);
}

export function registerForkTestTool(server: McpServer) {
  server.tool(
    "run_fork_test",
    "Run Foundry fork tests against Ethereum mainnet. Use this to verify on-chain behavior with real state. Requires ALCHEMY_RPC_URL env var.",
    {
      test_pattern: z
        .string()
        .describe("Test function name pattern (e.g. 'test_TON_UniswapV2'). Only alphanumeric, underscores, and * allowed."),
      contract_pattern: z
        .string()
        .optional()
        .describe("Contract name pattern to filter (e.g. 'TONCompatibility')"),
      verbosity: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe("Output verbosity level 1-5 (default: 3)"),
    },
    async ({ test_pattern, contract_pattern, verbosity }) => {
      try {
        const text = await runForgeTest({ test_pattern, contract_pattern, verbosity });
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
