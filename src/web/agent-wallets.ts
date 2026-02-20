/**
 * Server-only module: derives Ethereum addresses from agent private keys
 * stored in environment variables. Private keys never leave this module.
 */

import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { Hex } from "viem";

const AGENT_IDS = ["alpha", "beta", "gamma", "delta"] as const;
type AgentId = (typeof AGENT_IDS)[number];

const PK_RE = /^0x[0-9a-fA-F]{64}$/;

const accounts = new Map<AgentId, PrivateKeyAccount>();

/** Load private keys from env and derive accounts. Call once at server start. */
export function initAgentWallets(): void {
  for (const id of AGENT_IDS) {
    const envKey = `AGENT_${id.toUpperCase()}_PK`;
    const pk = process.env[envKey];
    if (!pk) continue;
    if (!PK_RE.test(pk)) {
      console.warn(`[wallets] ${envKey} has invalid format, skipping`);
      continue;
    }
    accounts.set(id, privateKeyToAccount(pk as Hex));
  }

  const loaded = AGENT_IDS.filter((id) => accounts.has(id));
  if (loaded.length > 0) {
    console.log(
      `[wallets] Loaded ${loaded.length} agent wallets:`,
      loaded.map((id) => `${id}=${accounts.get(id)!.address}`).join(", "),
    );
  } else {
    console.log("[wallets] No agent wallets configured (set AGENT_*_PK in .env)");
  }
}

/** Returns address map: `{ alpha: "0x..." | null, ... }` */
export function getAgentAddresses(): Record<AgentId, string | null> {
  const result = {} as Record<AgentId, string | null>;
  for (const id of AGENT_IDS) {
    result[id] = accounts.get(id)?.address ?? null;
  }
  return result;
}

/** Get a single agent's address, or null if not configured. */
export function getAgentAddress(id: string): string | null {
  return accounts.get(id as AgentId)?.address ?? null;
}

/** Check whether a wallet is loaded for the given agent id. */
export function hasWallet(id: string): boolean {
  return accounts.has(id as AgentId);
}

/** Sign a message with the agent's key (EIP-191 personal_sign). */
export async function signAgentMessage(
  id: string,
  message: string,
): Promise<Hex> {
  const account = accounts.get(id as AgentId);
  if (!account) throw new Error(`No wallet configured for agent "${id}"`);
  return account.signMessage({ message });
}
