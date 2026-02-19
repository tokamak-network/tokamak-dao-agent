/**
 * QOC aggregation engine — criterion-based architecture.
 *
 * 7 criterion scores → 4 stakeholder lenses (weighted math) → final verdict.
 * No outlier filtering needed: each criterion has exactly 1 authoritative score.
 */

import type {
  CriterionId,
  QocCriterionEvaluation,
  QocAggregatedResult,
  QocLensResult,
  QocVerdict,
} from "./qoc-types.ts";
import { CRITERION_IDS } from "./qoc-types.ts";
import { WEIGHT_PROFILES } from "./qoc-weights.ts";
import type { WeightProfile } from "./qoc-weights.ts";

/**
 * Apply a single stakeholder lens to criterion scores.
 * Returns weighted score: Σ(weight × score) / 100
 */
export function applyLens(
  criterionScores: Record<CriterionId, { score: number; evidence: string }>,
  profile: WeightProfile,
): number {
  let sum = 0;
  for (const id of CRITERION_IDS) {
    const weight = profile.weights[id] ?? 0;
    const score = criterionScores[id]?.score ?? 0;
    sum += weight * score;
  }
  return sum / 100;
}

/**
 * Apply all 4 stakeholder lenses to criterion scores.
 */
export function applyAllLenses(
  criterionScores: Record<CriterionId, { score: number; evidence: string }>,
): QocLensResult[] {
  return WEIGHT_PROFILES.map((profile) => {
    const weightedScore = Math.round(applyLens(criterionScores, profile) * 100) / 100;
    return {
      lensId: profile.id,
      lensName: profile.agentName,
      weightedScore,
      verdict: determineVerdict(weightedScore),
    };
  });
}

/**
 * Determine verdict from final score using asymmetric thresholds.
 * Biased toward caution: rejecting a bad proposal is less costly
 * than approving a dangerous one.
 */
export function determineVerdict(score: number): QocVerdict {
  if (score >= 80) return "APPROVE";
  if (score >= 65) return "NEEDS_REVIEW";
  if (score >= 50) return "ABSTAIN";
  if (score >= 35) return "NEEDS_REVIEW";
  return "REJECT";
}

/**
 * Check hard veto condition: techSafety < 20 → mandatory REJECT.
 * With criterion-based architecture, techSafety is a single authoritative score.
 */
export function checkHardVeto(
  criterionScores: Record<CriterionId, { score: number; evidence: string }>,
): { triggered: boolean; techSafetyScore: number } {
  const techSafetyScore = criterionScores.techSafety?.score ?? 0;
  return {
    triggered: techSafetyScore < 20,
    techSafetyScore,
  };
}

/**
 * Aggregate criterion evaluations into a final result.
 * Flow: 7 criterion scores → 4 lens results → mean → verdict
 */
export function aggregateCriterionBased(
  evaluations: QocCriterionEvaluation[],
): QocAggregatedResult {
  const criterionScores = {} as Record<CriterionId, { score: number; evidence: string }>;

  // Initialize with zeros
  for (const id of CRITERION_IDS) {
    criterionScores[id] = { score: 0, evidence: "" };
  }

  // Fill from evaluations
  let contributingCriteria = 0;
  for (const evaluation of evaluations) {
    criterionScores[evaluation.criterionId] = {
      score: evaluation.score,
      evidence: evaluation.evidence,
    };
    contributingCriteria++;
  }

  const lensResults = applyAllLenses(criterionScores);
  const finalScore =
    lensResults.length > 0
      ? Math.round(
          lensResults.reduce((sum, lr) => sum + lr.weightedScore, 0) / lensResults.length,
        )
      : 0;

  const { triggered: hardVeto, techSafetyScore } = checkHardVeto(criterionScores);
  const verdict = hardVeto ? "REJECT" : determineVerdict(finalScore);

  return {
    agendaId: evaluations.length > 0 ? evaluations[0]!.agendaId : 0,
    criterionScores,
    lensResults,
    finalScore,
    verdict,
    hardVeto,
    avgTechSafety: techSafetyScore,
    contributingCriteria,
    createdAt: new Date().toISOString(),
  };
}
