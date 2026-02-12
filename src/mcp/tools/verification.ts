/**
 * verify_token_compatibility tool - Test token compatibility with any DEX
 *
 * The agent discovers the DEX router address dynamically (via web search)
 * and passes it directly. No hardcoded DEX registry.
 */

import { z } from "zod";
import {
  encodeFunctionData,
  type Address,
  type Hex,
  parseEther,
} from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { publicClient } from "../client.ts";
import {
  COMMON_TOKENS,
  ERC20_ABI,
  V2_SWAP_ABI,
  V3_SWAP_ABI,
} from "../data/dex-protocols.ts";
import { validateAddress, extractRevertReason } from "./validation.ts";
import { handleRunForkTest } from "./fork-test.ts";

/**
 * Verification scenarios
 */
type VerificationScenario = "swap" | "approve" | "transferFrom";

/**
 * Result of a verification test
 */
interface VerificationResult {
  success: boolean;
  scenario: string;
  revertReason?: string;
  gasEstimate?: string;
  evidence: string[];
}

/**
 * Find a real token holder by checking known contract addresses on-chain.
 * Iterates through candidate addresses and returns the first one with a non-zero balance.
 */
async function findTokenHolder(tokenAddress: Address): Promise<Address | null> {
  // Known holder candidates from contracts.json (verified on-chain contracts)
  const KNOWN_HOLDERS: Record<string, Address[]> = {
    [COMMON_TOKENS.TON.toLowerCase()]: [
      "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303" as Address, // DAOVault
      "0x30e65B3A6e6868F044944Aa0e9C5d52F8dcb138d" as Address, // SwapProxy (TON↔WTON)
    ],
    [COMMON_TOKENS.WTON.toLowerCase()]: [
      "0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e" as Address, // DepositManagerProxy
      "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303" as Address, // DAOVault
    ],
  };

  const candidates = KNOWN_HOLDERS[tokenAddress.toLowerCase()] || [];

  for (const candidate of candidates) {
    try {
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [candidate],
      });
      if ((balance as bigint) > 0n) return candidate;
    } catch {
      // skip failed balance check
    }
  }

  return null;
}

/**
 * Generate swap calldata for Uniswap V2-style routers
 */
function generateV2SwapCalldata(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  recipient: Address
): Hex {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  return encodeFunctionData({
    abi: V2_SWAP_ABI,
    functionName: "swapExactTokensForTokens",
    args: [amountIn, 0n, [tokenIn, tokenOut], recipient, deadline],
  });
}

/**
 * Generate swap calldata for Uniswap V3-style routers
 */
function generateV3SwapCalldata(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  recipient: Address
): Hex {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  return encodeFunctionData({
    abi: V3_SWAP_ABI,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn,
        tokenOut,
        fee: 3000, // 0.3% pool
        recipient,
        deadline,
        amountIn,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
}

/**
 * Generate transferFrom calldata
 */
function generateTransferFromCalldata(
  from: Address,
  to: Address,
  amount: bigint
): Hex {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transferFrom",
    args: [from, to, amount],
  });
}

/**
 * Generate approve calldata
 */
function generateApproveCalldata(spender: Address, amount: bigint): Hex {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, amount],
  });
}

/**
 * Simulate a transaction and return result
 */
async function simulateCall(
  from: Address,
  to: Address,
  data: Hex,
  value: bigint = 0n
): Promise<{ success: boolean; error?: string; gasEstimate?: bigint }> {
  try {
    const gasEstimate = await publicClient.estimateGas({
      account: from,
      to,
      data,
      value,
    });

    await publicClient.call({
      account: from,
      to,
      data,
      value,
    });

    return { success: true, gasEstimate };
  } catch (error) {
    return { success: false, error: extractRevertReason(error) };
  }
}

/**
 * Run the swap verification scenario
 */
async function verifySwap(
  tokenAddress: Address,
  routerAddress: Address,
  version: string,
  holder: Address
): Promise<VerificationResult> {
  const evidence: string[] = [];
  const tokenOut = COMMON_TOKENS.WETH;
  const amountIn = parseEther("1");

  evidence.push(`Token: ${tokenAddress}`);
  evidence.push(`DEX Router: ${routerAddress}`);
  evidence.push(`Swap path: TOKEN → WETH`);
  evidence.push(`Simulated holder: ${holder}`);

  // Generate calldata based on DEX version
  let calldata: Hex;
  if (version === "v3") {
    calldata = generateV3SwapCalldata(tokenAddress, tokenOut, amountIn, holder);
  } else {
    calldata = generateV2SwapCalldata(tokenAddress, tokenOut, amountIn, holder);
  }

  evidence.push(`Function: ${version === "v3" ? "exactInputSingle" : "swapExactTokensForTokens"}`);

  const result = await simulateCall(holder, routerAddress, calldata);

  if (result.success) {
    return {
      success: true,
      scenario: "swap",
      gasEstimate: result.gasEstimate?.toString(),
      evidence,
    };
  }

  return {
    success: false,
    scenario: "swap",
    revertReason: result.error,
    evidence,
  };
}

