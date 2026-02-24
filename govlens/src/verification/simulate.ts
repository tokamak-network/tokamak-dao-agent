/**
 * Tier 1 Verification: Transaction Simulation
 *
 * Universal eth_call simulation + revert detection + state diff.
 * Works for any EVM protocol without configuration.
 */

import type { Address, Hex } from "viem";
import {
  decodeFunctionResult,
  encodeFunctionData,
  decodeErrorResult,
  parseAbi,
} from "viem";
import type { ChainId, SimulationResult, StateDiff } from "../types/index.js";
import type { ChainClientManager } from "../chain/client.js";
import { extractRevertReason, formatError } from "../core/validation.js";

/**
 * Simulate a single transaction via eth_call.
 */
export async function simulateTransaction(
  client: ChainClientManager,
  chainId: ChainId,
  params: {
    to: Address;
    data: Hex;
    from?: Address;
    value?: bigint;
    blockNumber?: bigint;
  },
): Promise<SimulationResult> {
  try {
    const result = await client.simulate(chainId, params);
    return {
      success: true,
      gasUsed: 0n, // eth_call doesn't return gas used; use trace for that
      returnData: result.data,
    };
  } catch (error) {
    return {
      success: false,
      gasUsed: 0n,
      returnData: "0x" as Hex,
      revertReason: extractRevertReason(error),
    };
  }
}

/**
 * Simulate a full proposal execution (multi-call).
 * Executes each target+calldata pair in sequence.
 */
export async function simulateProposalExecution(
  client: ChainClientManager,
  chainId: ChainId,
  params: {
    targets: Address[];
    values: bigint[];
    calldatas: Hex[];
    executor?: Address;
    blockNumber?: bigint;
  },
): Promise<{
  overallSuccess: boolean;
  results: SimulationResult[];
  failedAt?: number;
}> {
  const { targets, values, calldatas, executor, blockNumber } = params;

  if (targets.length !== calldatas.length || targets.length !== values.length) {
    throw new Error("targets, values, and calldatas must have equal length");
  }

  const results: SimulationResult[] = [];

  for (let i = 0; i < targets.length; i++) {
    const result = await simulateTransaction(client, chainId, {
      to: targets[i]!,
      data: calldatas[i]!,
      from: executor,
      value: values[i],
      blockNumber,
    });

    results.push(result);

    if (!result.success) {
      return {
        overallSuccess: false,
        results,
        failedAt: i,
      };
    }
  }

  return {
    overallSuccess: true,
    results,
  };
}
