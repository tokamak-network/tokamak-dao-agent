/**
 * GovLens Core Types
 *
 * All types are protocol-agnostic. Protocol-specific behavior
 * is driven by configuration objects, not hardcoded types.
 */

import type { Address, Hex, Chain } from "viem";

// ─── Chain ───────────────────────────────────────────────────

export type ChainId = number;

export type SupportedChain =
  | "ethereum"
  | "arbitrum"
  | "optimism"
  | "base"
  | "polygon";

// ─── Tenant ──────────────────────────────────────────────────

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  chainId: ChainId;
  governorAddress: Address;
  frameworkType: GovernanceFramework;
  config: TenantConfig;
  apiKeyHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantConfig {
  criteria: CriterionDef[];
  lenses: WeightProfile[];
  verdictThresholds: VerdictThresholds;
  hardVetoRule?: HardVetoRule;
  outcomeMapping: OutcomeMapping;
  additionalContracts: ContractEntry[];
}

// ─── Governance Framework ────────────────────────────────────

export type GovernanceFramework =
  | "oz_governor"
  | "gnosis_snapshot"
  | "aragon"
  | "custom";

export interface ContractEntry {
  address: Address;
  name: string;
  role: string; // "governor", "timelock", "token", "treasury", etc.
  abi?: unknown[];
  proxyImplementation?: Address;
}

export interface DiscoveryResult {
  framework: GovernanceFramework;
  confidence: number; // 0-1
  contracts: ContractEntry[];
  metadata: Record<string, unknown>;
}

// ─── Proposal ────────────────────────────────────────────────

export type ProposalStatus =
  | "pending"
  | "active"
  | "canceled"
  | "defeated"
  | "succeeded"
  | "queued"
  | "expired"
  | "executed";

export interface Proposal {
  id: string;
  tenantId: string;
  onChainId: string;
  title: string;
  description: string;
  proposer: Address;
  status: ProposalStatus;
  targets: Address[];
  values: bigint[];
  calldatas: Hex[];
  startBlock: bigint;
  endBlock: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  createdAt: string;
  updatedAt: string;
}

// ─── QOC Evaluation ──────────────────────────────────────────

export interface CriterionDef {
  id: string;
  label: string;
  description: string;
  scoreLow: string;
  scoreMid: string;
  scoreHigh: string;
}

export interface WeightProfile {
  id: string;
  name: string;
  stakeholderType: string;
  description: string;
  weights: Record<string, number>; // criterionId → weight, sum = 100
}

export interface VerdictThresholds {
  approve: number; // default 80
  needsReviewHigh: number; // default 65
  abstain: number; // default 50
  needsReviewLow: number; // default 35
}

export interface HardVetoRule {
  criterionId: string;
  threshold: number; // if score < threshold → forced REJECT
}

export interface OutcomeMapping {
  positiveOutcomes: string[];
  negativeOutcomes: string[];
}

export type QocVerdict = "APPROVE" | "NEEDS_REVIEW" | "ABSTAIN" | "REJECT";

export interface CriterionEvaluation {
  proposalId: string;
  tenantId: string;
  criterionId: string;
  score: number; // 0-100
  evidence: string;
  reasoning: string;
  createdAt: string;
}

export interface LensResult {
  lensId: string;
  lensName: string;
  weightedScore: number;
  verdict: QocVerdict;
}

export interface AggregatedResult {
  proposalId: string;
  tenantId: string;
  criterionScores: Record<string, { score: number; evidence: string }>;
  lensResults: LensResult[];
  finalScore: number;
  verdict: QocVerdict;
  hardVeto: boolean;
  vetoDetail?: { criterionId: string; score: number; threshold: number };
  contributingCriteria: number;
  createdAt: string;
}

// ─── Criterion Agent ─────────────────────────────────────────

export interface CriterionAgentConfig {
  criterionId: string;
  agentName: string;
  systemPromptFocus: string;
}

// ─── Deliberation ────────────────────────────────────────────

export interface DeliberationRound {
  id: string;
  proposalId: string;
  tenantId: string;
  phase: number;
  agentName: string;
  criterionId: string | null;
  score: number | null;
  reasoning: string;
  createdAt: string;
}

export interface MetaAdjustment {
  criterionId: string;
  originalScore: number;
  adjustedScore: number;
  adjustmentReason: string;
}

export interface MetaAnalysis {
  contradictions: string[];
  evidenceQuality: Record<string, string>;
  adjustments: MetaAdjustment[];
  synthesis: string;
}

export interface DeliberationResult {
  rounds: DeliberationRound[];
  phase1Result: AggregatedResult;
  phase2Result: AggregatedResult;
  metaAnalysis: MetaAnalysis;
}

// ─── Credibility Tracking ────────────────────────────────────

export interface CredibilityRecord {
  id: string;
  tenantId: string;
  agentName: string;
  proposalId: string;
  predictedVerdict: string;
  predictedScore: number;
  actualOutcome: string | null;
  scoreDelta: number;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CredibilitySummary {
  agentName: string;
  totalPredictions: number;
  resolvedPredictions: number;
  totalScore: number;
  correctCount: number;
  accuracy: number;
}

// ─── On-Chain Agent Registration (ERC AI Governance) ────────

/** Off-chain metadata for a registered AI agent (pointed to by IAIAgentRegistry.agentURI) */
export interface AgentProfile {
  name: string;
  version: string;
  type: "criterion" | "meta" | "delegate";
  criterionId?: string;
  stakeholder?: {
    type: string;
    perspective: string;
  };
  model: string;
  operator: string;
}

/** Off-chain delegation preferences (pointed to by IAIDelegation.preferencesURI) */
export interface DelegationPreferences {
  criterionWeights: Record<string, number>;
  riskTolerance: "conservative" | "moderate" | "aggressive";
  escalation: {
    confidenceThreshold: number;
    alwaysEscalateFor: string[];
  };
  principles: string[];
}

/** Off-chain evaluation result (pointed to by IEvaluationCommitment.evaluationURI) */
export interface EvaluationJSON {
  proposalId: string;
  criterionScores: Record<string, { score: number; evidence: string; reasoning: string }>;
  lensResults: LensResult[];
  finalScore: number;
  verdict: QocVerdict;
}

/** On-chain agent delegation state (mirrors IAIDelegation.getAIDelegation return) */
export interface OnChainDelegation {
  agentId: Hex;
  expiry: bigint;
  preferencesURI: string;
}

/** On-chain credibility state (mirrors ICredibilityRegistry.getCredibility return) */
export interface OnChainCredibility {
  totalScore: bigint;
  totalPredictions: bigint;
}

// ─── Verification ────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  gasUsed: bigint;
  returnData: Hex;
  revertReason?: string;
  stateDiff?: StateDiff[];
  logs?: DecodedLog[];
}

export interface StateDiff {
  address: Address;
  slot: Hex;
  before: Hex;
  after: Hex;
}

export interface DecodedLog {
  address: Address;
  name: string;
  args: Record<string, unknown>;
}

export interface CalldataDecoded {
  functionName: string;
  args: Record<string, unknown>;
  signature: string;
}

// ─── LLM Provider ────────────────────────────────────────────

export interface LLMStreamEvent {
  type: "text_delta" | "tool_use" | "tool_result" | "done" | "error";
  text?: string;
  toolName?: string;
  toolInput?: unknown;
  toolResult?: unknown;
  error?: string;
}

export interface LLMProvider {
  createStream(params: {
    model: string;
    system: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    maxTokens: number;
  }): AsyncIterable<LLMStreamEvent>;
}

// ─── API ─────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}
