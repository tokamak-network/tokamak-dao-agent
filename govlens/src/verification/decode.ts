/**
 * Calldata Decoding
 *
 * Decodes transaction calldata using known ABI fragments.
 * Supports both 4-byte selector lookup and full ABI decoding.
 */

import type { Hex } from "viem";
import { decodeFunctionData, parseAbi } from "viem";
import type { CalldataDecoded } from "../types/index.js";

// ─── Common Governance Function Signatures ───────────────────

const COMMON_SIGNATURES: Record<string, string> = {
  // ERC20
  "0xa9059cbb": "function transfer(address to, uint256 amount)",
  "0x095ea7b3": "function approve(address spender, uint256 amount)",
  "0x23b872dd": "function transferFrom(address from, address to, uint256 amount)",
  // Governor
  "0x7d5e81e2": "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description)",
  "0x2656227d": "function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash)",
  "0x2ea295f9": "function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash)",
  "0x56781388": "function castVote(uint256 proposalId, uint8 support)",
  "0x7b3c71d3": "function castVoteWithReason(uint256 proposalId, uint8 support, string reason)",
  // Timelock
  "0x01d5062a": "function schedule(address target, uint256 value, bytes data, bytes32 predecessor, bytes32 salt, uint256 delay)",
  "0x134008d3": "function execute(address target, uint256 value, bytes payload, bytes32 predecessor, bytes32 salt)",
  // Access Control
  "0x2f2ff15d": "function grantRole(bytes32 role, address account)",
  "0xd547741f": "function revokeRole(bytes32 role, address account)",
  // Proxy
  "0x3659cfe6": "function upgradeTo(address newImplementation)",
  "0x4f1ef286": "function upgradeToAndCall(address newImplementation, bytes data)",
  // Common
  "0x8da5cb5b": "function owner() view returns (address)",
  "0xf2fde38b": "function transferOwnership(address newOwner)",
};

/**
 * Attempt to decode calldata using common signatures.
 */
export function decodeCalldata(data: Hex): CalldataDecoded | null {
  if (!data || data === "0x" || data.length < 10) return null;

  const selector = data.slice(0, 10).toLowerCase();
  const signature = COMMON_SIGNATURES[selector];

  if (!signature) {
    return {
      functionName: `unknown_${selector}`,
      args: { raw: data },
      signature: selector,
    };
  }

  try {
    const abi = parseAbi([signature]);
    const decoded = decodeFunctionData({ abi, data });

    const args: Record<string, unknown> = {};
    if (decoded.args) {
      for (let i = 0; i < decoded.args.length; i++) {
        const value = decoded.args[i];
        args[`arg${i}`] = typeof value === "bigint" ? value.toString() : value;
      }
    }

    return {
      functionName: decoded.functionName,
      args,
      signature,
    };
  } catch {
    return {
      functionName: `parse_error_${selector}`,
      args: { raw: data },
      signature: selector,
    };
  }
}

/**
 * Decode calldata using a specific ABI.
 */
export function decodeCalldataWithAbi(
  data: Hex,
  abi: unknown[],
): CalldataDecoded | null {
  if (!data || data === "0x" || data.length < 10) return null;

  try {
    const decoded = decodeFunctionData({ abi: abi as any, data });

    const args: Record<string, unknown> = {};
    if (decoded.args) {
      for (let i = 0; i < decoded.args.length; i++) {
        const value = decoded.args[i];
        args[`arg${i}`] = typeof value === "bigint" ? value.toString() : value;
      }
    }

    return {
      functionName: decoded.functionName,
      args,
      signature: data.slice(0, 10),
    };
  } catch {
    // Fall back to common signature decode
    return decodeCalldata(data);
  }
}

/**
 * Decode all calldatas in a proposal.
 */
export function decodeProposalCalldatas(
  calldatas: Hex[],
  abi?: unknown[],
): Array<CalldataDecoded | null> {
  return calldatas.map((data) =>
    abi ? decodeCalldataWithAbi(data, abi) : decodeCalldata(data),
  );
}
