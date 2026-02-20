/**
 * Generate Ethereum wallets for the 4 core DAO agents.
 * Outputs .env-formatted lines to stdout.
 *
 * Usage: bun run scripts/generate-agent-wallets.ts >> .env
 */

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const AGENTS = ["ALPHA", "BETA", "GAMMA", "DELTA"] as const;

console.log("\n# Agent Wallets (generated)");
for (const name of AGENTS) {
  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);
  console.log(`AGENT_${name}_PK=${pk}  # ${account.address}`);
}
