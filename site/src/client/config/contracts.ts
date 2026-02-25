import {
  registryAbi,
  delegationAbi,
  rationaleAbi,
  credibilityAbi,
  resolverAbi,
  govDelegationAbi,
  governorAbi,
  tokenAbi,
} from "./abis";
import deployed from "../../../../contracts/deployed/sepolia.json";

type Address = `0x${string}`;

function addr(key: keyof typeof deployed.contracts): Address {
  const a = deployed.contracts[key];
  if (!a) return "0x0000000000000000000000000000000000000000";
  return a as Address;
}

export const CONTRACTS = {
  token: { address: addr("MockERC20Votes"), abi: tokenAbi },
  governor: { address: addr("MockGovernor"), abi: governorAbi },
  registry: { address: addr("AgentRegistry"), abi: registryAbi },
  delegation: { address: addr("AgentDelegation"), abi: delegationAbi },
  rationale: { address: addr("RationaleCommitment"), abi: rationaleAbi },
  resolver: { address: addr("GovernorResolver"), abi: resolverAbi },
  credibility: { address: addr("CredibilityRegistry"), abi: credibilityAbi },
  govDelegation: { address: addr("GovernorAgentDelegation"), abi: govDelegationAbi },
} as const;

export const CHAIN_ID = deployed.chainId;
export const CONFIG = deployed.config;
