/**
 * Default QOC Configuration
 *
 * Universal criteria and stakeholder lenses that work for any DAO.
 * Tenants can override or extend these defaults.
 */

import type {
  CriterionDef,
  WeightProfile,
  CriterionAgentConfig,
  VerdictThresholds,
  HardVetoRule,
  OutcomeMapping,
} from "../types/index.js";

// ─── 7 Universal Criteria ────────────────────────────────────

export const DEFAULT_CRITERIA: CriterionDef[] = [
  {
    id: "techSafety",
    label: "Technical Safety",
    description:
      "Smart contract security, upgrade safety, and technical risk assessment",
    scoreLow:
      "Simulation reverts, unverified contracts, known vulnerabilities detected",
    scoreMid:
      "Some risks identified but mitigated, partial test coverage, minor concerns",
    scoreHigh:
      "All simulations pass, contracts verified and audited, comprehensive test coverage",
  },
  {
    id: "econImpact",
    label: "Economic Impact",
    description:
      "Treasury effects, token economics, liquidity implications, and financial risk",
    scoreLow:
      "Severe treasury drain, token dilution without value capture, liquidity crisis risk",
    scoreMid:
      "Moderate cost with unclear ROI, some economic tradeoffs, manageable risk",
    scoreHigh:
      "Net positive treasury impact, value-accretive tokenomics, well-modeled outcomes",
  },
  {
    id: "govIntegrity",
    label: "Governance Integrity",
    description:
      "Decentralization effects, power concentration risks, process adherence",
    scoreLow:
      "Centralizes power, bypasses governance process, reduces voter agency",
    scoreMid:
      "Neutral governance impact, standard process followed, minor concentration concerns",
    scoreHigh:
      "Enhances decentralization, exemplary process, increases participation incentives",
  },
  {
    id: "opsContinuity",
    label: "Operational Continuity",
    description:
      "Protocol uptime, migration risk, dependency management, backward compatibility",
    scoreLow:
      "High downtime risk, breaking changes without migration path, critical dependencies",
    scoreMid:
      "Some operational disruption expected, migration plan exists but untested",
    scoreHigh:
      "Zero downtime path, backward compatible, graceful degradation, tested migration",
  },
  {
    id: "stratAlign",
    label: "Strategic Alignment",
    description:
      "Alignment with protocol roadmap, ecosystem positioning, long-term vision",
    scoreLow:
      "Contradicts stated roadmap, harms ecosystem positioning, short-term thinking",
    scoreMid:
      "Tangential to strategy, neutral ecosystem impact, unclear long-term value",
    scoreHigh:
      "Core to roadmap execution, strengthens ecosystem position, clear strategic value",
  },
  {
    id: "reversibility",
    label: "Reversibility",
    description:
      "Ability to undo or modify the proposal's effects if problems emerge",
    scoreLow:
      "Irreversible on-chain changes, no rollback mechanism, permanent state modification",
    scoreMid:
      "Partially reversible with governance action, some state can be restored",
    scoreHigh:
      "Fully reversible via governance, time-locked execution, built-in circuit breakers",
  },
  {
    id: "implQuality",
    label: "Implementation Quality",
    description:
      "Code quality, testing rigor, documentation, deployment plan completeness",
    scoreLow:
      "No tests, unclear implementation, missing documentation, no deployment plan",
    scoreMid:
      "Basic tests present, reasonable code quality, some documentation gaps",
    scoreHigh:
      "Comprehensive tests, clean code, full documentation, staged rollout plan",
  },
];

// ─── 4 Universal Stakeholder Lenses ──────────────────────────

