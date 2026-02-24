/**
 * QOC criteria definitions and persona weight profiles.
 *
 * Each agent persona has a weight vector (sum = 100) reflecting their
 * stakeholder perspective. Every criterion gets at least weight 5.
 */

import type { CriterionId } from "./types.ts";

/** Metadata for a single evaluation criterion */
export interface CriterionDef {
  id: CriterionId;
  label: string;
  description: string;
  /** Which MCP tools are relevant for verifying this criterion */
  verificationTools: string[];
  /** What 0 means */
  scoreLow: string;
  /** What 50 means */
  scoreMid: string;
  /** What 100 means */
  scoreHigh: string;
}

/** All 7 evaluation criteria */
export const CRITERIA: CriterionDef[] = [
  {
    id: "techSafety",
    label: "Technical Safety",
    description: "Does the proposal pass simulation/fork testing? Are there revert risks or unexpected side effects?",
    verificationTools: ["run_fork_test", "simulate_transaction", "query_on_chain"],
    scoreLow: "Simulation reverts, critical risks detected",
    scoreMid: "Moderate risks, some concerns",
    scoreHigh: "Fork test passes, LOW risk assessment",
  },
  {
    id: "econImpact",
    label: "Economic Impact",
    description: "How does this affect TON holders, staking yields, treasury, and overall economic value?",
    verificationTools: ["query_on_chain", "read_contract_state"],
    scoreLow: "Yield decrease, treasury drain, value destruction",
    scoreMid: "Neutral trade-offs",
    scoreHigh: "Increased overall ecosystem value",
  },
  {
    id: "govIntegrity",
    label: "Governance Integrity",
    description: "Does this strengthen or weaken decentralization, quorum requirements, and voting fairness?",
    verificationTools: ["query_on_chain", "decode_calldata"],
    scoreLow: "Power concentration, quorum reduction",
    scoreMid: "No governance impact",
    scoreHigh: "Strengthens decentralization",
  },
  {
    id: "opsContinuity",
    label: "Operational Continuity",
    description: "Will staking, deposits, withdrawals, and L2 operations continue functioning normally?",
    verificationTools: ["run_fork_test", "simulate_transaction"],
    scoreLow: "Staking flow disruption",
    scoreMid: "Minor operational friction",
    scoreHigh: "Operational efficiency improved",
  },
  {
    id: "stratAlign",
    label: "Strategic Alignment",
    description: "Does this align with Tokamak Network's roadmap, partnerships, and long-term vision?",
    verificationTools: ["get_contract_info", "read_contract_source"],
    scoreLow: "Contradicts roadmap",
    scoreMid: "Unclear strategic value",
    scoreHigh: "Directly advances roadmap",
  },
  {
    id: "reversibility",
    label: "Reversibility",
    description: "Can this change be undone if problems arise? Is there a rollback path?",
    verificationTools: ["search_contract_code", "decode_calldata"],
    scoreLow: "Irreversible (ownership renounced, no setter)",
    scoreMid: "Reversible via new DAO agenda",
    scoreHigh: "Immediately reversible",
  },
  {
    id: "implQuality",
    label: "Implementation Quality",
    description: "Is the calldata correctly encoded? Is the proposal well-documented and unambiguous?",
    verificationTools: ["decode_calldata"],
    scoreLow: "Cannot decode calldata, unclear intent",
    scoreMid: "Partially documented",
    scoreHigh: "Perfect encoding with full explanation",
  },
];

/** A weight profile for a specific agent persona */
export interface WeightProfile {
  id: string;
  agentName: string;
  stakeholderType: string;
  description: string;
  /** Weights per criterion (must sum to 100, each >= 5) */
  weights: Record<CriterionId, number>;
}

/** The 4 default agent weight profiles */
export const WEIGHT_PROFILES: WeightProfile[] = [
  {
    id: "alpha",
    agentName: "Agent Alpha",
    stakeholderType: "ton_holder",
    description: "TON holder perspective — prioritizes economic impact and strategic alignment",
    weights: {
      techSafety: 15,
      econImpact: 30,
      govIntegrity: 10,
      opsContinuity: 10,
      stratAlign: 20,
      reversibility: 10,
      implQuality: 5,
    },
  },
  {
    id: "beta",
    agentName: "Agent Beta",
    stakeholderType: "layer2_operator",
    description: "L2 operator perspective — prioritizes operational continuity and technical safety",
    weights: {
      techSafety: 25,
      econImpact: 10,
      govIntegrity: 10,
      opsContinuity: 30,
      stratAlign: 5,
      reversibility: 15,
      implQuality: 5,
    },
  },
  {
    id: "gamma",
    agentName: "Agent Gamma",
    stakeholderType: "validator",
    description: "Validator perspective — prioritizes technical safety and governance integrity",
    weights: {
      techSafety: 30,
      econImpact: 15,
      govIntegrity: 20,
      opsContinuity: 10,
      stratAlign: 5,
      reversibility: 15,
      implQuality: 5,
    },
  },
  {
    id: "delta",
    agentName: "Agent Delta",
    stakeholderType: "foundation",
    description: "Foundation perspective — prioritizes strategic alignment and implementation quality",
    weights: {
      techSafety: 10,
      econImpact: 15,
      govIntegrity: 10,
      opsContinuity: 5,
      stratAlign: 35,
      reversibility: 5,
      implQuality: 20,
    },
  },
];

/** Look up a weight profile by profile ID */
export function getProfileById(profileId: string): WeightProfile | undefined {
  return WEIGHT_PROFILES.find((p) => p.id === profileId);
}

