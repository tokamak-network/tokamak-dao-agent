/**
 * Shared viem PublicClient for on-chain queries
 */

import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const RPC_URL = process.env.ALCHEMY_RPC_URL || "http://127.0.0.1:8545";

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL),
});
