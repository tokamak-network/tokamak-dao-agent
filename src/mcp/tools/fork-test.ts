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
import { FORK_TEST_TIMEOUT_MS, FORK_TEST_MAX_OUTPUT } from "../../config.ts";

const CONTRACTS_DIR = join(PROJECT_ROOT, "contracts");

/**
 * Validate test pattern to prevent command injection.
 * Only alphanumeric, underscores, wildcards (*), and dots (.) are allowed.
 */
function isValidPattern(pattern: string): boolean {
  return /^[a-zA-Z0-9_.*]+$/.test(pattern);
}

/**
 * Convert glob-style wildcards to regex for forge --match-test.
 * Forge uses regex, but AI agents naturally produce glob patterns.
 * Converts lone `*` to `.*` while preserving existing `.*`.
 */
function normalizeTestPattern(pattern: string): { normalized: string; wasConverted: boolean } {
  const normalized = pattern.replace(/(?<!\.)(\*)/g, ".*");
  return { normalized, wasConverted: normalized !== pattern };
}

/**
 * Run a Foundry fork test and return the output.
 */
/**
 * Validate env var key: must be uppercase letters, digits, underscores.
 */
function isValidEnvKey(key: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/.test(key);
}

/**
 * Validate env var value: alphanumeric, underscores, hyphens, dots, and hex addresses.
 */
function isValidEnvValue(value: string): boolean {
  return /^[a-zA-Z0-9_\-\.x]+$/.test(value);
}

async function runForgeTest(args: {
  test_pattern: string;
  contract_pattern?: string;
  verbosity?: number;
  env_vars?: Record<string, string>;
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

  // Validate env_vars if provided
  if (args.env_vars) {
    for (const [key, value] of Object.entries(args.env_vars)) {
      if (!isValidEnvKey(key)) {
        return `Error: Invalid env var key "${key}". Must match /^[A-Z_][A-Z0-9_]*$/.`;
      }
      if (!isValidEnvValue(value)) {
        return `Error: Invalid env var value for "${key}". Only alphanumeric, underscores, hyphens, dots, and 'x' allowed.`;
      }
    }
  }

  // Convert glob-style patterns to regex for forge --match-test
  const { normalized: testPattern, wasConverted } = normalizeTestPattern(args.test_pattern);

  const verbosity = Math.min(Math.max(args.verbosity ?? 3, 1), 5);
  const verbosityFlag = "-" + "v".repeat(verbosity);

  // Build command arguments (no shell interpolation - using spawn with array args)
  const forgeArgs = [
    "test",
    "--match-test",
    testPattern,
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
        ...(args.env_vars || {}),
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    // Race between process completion and timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Forge test timed out after ${FORK_TEST_TIMEOUT_MS / 1000}s`));
      }, FORK_TEST_TIMEOUT_MS);
    });

    const exitCode = await Promise.race([proc.exited, timeoutPromise]);
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    return formatResult(args.test_pattern, testPattern, wasConverted, exitCode as number, stdout, stderr);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `## Fork Test Error\n\n**Pattern**: \`${args.test_pattern}\`\n**Error**: ${message}`;
  }
}

/**
 * Format forge test output as readable markdown.
 */
function formatResult(
  originalPattern: string,
  normalizedPattern: string,
  wasConverted: boolean,
  exitCode: number,
  stdout: string,
  stderr: string,
): string {
  const lines: string[] = [];

  lines.push(`## Fork Test Results`);
  lines.push("");
  lines.push(`**Pattern**: \`${originalPattern}\``);
  if (wasConverted) {
    lines.push(`**Normalized**: \`${normalizedPattern}\` (glob wildcards converted to regex)`);
  }

  // Extract test results summary
  const output = stdout || stderr;
  const testLines = output.split("\n");

  // Find individual test results (PASS/FAIL lines)
  const resultLines = testLines.filter(
    (l) => l.includes("[PASS]") || l.includes("[FAIL]"),
  );

  const testCount = resultLines.length;

  if (testCount === 0) {
    // Zero tests matched — this is NOT "ALL PASSED", it's a no-op
    lines.push(`**Exit code**: ${exitCode}`);
    lines.push(`**WARNING: NO TESTS MATCHED pattern \`${normalizedPattern}\`**`);
    lines.push("");
    lines.push("No test functions matched this pattern. Possible causes:");
    lines.push("- Test function name doesn't exist in the test suite");
    lines.push("- Pattern is too restrictive");
    lines.push("");
    lines.push("**This result provides NO evidence. Do not draw conclusions from it.**");
  } else {
    lines.push(`**Exit code**: ${exitCode} (${exitCode === 0 ? "ALL PASSED" : "FAILURE"})`);
    lines.push(`**Tests run**: ${testCount}`);
    lines.push("");

    lines.push("### Test Results");
    lines.push("");
    for (const rl of resultLines) {
      const isPassing = rl.includes("[PASS]");
      const isNegativeTest = /Reverts|Fails|ShouldRevert|ShouldFail/i.test(rl);

      if (isPassing && isNegativeTest) {
        lines.push(`- **PASS**: ${rl.trim()}`);
        lines.push(`  > Note: This is a negative test — PASS means the operation REVERTS (i.e., it does NOT work)`);
      } else {
        const icon = isPassing ? "PASS" : "FAIL";
        lines.push(`- **${icon}**: ${rl.trim()}`);
      }
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
  const fullOutput = output.length > FORK_TEST_MAX_OUTPUT
    ? output.slice(0, FORK_TEST_MAX_OUTPUT) + "\n... (truncated)"
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
  env_vars?: Record<string, string>;
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
        .describe("Test function name pattern (e.g. 'test_TON_UniswapV2'). Supports regex (forge --match-test). Glob wildcards (*) are auto-converted to regex (.*)"),
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
      env_vars: z
        .record(z.string(), z.string())
        .optional()
        .describe("Environment variables to pass to forge (e.g. { AGENDA_ID: '1' })"),
    },
    async ({ test_pattern, contract_pattern, verbosity, env_vars }) => {
      try {
        const text = await runForgeTest({ test_pattern, contract_pattern, verbosity, env_vars });
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