/**
 * Run the transferFrom verification scenario
 * Tests if the DEX router (third party) can call transferFrom
 */
async function verifyTransferFrom(
  tokenAddress: Address,
  routerAddress: Address,
  holder: Address
): Promise<VerificationResult> {
  const evidence: string[] = [];
  const recipient = "0x0000000000000000000000000000000000000002" as Address;
  const amount = parseEther("1");

  evidence.push(`Token: ${tokenAddress}`);
  evidence.push(`Caller (Router): ${routerAddress}`);
  evidence.push(`From: ${holder}`);
  evidence.push(`To: ${recipient}`);
  evidence.push(`Scenario: Router calling transferFrom on behalf of user`);

  const calldata = generateTransferFromCalldata(holder, recipient, amount);

  const result = await simulateCall(routerAddress, tokenAddress, calldata);

  if (result.success) {
    return {
      success: true,
      scenario: "transferFrom",
      gasEstimate: result.gasEstimate?.toString(),
      evidence,
    };
  }

  return {
    success: false,
    scenario: "transferFrom",
    revertReason: result.error,
    evidence,
  };
}

/**
 * Run the approve verification scenario
 */
async function verifyApprove(
  tokenAddress: Address,
  routerAddress: Address,
  holder: Address
): Promise<VerificationResult> {
  const evidence: string[] = [];
  const amount = parseEther("1000000");

  evidence.push(`Token: ${tokenAddress}`);
  evidence.push(`Owner: ${holder}`);
  evidence.push(`Spender (Router): ${routerAddress}`);

  const calldata = generateApproveCalldata(routerAddress, amount);

  const result = await simulateCall(holder, tokenAddress, calldata);

  if (result.success) {
    return {
      success: true,
      scenario: "approve",
      gasEstimate: result.gasEstimate?.toString(),
      evidence,
    };
  }

  return {
    success: false,
    scenario: "approve",
    revertReason: result.error,
    evidence,
  };
}

/**
 * Fallback to fork tests when no holder is found for simulation.
 * Maps known token+DEX combinations to existing test patterns.
 */
async function fallbackToForkTest(
  tokenAddress: Address,
  dexName: string
): Promise<string> {
  // Map known tokens to fork test patterns
  const TOKEN_TEST_MAP: Record<string, string> = {
    [COMMON_TOKENS.TON.toLowerCase()]: "test_TON_",
    [COMMON_TOKENS.WTON.toLowerCase()]: "test_WTON_",
  };

  const prefix = TOKEN_TEST_MAP[tokenAddress.toLowerCase()];
  if (!prefix) {
    return [
      `Error: Could not find a token holder for simulation of ${tokenAddress}.`,
      "",
      "**Suggested next step**: Use `run_fork_test` to write and execute a custom Foundry test",
      "that uses `deal()` to mint tokens to a test address before simulating the swap.",
    ].join("\n");
  }

  // Try running matching fork tests
  const testPattern = `${prefix}*`;
  const result = await handleRunForkTest({
    test_pattern: testPattern,
    contract_pattern: "TONCompatibility",
    verbosity: 3,
  });

  return [
    `## Holder Not Found — Fork Test Fallback`,
    "",
    `Could not find an on-chain holder for \`${tokenAddress}\` to simulate against \`${dexName}\`.`,
    `Ran fork tests matching \`${testPattern}\` instead:`,
    "",
    result,
  ].join("\n");
}

/**
 * Format verification results as markdown
 */