export const DEFAULT_LENSES: WeightProfile[] = [
  {
    id: "token_holder",
    name: "Token Holder",
    stakeholderType: "token_holder",
    description:
      "Prioritizes economic impact and strategic alignment for token value",
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
    id: "protocol_dev",
    name: "Protocol Developer",
    stakeholderType: "protocol_developer",
    description:
      "Prioritizes technical safety and operational continuity for protocol health",
    weights: {
      techSafety: 30,
      econImpact: 5,
      govIntegrity: 10,
      opsContinuity: 20,
      stratAlign: 10,
      reversibility: 15,
      implQuality: 10,
    },
  },
  {
    id: "delegate",
    name: "Delegate",
    stakeholderType: "delegate",
    description:
      "Prioritizes governance integrity and strategic alignment for representation",
    weights: {
      techSafety: 10,
      econImpact: 15,
      govIntegrity: 25,
      opsContinuity: 5,
      stratAlign: 25,
      reversibility: 10,
      implQuality: 10,
    },
  },
  {
    id: "treasury_guardian",
    name: "Treasury Guardian",
    stakeholderType: "treasury_guardian",
    description:
      "Prioritizes economic impact and reversibility for treasury protection",
    weights: {
      techSafety: 10,
      econImpact: 30,
      govIntegrity: 10,
      opsContinuity: 10,
      stratAlign: 5,
      reversibility: 25,
      implQuality: 10,
    },
  },
];

// ─── 7 Criterion Agent Configs ───────────────────────────────

export const DEFAULT_CRITERION_AGENTS: CriterionAgentConfig[] = [
  {
    criterionId: "techSafety",
    agentName: "TechSafety Analyst",
    systemPromptFocus: `You are a smart contract security specialist.
Focus on: contract verification status, known vulnerability patterns,
simulation results, upgrade proxy safety, access control correctness,
reentrancy risks, and integer overflow/underflow potential.`,
  },
  {
    criterionId: "econImpact",
    agentName: "Economic Analyst",
    systemPromptFocus: `You are a DeFi economist and tokenomics specialist.
Focus on: treasury impact (inflows vs outflows), token supply effects,
liquidity implications, fee structure changes, incentive alignment,
and potential for value extraction or MEV.`,
  },
  {
    criterionId: "govIntegrity",
    agentName: "Governance Analyst",
    systemPromptFocus: `You are a governance design specialist.
Focus on: power distribution changes, voting mechanism effects,
quorum/threshold modifications, timelock adequacy, delegation impacts,
and precedent-setting implications for future governance.`,
  },
  {
    criterionId: "opsContinuity",
    agentName: "Operations Analyst",
    systemPromptFocus: `You are a protocol operations specialist.
Focus on: upgrade migration paths, backward compatibility, dependency risks,
monitoring requirements, incident response readiness, and
operational burden on multisig/council members.`,
  },
  {
    criterionId: "stratAlign",
    agentName: "Strategy Analyst",
    systemPromptFocus: `You are a protocol strategy specialist.
Focus on: alignment with stated roadmap and mission, competitive positioning,
ecosystem partnership effects, market timing, and long-term
sustainability of the proposed change.`,
  },
  {
    criterionId: "reversibility",
    agentName: "Reversibility Analyst",
    systemPromptFocus: `You are a risk management specialist focusing on reversibility.
Focus on: rollback mechanisms, time-lock windows, circuit breakers,
state mutability assessment, emergency shutdown paths, and
governance-gated recovery procedures.`,
  },
  {
    criterionId: "implQuality",
    agentName: "Implementation Analyst",
    systemPromptFocus: `You are a code quality and DevOps specialist.
Focus on: test coverage, code clarity, documentation completeness,
deployment plan adequacy, monitoring setup, and adherence to
the protocol's development standards and practices.`,
  },
];

// ─── Default Thresholds ──────────────────────────────────────

export const DEFAULT_VERDICT_THRESHOLDS: VerdictThresholds = {
  approve: 80,
  needsReviewHigh: 65,
  abstain: 50,
  needsReviewLow: 35,
};

export const DEFAULT_HARD_VETO: HardVetoRule = {
  criterionId: "techSafety",
  threshold: 20,
};

export const DEFAULT_OUTCOME_MAPPING: OutcomeMapping = {
  positiveOutcomes: ["executed", "passed", "approved", "succeeded"],
  negativeOutcomes: ["rejected", "defeated", "expired", "canceled", "failed"],
};
