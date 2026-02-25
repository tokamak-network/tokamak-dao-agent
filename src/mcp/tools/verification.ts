/**
 * test_token_transfer tool - Test if a third-party contract can transferFrom a token
 *
 * Supports both known DEX registry lookup (via `dex` param) and arbitrary
 * router addresses (via `router_address` param) for dynamic DEX discovery.
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
import { validateAddress, extractRevertReason } from "./validation.ts";

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
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Find a real token holder by checking known contract addresses on-chain.
 * Iterates through candidate addresses and returns the first one with a non-zero balance.
 *
 * Strategy:
 * 1. Try token-specific known holders first (fast path)
 * 2. Fall back to general Tokamak ecosystem contracts that often hold tokens
 */
async function findTokenHolder(tokenAddress: Address): Promise<Address | null> {
  // Token-specific known holders (fast path)
  const TOKEN_SPECIFIC_HOLDERS: Record<string, Address[]> = {
    [COMMON_TOKENS.TON.toLowerCase()]: [
      "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303" as Address, // DAOVault
      "0x30e65B3A6e6868F044944Aa0e9C5d52F8dcb138d" as Address, // SwapProxy (TON<>WTON)
    ],
    [COMMON_TOKENS.WTON.toLowerCase()]: [
      "0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e" as Address, // DepositManagerProxy
      "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303" as Address, // DAOVault
    ],
  };

  // General fallback: Tokamak ecosystem contracts that may hold various tokens
  const GENERAL_FALLBACK_HOLDERS: Address[] = [
    "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303" as Address, // DAOVault
    "0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e" as Address, // DepositManagerProxy
    "0x970298189050aBd4dc4F119ccae14ee145ad9371" as Address, // PowerTONSwapperProxy
    "0x0b55a0f463b6defb81c6063973763951712d0e5f" as Address, // SeigManagerProxy
    "0xE3F72E959834d0A72aFb2ea79F5ec2b4243d2d95" as Address, // MultiSigWallet
    "0x30e65B3A6e6868F044944Aa0e9C5d52F8dcb138d" as Address, // SwapProxy
  ];

  // Try token-specific holders first
  const specificCandidates = TOKEN_SPECIFIC_HOLDERS[tokenAddress.toLowerCase()] || [];
  for (const candidate of specificCandidates) {
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

  // Fallback: try general ecosystem contracts
  for (const candidate of GENERAL_FALLBACK_HOLDERS) {
    // Skip if already tried in specific list
    if (specificCandidates.some((c) => c.toLowerCase() === candidate.toLowerCase())) continue;
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
    abi: DEX_PROTOCOLS.uniswap_v2!.swapAbi,
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
    abi: DEX_PROTOCOLS.uniswap_v3!.swapAbi,
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
  evidence.push(`Swap path: TOKEN -> WETH`);
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

  // Simulate router calling transferFrom (third-party transfer)
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
  const amount = parseEther("1000000"); // Large approval

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
 * Format verification results as markdown
 */
function formatResults(
  tokenAddress: string,
  dexName: string,
  results: VerificationResult[]
): string {
  const lines: string[] = [];

  lines.push(`## ${tokenAddress.slice(0, 10)}... x ${dexName} Compatibility`);
  lines.push("");

  const nonSkipped = results.filter((r) => !r.skipped);
  const overallSuccess = nonSkipped.length > 0 && nonSkipped.every((r) => r.success);
  lines.push(`### Overall: ${overallSuccess ? "Compatible" : "Incompatible"}`);
  lines.push("");

  for (const result of results) {
    if (result.skipped) {
      lines.push(`### -- ${result.scenario.toUpperCase()} (skipped)`);
      lines.push("");
      lines.push(`**Reason**: ${result.skipReason}`);
      lines.push("");
      continue;
    }

    const icon = result.success ? "PASS" : "FAIL";
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
    lines.push("This restriction applies to ALL DEXes, not just this one.");
    lines.push("");
    lines.push("**Location**: `contracts/src/TON/TON.sol:1089-1092`");
  }

  return lines.join("\n");
}

/**
 * Verify that an address has contract bytecode deployed.
 */
async function verifyContractExists(address: Address): Promise<{ exists: boolean; error?: string }> {
  try {
    const code = await publicClient.getCode({ address });
    if (!code || code === "0x") {
      return { exists: false, error: `${address} is not a contract (no bytecode). Verify the address.` };
    }
    return { exists: true };
  } catch (error) {
    return { exists: false, error: `Failed to check bytecode at ${address}: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Main handler for test_token_transfer
 */
export async function handleTestTokenTransfer(args: {
  token_address: string;
  dex?: string;
  router_address?: string;
  router_label?: string;
  scenarios?: string[];
}): Promise<string> {
  // Validate token address
  const addrError = validateAddress(args.token_address);
  if (addrError) {
    return `Error: ${addrError}`;
  }

  // Must have either dex or router_address
  if (!args.dex && !args.router_address) {
    return `Error: Either 'dex' or 'router_address' is required.\n\nKnown DEX keys: ${getAvailableDexProtocols().join(", ")}\n\nOr provide any DEX router/vault/settlement address via 'router_address'.`;
  }

  // Resolve the router address and display name
  let routerAddress: Address;
  let dexName: string;
  let dexProtocol: DexProtocol | undefined;

  if (args.dex) {
    // Known DEX registry lookup
    dexProtocol = getDexProtocol(args.dex);
    if (!dexProtocol) {
      return `Error: Unknown DEX "${args.dex}". Available: ${getAvailableDexProtocols().join(", ")}\n\nTip: For unlisted DEXes, use 'router_address' instead.`;
    }
    routerAddress = dexProtocol.routerAddress as Address;
    dexName = dexProtocol.name;
  } else {
    // Dynamic router_address mode
    const routerAddrError = validateAddress(args.router_address!);
    if (routerAddrError) {
      return `Error (router_address): ${routerAddrError}`;
    }
    routerAddress = args.router_address as Address;
    dexName = args.router_label || `Custom (${routerAddress.slice(0, 10)}...)`;
  }

  // Verify router is a contract (not an EOA)
  const contractCheck = await verifyContractExists(routerAddress);
  if (!contractCheck.exists) {
    return `Error: ${contractCheck.error}`;
  }

  const tokenAddress = args.token_address as Address;

  // Find a token holder for simulation
  const holder = await findTokenHolder(tokenAddress);
  if (!holder) {
    return [
      `Error: Could not find a token holder for \`${tokenAddress}\`.`,
      "",
      "None of the known ecosystem contracts hold this token.",
      "Possible causes:",
      "- **Wrong token address** — use `get_contract_info` to look up the correct address",
      `- Known TON address: \`${COMMON_TOKENS.TON}\``,
      `- Known WTON address: \`${COMMON_TOKENS.WTON}\``,
      "- The token is not part of the Tokamak ecosystem",
    ].join("\n");
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
        if (dexProtocol) {
          // Known DEX — we have the ABI to generate swap calldata
          results.push(await verifySwap(tokenAddress, dexProtocol, holder));
        } else {
          // Unknown DEX — cannot generate swap calldata without ABI
          results.push({
            success: false,
            scenario: "swap",
            skipped: true,
            skipReason: "Swap test skipped — unknown DEX ABI. Only approve and transferFrom can be tested with a raw router address. The transferFrom result is the key indicator of DEX compatibility.",
            evidence: [`Router: ${routerAddress}`, "No swap ABI available for this router"],
          });
        }
        break;
    }
  }

  return formatResults(args.token_address, dexName, results);
}

export function registerVerificationTool(server: McpServer) {
  server.tool(
    "test_token_transfer",
    "Test if a token's transferFrom works with a DEX router/vault. Simulates approve, transferFrom, and swap. Supports known DEXes (via 'dex') or any arbitrary router address (via 'router_address').",
    {
      token_address: z.string().describe("Token contract address (0x...)"),
      dex: z
        .string()
        .optional()
        .describe("Known DEX protocol key: uniswap_v2, uniswap_v3, sushiswap, cowswap. Either 'dex' or 'router_address' is required."),
      router_address: z
        .string()
        .optional()
        .describe("Any DEX router/vault/settlement contract address (0x...). Use this for DEXes not in the known registry."),
      router_label: z
        .string()
        .optional()
        .describe("Human-readable name for the router (e.g. 'Balancer Vault'). Used in output display."),
      scenarios: z
        .array(z.string())
        .optional()
        .describe("Specific scenarios to test: approve, transferFrom, swap (defaults to all)"),
    },
    async ({ token_address, dex, router_address, router_label, scenarios }) => {
      try {
        const text = await handleTestTokenTransfer({ token_address, dex, router_address, router_label, scenarios });
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