/** A criterion-specialist agent definition */
export interface CriterionAgent {
  criterionId: CriterionId;
  agentName: string;
  systemPromptFocus: string;
}

/** 7 criterion agents — each deeply specialized in one evaluation axis */
export const CRITERION_AGENTS: CriterionAgent[] = [
  {
    criterionId: "techSafety",
    agentName: "TechSafety Analyst",
    systemPromptFocus: `You are a smart contract security specialist. Your sole focus is **Technical Safety**.

Analyze the proposal for:
- **Revert risks**: Will any function calls revert? Check transferFrom restrictions, permission checks, reentrancy guards.
- **Fork test implications**: If this were tested via Foundry fork test against mainnet state, what would happen?
- **Side effects**: Storage collisions in proxy upgrades, unexpected state changes in connected contracts (SeigManager, DepositManager, etc.)
- **Attack surface**: Can this be front-run, sandwiched, or exploited via flash loans?
- **Compatibility**: Does the proposal interact with contracts that have non-standard behavior (e.g., TON's transferFrom restriction)?

Reference specific contract addresses, function selectors, and storage slots in your evidence.`,
  },
  {
    criterionId: "econImpact",
    agentName: "Economic Analyst",
    systemPromptFocus: `You are a token economics specialist. Your sole focus is **Economic Impact**.

Analyze the proposal for:
- **Staking yield impact**: How does this affect seigniorage distribution, commission rates, or staking incentives?
- **Treasury effects**: Any fund movements, minting, burning, or fee parameter changes?
- **TON/WTON price implications**: Does this affect token supply, liquidity, or market dynamics?
- **Holder dilution**: Any changes to total supply, reward rates, or vesting schedules?
- **SeigManager parameters**: Changes to powerTON rate, seigniorage per block, minimum stake amounts?

Quantify impacts where possible (e.g., "reduces staking yield by ~X%").`,
  },
  {
    criterionId: "govIntegrity",
    agentName: "Governance Analyst",
    systemPromptFocus: `You are a DAO governance specialist. Your sole focus is **Governance Integrity**.

Analyze the proposal for:
- **Power concentration**: Does this give any single entity disproportionate control?
- **Quorum/voting changes**: Any modifications to quorum requirements, voting periods, or thresholds?
- **Committee composition**: Changes to DAOCommittee member requirements, election mechanisms, or removal processes?
- **Transparency**: Is the proposal's intent clearly stated? Are there hidden effects in the calldata?
- **Precedent**: Does this set a governance precedent that could be exploited later?

Reference DAOCommittee proxy routing, selector mappings, and governance parameter storage slots.`,
  },
  {
    criterionId: "opsContinuity",
    agentName: "Operations Analyst",
    systemPromptFocus: `You are an infrastructure operations specialist. Your sole focus is **Operational Continuity**.

Analyze the proposal for:
- **Staking flow**: Will deposit → stake → unstake → withdraw continue functioning?
- **L2 operations**: Impact on Layer2 registration, operator management, bridge operations?
- **Contract interactions**: Will DepositManager, SeigManager, PowerTON, and related contracts continue interoperating correctly?
- **Migration path**: If this is an upgrade, is there a clean migration path? Downtime risk?
- **Dependency chain**: Does this break any contract that depends on the modified contract?

Test specific call paths (e.g., TON.approveAndCall → WTON.onApprove → DepositManager.onDeposit).`,
  },
  {
    criterionId: "stratAlign",
    agentName: "Strategy Analyst",
    systemPromptFocus: `You are a Tokamak Network strategy specialist. Your sole focus is **Strategic Alignment**.

Analyze the proposal for:
- **Roadmap alignment**: Does this advance Tokamak's L2 infrastructure, Titan network, or DeFi ecosystem goals?
- **Partnership impact**: How does this affect existing integrations, partnerships, or cross-chain strategies?
- **Ecosystem growth**: Does this attract new developers, users, or capital to the ecosystem?
- **Competitive positioning**: How does this position Tokamak relative to other L2/rollup solutions?
- **Long-term vision**: Does this support or hinder the transition to a fully decentralized L2 platform?

Consider the broader context of Tokamak's mission and existing governance decisions.`,
  },
  {
    criterionId: "reversibility",
    agentName: "Reversibility Analyst",
    systemPromptFocus: `You are a smart contract upgrade and rollback specialist. Your sole focus is **Reversibility**.

Analyze the proposal for:
- **Rollback capability**: Can this change be undone via a subsequent DAO proposal?
- **Setter functions**: Are there admin/setter functions to revert changed parameters?
- **Proxy upgrade path**: If this upgrades an implementation, can the old implementation be restored?
- **State irreversibility**: Does this destroy state, renounce ownership, or burn tokens that cannot be recovered?
- **Time-lock**: Is there a delay mechanism allowing intervention before execution?

Check for: selfdestruct, renounceOwnership, irreversible storage writes, one-way state transitions.`,
  },
  {
    criterionId: "implQuality",
    agentName: "Implementation Analyst",
    systemPromptFocus: `You are a calldata and proposal implementation specialist. Your sole focus is **Implementation Quality**.

Analyze the proposal for:
- **Calldata correctness**: Is the encoded calldata valid? Do function selectors match the intended functions?
- **Parameter accuracy**: Are addresses, amounts, and other parameters correct and properly formatted?
- **Documentation**: Is the proposal clearly described? Are the intended effects documented?
- **Target contract**: Is the target contract address correct? Is it the proxy or implementation?
- **Execution context**: Will the call be executed via DAOCommittee's execute function? Is msg.sender correct?

Decode the calldata and verify each parameter against the target contract's ABI.`,
  },
];
