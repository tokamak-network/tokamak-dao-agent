/**
 * Multi-Chain Client
 *
 * Manages viem public clients for supported chains.
 * Each chain gets a single shared client instance.
 */

import {
  createPublicClient,
  http,
  type PublicClient,
  type Transport,
  type Chain,
  type Address,
  type Hex,
} from "viem";
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
} from "viem/chains";
import type { ChainId, SupportedChain } from "../types/index.js";

// ─── Chain Registry ──────────────────────────────────────────

const CHAIN_CONFIGS: Record<SupportedChain, Chain> = {
  ethereum: mainnet,
  arbitrum: arbitrum,
  optimism: optimism,
  base: base,
  polygon: polygon,
};

const CHAIN_ID_TO_NAME: Record<number, SupportedChain> = {
  1: "ethereum",
  42161: "arbitrum",
  10: "optimism",
  8453: "base",
  137: "polygon",
};

// ─── RPC Configuration ───────────────────────────────────────

export interface ChainRpcConfig {
  ethereum?: string;
  arbitrum?: string;
  optimism?: string;
  base?: string;
  polygon?: string;
}

function getRpcUrl(chain: SupportedChain, config: ChainRpcConfig): string {
  const url = config[chain];
  if (url) return url;
  // Fallback to public RPC (rate-limited, for dev only)
  const publicRpcs: Record<SupportedChain, string> = {
    ethereum: "https://eth.llamarpc.com",
    arbitrum: "https://arb1.arbitrum.io/rpc",
    optimism: "https://mainnet.optimism.io",
    base: "https://mainnet.base.org",
    polygon: "https://polygon-rpc.com",
  };
  return publicRpcs[chain];
}

// ─── Client Manager ──────────────────────────────────────────

export class ChainClientManager {
  private clients = new Map<SupportedChain, PublicClient>();
  private rpcConfig: ChainRpcConfig;

  constructor(rpcConfig: ChainRpcConfig) {
    this.rpcConfig = rpcConfig;
  }

  /**
   * Get or create a public client for a chain.
   */
  getClient(chainId: ChainId): PublicClient {
    const chainName = CHAIN_ID_TO_NAME[chainId];
    if (!chainName) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const existing = this.clients.get(chainName);
    if (existing) return existing;

    const chain = CHAIN_CONFIGS[chainName];
    const rpcUrl = getRpcUrl(chainName, this.rpcConfig);

    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    this.clients.set(chainName, client as PublicClient);
    return client as PublicClient;
  }

  /**
   * Convenience: call a view function on any chain.
   */
  async readContract(
    chainId: ChainId,
    params: {
      address: Address;
      abi: unknown[];
      functionName: string;
      args?: unknown[];
    },
  ): Promise<unknown> {
    const client = this.getClient(chainId);
    return client.readContract(params as any);
  }

  /**
   * Simulate a transaction via eth_call.
   */
  async simulate(
    chainId: ChainId,
    params: {
      to: Address;
      data: Hex;
      from?: Address;
      value?: bigint;
      blockNumber?: bigint;
    },
  ): Promise<{ data: Hex }> {
    const client = this.getClient(chainId);
    const result = await client.call({
      to: params.to,
      data: params.data,
      account: params.from,
      value: params.value,
      blockNumber: params.blockNumber,
    });
    return { data: (result.data ?? "0x") as Hex };
  }

  /**
   * Get bytecode at an address (to check if contract exists).
   */
  async getBytecode(
    chainId: ChainId,
    address: Address,
  ): Promise<Hex | undefined> {
    const client = this.getClient(chainId);
    return client.getCode({ address });
  }

  /**
   * Check if an address is a contract.
   */
  async isContract(chainId: ChainId, address: Address): Promise<boolean> {
    const code = await this.getBytecode(chainId, address);
    return !!code && code !== "0x";
  }

  /**
   * Read a raw storage slot.
   */
  async getStorageAt(
    chainId: ChainId,
    address: Address,
    slot: Hex,
  ): Promise<Hex> {
    const client = this.getClient(chainId);
    const result = await client.getStorageAt({ address, slot });
    return (result ?? "0x0") as Hex;
  }

  /**
   * Get the chain name for a chain ID.
   */
  getChainName(chainId: ChainId): SupportedChain | undefined {
    return CHAIN_ID_TO_NAME[chainId];
  }

  /**
   * List all supported chain IDs.
   */
  getSupportedChainIds(): ChainId[] {
    return Object.keys(CHAIN_ID_TO_NAME).map(Number);
  }
}

// ─── Singleton (lazy init from env) ──────────────────────────

let _manager: ChainClientManager | null = null;

export function getChainManager(): ChainClientManager {
  if (!_manager) {
    _manager = new ChainClientManager({
      ethereum: process.env.ETHEREUM_RPC_URL ?? process.env.ALCHEMY_RPC_URL,
      arbitrum: process.env.ARBITRUM_RPC_URL,
      optimism: process.env.OPTIMISM_RPC_URL,
      base: process.env.BASE_RPC_URL,
      polygon: process.env.POLYGON_RPC_URL,
    });
  }
  return _manager;
}
