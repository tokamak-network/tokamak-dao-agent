/**
 * Agent Credibility Tracking
 *
 * Tracks prediction accuracy over time.
 * Scoring: high confidence + correct = +3, low confidence + correct = +1,
 *          high confidence + wrong = -2, low confidence + wrong = -1
 */

import type {
  CredibilityRecord,
  CredibilitySummary,
  OutcomeMapping,
} from "../types/index.js";

// ─── Confidence Assessment ───────────────────────────────────

/**
 * A score >= 70 or <= 30 indicates high confidence (strong opinion).
 */
export function isHighConfidence(score: number): boolean {
  return score >= 70 || score <= 30;
}

/**
 * Map a verdict string to a direction for comparison.
 */
export function verdictToDirection(
  verdict: string,
): "positive" | "negative" {
  const upper = verdict.toUpperCase();
  if (upper === "APPROVE" || upper === "NEEDS_REVIEW") return "positive";
  return "negative";
}

/**
 * Map an actual outcome to a direction using the protocol's outcome mapping.
 */
export function outcomeToDirection(
  outcome: string,
  mapping: OutcomeMapping,
): "positive" | "negative" {
  const lower = outcome.toLowerCase();
  if (mapping.positiveOutcomes.includes(lower)) return "positive";
  if (mapping.negativeOutcomes.includes(lower)) return "negative";
  // Unknown outcome — treat as negative (conservative)
  return "negative";
}

// ─── Score Computation ───────────────────────────────────────

/**
 * Compute the credibility delta for a resolved prediction.
 *
 * Matrix:
 *   high confidence + correct  = +3
 *   low confidence  + correct  = +1
 *   high confidence + wrong    = -2
 *   low confidence  + wrong    = -1
 */
export function computeCredibilityDelta(
  predictedVerdict: string,
  predictedScore: number,
  actualOutcome: string,
  outcomeMapping: OutcomeMapping,
): number {
  const highConf = isHighConfidence(predictedScore);
  const predicted = verdictToDirection(predictedVerdict);
  const actual = outcomeToDirection(actualOutcome, outcomeMapping);
  const correct = predicted === actual;

  if (correct && highConf) return 3;
  if (correct && !highConf) return 1;
  if (!correct && highConf) return -2;
  return -1;
}

// ─── Aggregation ─────────────────────────────────────────────

/**
 * Compute summary statistics from a set of credibility records.
 */
export function summarizeCredibility(
  records: CredibilityRecord[],
): CredibilitySummary[] {
  const byAgent = new Map<string, CredibilityRecord[]>();

  for (const record of records) {
    const existing = byAgent.get(record.agentName) ?? [];
    existing.push(record);
    byAgent.set(record.agentName, existing);
  }

  const summaries: CredibilitySummary[] = [];

  for (const [agentName, agentRecords] of byAgent) {
    const resolved = agentRecords.filter((r) => r.resolvedAt !== null);
    const totalScore = resolved.reduce((sum, r) => sum + r.scoreDelta, 0);
    const correctCount = resolved.filter((r) => r.scoreDelta > 0).length;

    summaries.push({
      agentName,
      totalPredictions: agentRecords.length,
      resolvedPredictions: resolved.length,
      totalScore,
      correctCount,
      accuracy:
        resolved.length > 0
          ? Math.round((correctCount / resolved.length) * 100)
          : 0,
    });
  }

  // Sort by total score descending
  summaries.sort((a, b) => b.totalScore - a.totalScore);
  return summaries;
}