function formatResults(
  tokenAddress: string,
  dexName: string,
  results: VerificationResult[]
): string {
  const lines: string[] = [];

  lines.push(`## ${tokenAddress.slice(0, 10)}... × ${dexName} Compatibility`);
  lines.push("");

  const overallSuccess = results.every((r) => r.success);
  lines.push(`### Overall: ${overallSuccess ? "✅ Compatible" : "❌ Incompatible"}`);
  lines.push("");

  for (const result of results) {
    const icon = result.success ? "✅" : "❌";
    lines.push(`### ${icon} ${result.scenario.toUpperCase()}`);
    lines.push("");

    if (result.success) {
      lines.push(`**Result**: Success`);
      if (result.gasEstimate) {
        lines.push(`**Gas estimate**: ${result.gasEstimate}`);
      }
    } else {
      lines.push(`**Result**: REVERTED`);
      lines.push(`**Revert reason**: \`${result.revertReason}\``);
    }

    lines.push("");
    lines.push("**Evidence**:");
    for (const e of result.evidence) {
      lines.push(`- ${e}`);
    }
    lines.push("");
  }

  // Add analysis for known issues
  const transferFromFailed = results.find(
    (r) => r.scenario === "transferFrom" && !r.success
  );
  if (transferFromFailed?.revertReason?.includes("only sender or recipient")) {
    lines.push("---");
    lines.push("### Analysis");
    lines.push("");
    lines.push("This token has a **restricted transferFrom** implementation:");
    lines.push("```solidity");
    lines.push('require(msg.sender == sender || msg.sender == recipient,');
    lines.push('        "SeigToken: only sender or recipient can transfer");');
    lines.push("```");
    lines.push("");
    lines.push("**Impact**: DEX routers (third parties) cannot call `transferFrom` on behalf of users.");
    lines.push("");
    lines.push("**Location**: `contracts/src/TON/TON.sol:1089-1092`");
  }

  return lines.join("\n");
}

/**
 * Main handler for verify_token_compatibility
 */
export async function handleVerifyTokenCompatibility(args: {
  token_address: string;
  router_address: string;
  dex_name: string;
  dex_version?: string;
  scenarios?: string[];
}): Promise<string> {
  // Validate addresses
  const tokenError = validateAddress(args.token_address);
  if (tokenError) return `Error: token_address — ${tokenError}`;

  const routerError = validateAddress(args.router_address);
  if (routerError) return `Error: router_address — ${routerError}`;

  const tokenAddress = args.token_address as Address;
  const routerAddress = args.router_address as Address;
  const version = args.dex_version ?? "v2";

  // Find a token holder for simulation
  const holder = await findTokenHolder(tokenAddress);
  if (!holder) {
    return fallbackToForkTest(tokenAddress, args.dex_name);
  }

  // Determine which scenarios to run
  const allScenarios: VerificationScenario[] = ["approve", "transferFrom", "swap"];
  const scenarios: VerificationScenario[] = args.scenarios
    ? (args.scenarios.filter((s) => allScenarios.includes(s as VerificationScenario)) as VerificationScenario[])
    : allScenarios;

  if (scenarios.length === 0) {
    return `Error: No valid scenarios specified. Available: ${allScenarios.join(", ")}`;
  }

  // Run verifications
  const results: VerificationResult[] = [];

  for (const scenario of scenarios) {
    switch (scenario) {
      case "approve":
        results.push(await verifyApprove(tokenAddress, routerAddress, holder));
        break;
      case "transferFrom":
        results.push(await verifyTransferFrom(tokenAddress, routerAddress, holder));
        break;
      case "swap":
        results.push(await verifySwap(tokenAddress, routerAddress, version, holder));
        break;
    }
  }

  return formatResults(args.token_address, args.dex_name, results);
}

const TOOL_DESCRIPTION = `Verify if a token is compatible with a DEX by simulating approve, transferFrom, and swap on-chain.

BEFORE calling this tool, you MUST:
1. Confirm the DEX exists on Ethereum mainnet (web search)
2. Find the router contract address from official docs or GitHub
3. Determine if it uses V2-style (swapExactTokensForTokens) or V3-style (exactInputSingle) interface

If the DEX does not exist or is not on Ethereum, do NOT call this tool — answer directly.

Returns evidence-based results with revert reasons when incompatible.`;

export function registerVerificationTool(server: McpServer) {
  server.tool(
    "verify_token_compatibility",
    TOOL_DESCRIPTION,
    {
      token_address: z.string().describe("Token contract address (0x...)"),
      router_address: z.string().describe("DEX router contract address (0x...) — discovered by the agent via web search"),
      dex_name: z.string().describe("DEX display name (e.g. 'SushiSwap', 'Uniswap V2')"),
      dex_version: z
        .enum(["v2", "v3"])
        .optional()
        .describe("Router interface version: 'v2' (swapExactTokensForTokens) or 'v3' (exactInputSingle). Defaults to 'v2'."),
      scenarios: z
        .array(z.string())
        .optional()
        .describe("Specific scenarios to test: approve, transferFrom, swap (defaults to all)"),
    },
    async ({ token_address, router_address, dex_name, dex_version, scenarios }) => {
      try {
        const text = await handleVerifyTokenCompatibility({
          token_address,
          router_address,
          dex_name,
          dex_version,
          scenarios,
        });
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
    }
  );
}
