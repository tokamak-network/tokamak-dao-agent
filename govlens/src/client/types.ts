/** Client-side mirrors of API response types */

export type ProposalStatus =
  | "pending"
  | "active"
  | "canceled"
  | "defeated"
  | "succeeded"
  | "queued"
  | "expired"
  | "executed";

export type QocVerdict = "APPROVE" | "NEEDS_REVIEW" | "ABSTAIN" | "REJECT";

export interface ContractEntry {
  address: string;
  name: string;
  role: string;
}

export interface DiscoveryResult {
  framework: string;
  confidence: number;
  contracts: ContractEntry[];
  metadata: Record<string, unknown>;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  chainId: number;
  governorAddress: string;
  frameworkType: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  onChainId: string;
  title: string;
  description: string;
  proposer: string;
  status: ProposalStatus;
  targets: string[];
  calldatas: string[];
  startBlock: string;
  endBlock: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
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
  criterionScores: Record<string, { score: number; evidence: string }>;
  lensResults: LensResult[];
  finalScore: number;
  verdict: QocVerdict;
  hardVeto: boolean;
  vetoDetail?: { criterionId: string; score: number; threshold: number };
  createdAt: string;
}

export interface SimulationCallResult {
  target: string;
  decoded: string;
  success: boolean;
  revertReason?: string;
}

export interface SimulationResponse {
  results: SimulationCallResult[];
  overallSuccess: boolean;
}

export interface CredibilitySummary {
  agentName: string;
  totalPredictions: number;
  resolvedPredictions: number;
  totalScore: number;
  correctCount: number;
  accuracy: number;
}

export type View = "onboarding" | "proposals" | "proposal-detail" | "credibility";
