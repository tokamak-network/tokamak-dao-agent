/**
 * QOC (Question-Option-Criteria) framework type definitions.
 *
 * Criterion-based architecture: 7 specialist agents each evaluate 1 criterion,
 * then 4 stakeholder lenses (pure math) produce weighted perspectives.
 */

/** The 7 evaluation criteria IDs */
export type CriterionId =
  | "techSafety"
  | "econImpact"
  | "govIntegrity"
  | "opsContinuity"
  | "stratAlign"
  | "reversibility"
  | "implQuality";

/** All criterion IDs as a runtime array */
export const CRITERION_IDS: CriterionId[] = [
  "techSafety",
  "econImpact",
  "govIntegrity",
  "opsContinuity",
  "stratAlign",
  "reversibility",
  "implQuality",
];

/** A single criterion agent's evaluation */
export interface QocCriterionEvaluation {
  agendaId: number;
  criterionId: CriterionId;
  /** Score 0-100 */
  score: number;
  /** Detailed evidence with on-chain references */
  evidence: string;
  /** Analysis reasoning */
  reasoning: string;
  createdAt: string;
}

/** Raw LLM response from a criterion agent */
export interface QocCriterionRawResponse {
  score: number;
  evidence: string;
  reasoning: string;
}

/** Stakeholder lens result (pure math — no LLM) */
export interface QocLensResult {
  lensId: string;
  lensName: string;
  weightedScore: number;
  verdict: QocVerdict;
}

/** Final verdict after aggregation */
export type QocVerdict =
  | "APPROVE"
  | "NEEDS_REVIEW"
  | "ABSTAIN"
  | "REJECT";

/** Aggregated QOC result — criterion scores + lens perspectives */
export interface QocAggregatedResult {
  agendaId: number;
  /** Per-criterion scores from specialist agents */
  criterionScores: Record<CriterionId, { score: number; evidence: string }>;
  /** 4 stakeholder lens results (weighted perspectives) */
  lensResults: QocLensResult[];
  /** Mean of all lens weighted scores */
  finalScore: number;
  /** Determined from finalScore thresholds */
  verdict: QocVerdict;
  /** Whether hard veto was triggered (techSafety < 20) */
  hardVeto: boolean;
  /** Direct techSafety score */
  avgTechSafety: number;
  /** Number of criteria that contributed */
  contributingCriteria: number;
  createdAt: string;
}
