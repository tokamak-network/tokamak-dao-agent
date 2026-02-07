/**
 * verify_token_compatibility tool - Test token compatibility with DEX protocols
 *
 * Generates swap calldata, simulates via eth_call, and returns evidence-based results.
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
  DEX_PROTOCOLS,
  getDexProtocol,
  getAvailableDexProtocols,
  COMMON_TOKENS,
  ERC20_ABI,
  type DexProtocol,
} from "../data/dex-protocols.ts";
import { validateAddress } from "./validation.ts";

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
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

  return encodeFunctionData({
    abi: DEX_PROTOCOLS.uniswap_v2.swapAbi,
    functionName: "swapExactTokensForTokens",
    args: [amountIn, 0n, [tokenIn, tokenOut], recipient, deadline],
  });
}

/**
 * Generate swap calldata for Uniswap V3
 */
function generateV3SwapCalldata(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  recipient: Address
): Hex {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  return encodeFunctionData({
    abi: DEX_PROTOCOLS.uniswap_v3.swapAbi,
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
 * Extract revert reason from error message
 */
function extractRevertReason(error: any): string {
  const message = error instanceof Error ? error.message : String(error);

  // Try to extract reason string
  const reasonMatch = message.match(/reverted with reason string ['"]([^'"]+)['"]/);
  if (reasonMatch) return reasonMatch[1]!;

  // Try custom error
  const customMatch = message.match(/reverted with custom error ['"]([^'"]+)['"]/);
  if (customMatch) return `Custom error: ${customMatch[1]}`;

  // Fallback to truncated message
  if (message.includes("execution reverted")) {
    return message.slice(0, 300);
  }

  return message.slice(0, 200);
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
    // First try gas estimation (provides better error messages)
    const gasEstimate = await publicClient.estimateGas({
      account: from,
      to,
      data,
      value,
    });

    // Then do the actual call
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
  dex: DexProtocol,
  holder: Address
): Promise<VerificationResult> {
  const evidence: string[] = [];
  const tokenOut = COMMON_TOKENS.WETH;
  const amountIn = parseEther("1"); // 1 token

  evidence.push(`Token: ${tokenAddress}`);
  evidence.push(`DEX Router: ${dex.routerAddress}`);
  evidence.push(`Swap path: TOKEN → WETH`);
  evidence.push(`Simulated holder: ${holder}`);

  // Generate calldata based on DEX version
  let calldata: Hex;
  if (dex.version === "v3") {
    calldata = generateV3SwapCalldata(tokenAddress, tokenOut, amountIn, holder);
  } else {
    calldata = generateV2SwapCalldata(tokenAddress, tokenOut, amountIn, holder);
  }

  evidence.push(`Function: ${dex.version === "v3" ? "exactInputSingle" : "swapExactTokensForTokens"}`);

  // Simulate the swap (called by router, transferFrom from holder)
  const result = await simulateCall(holder, dex.routerAddress, calldata);

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
 * Tests if a third party (like a DEX router) can call transferFrom
 */
async function verifyTransferFrom(
  tokenAddress: Address,
  holder: Address
): Promise<VerificationResult> {
  const evidence: string[] = [];
  const router = DEX_PROTOCOLS.uniswap_v2.routerAddress;
  const recipient = "0x0000000000000000000000000000000000000002" as Address;
  const amount = parseEther("1");

  evidence.push(`Token: ${tokenAddress}`);
  evidence.push(`Caller (Router): ${router}`);
  evidence.push(`From: ${holder}`);
  evidence.push(`To: ${recipient}`);
  evidence.push(`Scenario: Router calling transferFrom on behalf of user`);

  const calldata = generateTransferFromCalldata(holder, recipient, amount);

  // Simulate router calling transferFrom (third-party transfer)
  const result = await simulateCall(router, tokenAddress, calldata);

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
  holder: Address
): Promise<VerificationResult> {
  const evidence: string[] = [];
  const spender = DEX_PROTOCOLS.uniswap_v2.routerAddress;
  const amount = parseEther("1000000"); // Large approval

  evidence.push(`Token: ${tokenAddress}`);
  evidence.push(`Owner: ${holder}`);
  evidence.push(`Spender (Router): ${spender}`);

  const calldata = generateApproveCalldata(spender, amount);

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
  dex: string;
  scenarios?: string[];
}): Promise<string> {
  // Validate token address
  const addrError = validateAddress(args.token_address);
  if (addrError) {
    return `Error: ${addrError}`;
  }

  // Get DEX protocol
  const dex = getDexProtocol(args.dex);
  if (!dex) {
    return `Error: Unknown DEX "${args.dex}". Available: ${getAvailableDexProtocols().join(", ")}`;
  }

  const tokenAddress = args.token_address as Address;

  // Find a token holder for simulation
  const holder = await findTokenHolder(tokenAddress);
  if (!holder) {
    return `Error: Could not find a token holder for simulation`;
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
        results.push(await verifyApprove(tokenAddress, holder));
        break;
      case "transferFrom":
        results.push(await verifyTransferFrom(tokenAddress, holder));
        break;
      case "swap":
        results.push(await verifySwap(tokenAddress, dex, holder));
        break;
    }
  }

  return formatResults(args.token_address, dex.name, results);
}

export function registerVerificationTool(server: McpServer) {
  server.tool(
    "verify_token_compatibility",
    "Verify if a token is compatible with a DEX protocol by simulating swaps. Returns evidence-based results showing success or failure with revert reasons.",
    {
      token_address: z.string().describe("Token contract address (0x...)"),
      dex: z.string().describe("DEX protocol key: uniswap_v2, uniswap_v3, sushiswap"),
      scenarios: z
        .array(z.string())
        .optional()
        .describe("Specific scenarios to test: approve, transferFrom, swap (defaults to all)"),
    },
    async ({ token_address, dex, scenarios }) => {
      try {
        const text = await handleVerifyTokenCompatibility({ token_address, dex, scenarios });
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
