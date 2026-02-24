/**
 * QOC Aggregation Engine
 *
 * Pure math — zero protocol dependencies.
 * Extracted and generalized from Tokamak DAO Agent's aggregation.ts
 *
 * Flow: N criterion scores → M lens results → mean → verdict
 */

import type {
  CriterionEvaluation,
  WeightProfile,
  VerdictThresholds,
  HardVetoRule,
  LensResult,
  AggregatedResult,
  QocVerdict,
  TenantConfig,
} from "../types/index.js";

// ─── Default Thresholds ──────────────────────────────────────

export const DEFAULT_THRESHOLDS: VerdictThresholds = {
  approve: 80,
  needsReviewHigh: 65,
  abstain: 50,
  needsReviewLow: 35,
};

// ─── Verdict Determination ───────────────────────────────────

/**
 * Asymmetric thresholds — biased toward caution.
 * Rejecting a bad proposal costs less than approving a dangerous one.
 */
export function determineVerdict(
  score: number,
  thresholds: VerdictThresholds = DEFAULT_THRESHOLDS,
): QocVerdict {
  if (score >= thresholds.approve) return "APPROVE";
  if (score >= thresholds.needsReviewHigh) return "NEEDS_REVIEW";
  if (score >= thresholds.abstain) return "ABSTAIN";
  if (score >= thresholds.needsReviewLow) return "NEEDS_REVIEW";
  return "REJECT";
}

// ─── Lens Application ────────────────────────────────────────

/**
 * Apply a single stakeholder lens (weight profile) to criterion scores.
 * Returns weighted score in range 0-100.
 */
export function applyLens(
  criterionScores: Record<string, { score: number; evidence: string }>,
  profile: WeightProfile,
): number {
  let sum = 0;
  let totalWeight = 0;

  for (const [criterionId, weight] of Object.entries(profile.weights)) {
    const entry = criterionScores[criterionId];
    if (entry) {
      sum += weight * entry.score;
      totalWeight += weight;
    }
  }

  // Normalize: weights should sum to 100, but handle partial data
  return totalWeight > 0 ? sum / totalWeight : 0;
}

/**
 * Apply all stakeholder lenses to criterion scores.
 */
export function applyAllLenses(
  criterionScores: Record<string, { score: number; evidence: string }>,
  profiles: WeightProfile[],
  thresholds: VerdictThresholds = DEFAULT_THRESHOLDS,
): LensResult[] {
  return profiles.map((profile) => {
    const weightedScore =
      Math.round(applyLens(criterionScores, profile) * 100) / 100;
    return {
      lensId: profile.id,
      lensName: profile.name,
      weightedScore,
      verdict: determineVerdict(weightedScore, thresholds),
    };
  });
}

// ─── Hard Veto ───────────────────────────────────────────────

/**
 * Check if a single criterion triggers a hard veto (forced REJECT).
 * e.g., techSafety < 20 → always reject regardless of other scores.
 */
export function checkHardVeto(
  criterionScores: Record<string, { score: number; evidence: string }>,
  rule?: HardVetoRule,
): { triggered: boolean; criterionId?: string; score?: number; threshold?: number } {
  if (!rule) return { triggered: false };

  const entry = criterionScores[rule.criterionId];
  const score = entry?.score ?? 0;

  return {
    triggered: score < rule.threshold,
    criterionId: rule.criterionId,
    score,
    threshold: rule.threshold,
  };
}

// ─── Main Aggregation ────────────────────────────────────────

/**
 * Aggregate criterion evaluations into a final result.
 *
 * N criterion scores → M lens results → mean → verdict
 *
 * @param evaluations - Individual criterion evaluation results
 * @param config - Tenant configuration (lenses, thresholds, veto rules)
 * @param proposalId - The proposal being evaluated
 * @param tenantId - The tenant context
 */
export function aggregate(
  evaluations: CriterionEvaluation[],
  config: Pick<TenantConfig, "lenses" | "verdictThresholds" | "hardVetoRule" | "criteria">,
  proposalId: string,
  tenantId: string,
): AggregatedResult {
  // 1. Map evaluations to criterion scores
  const criterionScores: Record<string, { score: number; evidence: string }> = {};

  // Initialize all configured criteria with zero
  for (const criterion of config.criteria) {
    criterionScores[criterion.id] = { score: 0, evidence: "" };
  }

  // Populate with actual evaluation data
  for (const evaluation of evaluations) {
    criterionScores[evaluation.criterionId] = {
      score: evaluation.score,
      evidence: evaluation.evidence,
    };
  }

  // 2. Apply all stakeholder lenses
  const lensResults = applyAllLenses(
    criterionScores,
    config.lenses,
    config.verdictThresholds,
  );

  // 3. Compute final score (mean of lens weighted scores)
  const finalScore =
    lensResults.length > 0
      ? Math.round(
          lensResults.reduce((sum, lr) => sum + lr.weightedScore, 0) /
            lensResults.length,
        )
      : 0;

  // 4. Check hard veto
  const veto = checkHardVeto(criterionScores, config.hardVetoRule);
  const verdict = veto.triggered
    ? "REJECT"
    : determineVerdict(finalScore, config.verdictThresholds);

  return {
    proposalId,
    tenantId,
    criterionScores,
    lensResults,
    finalScore,
    verdict,
    hardVeto: veto.triggered,
    vetoDetail: veto.triggered
      ? {
          criterionId: veto.criterionId!,
          score: veto.score!,
          threshold: veto.threshold!,
        }
      : undefined,
    contributingCriteria: evaluations.length,
    createdAt: new Date().toISOString(),
  };
}
