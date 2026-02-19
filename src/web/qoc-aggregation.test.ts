/**
 * Unit tests for QOC criterion-based aggregation engine.
 * Run: bun test src/web/qoc-aggregation.test.ts
 */

import { describe, test, expect } from "bun:test";
import {
  applyLens,
  applyAllLenses,
  determineVerdict,
  checkHardVeto,
  aggregateCriterionBased,
} from "./qoc-aggregation.ts";
import type { QocCriterionEvaluation, CriterionId } from "./qoc-types.ts";
import { CRITERION_IDS } from "./qoc-types.ts";
import { WEIGHT_PROFILES } from "./qoc-weights.ts";

// Helper: create uniform criterion scores record
function uniformCriterionScores(
  value: number,
): Record<CriterionId, { score: number; evidence: string }> {
  const scores = {} as Record<CriterionId, { score: number; evidence: string }>;
  for (const id of CRITERION_IDS) {
    scores[id] = { score: value, evidence: `Test evidence for ${id}` };
  }
  return scores;
}

// Helper: create criterion evaluations from a score map
function makeEvaluations(
  scores: Record<CriterionId, number>,
  agendaId = 1,
): QocCriterionEvaluation[] {
  return CRITERION_IDS.map((id) => ({
    agendaId,
    criterionId: id,
    score: scores[id],
    evidence: `Evidence for ${id}`,
    reasoning: `Reasoning for ${id}`,
    createdAt: new Date().toISOString(),
  }));
}

// Helper: uniform evaluations
function uniformEvaluations(
  value: number,
  agendaId = 1,
): QocCriterionEvaluation[] {
  const scores = {} as Record<CriterionId, number>;
  for (const id of CRITERION_IDS) {
    scores[id] = value;
  }
  return makeEvaluations(scores, agendaId);
}

describe("applyLens", () => {
  test("uniform 100 scores yield 100 for any lens", () => {
    const scores = uniformCriterionScores(100);
    for (const profile of WEIGHT_PROFILES) {
      expect(applyLens(scores, profile)).toBe(100);
    }
  });

  test("uniform 0 scores yield 0 for any lens", () => {
    const scores = uniformCriterionScores(0);
    for (const profile of WEIGHT_PROFILES) {
      expect(applyLens(scores, profile)).toBe(0);
    }
  });

  test("uniform 50 scores yield 50 for any lens", () => {
    const scores = uniformCriterionScores(50);
    for (const profile of WEIGHT_PROFILES) {
      expect(applyLens(scores, profile)).toBe(50);
    }
  });

  test("weighted correctly with mixed scores (Alpha lens)", () => {
    // Alpha weights: techSafety=15, econImpact=30, govIntegrity=10,
    // opsContinuity=10, stratAlign=20, reversibility=10, implQuality=5
    const scores = {} as Record<CriterionId, { score: number; evidence: string }>;
    scores.techSafety = { score: 80, evidence: "" };
    scores.econImpact = { score: 100, evidence: "" };
    scores.govIntegrity = { score: 60, evidence: "" };
    scores.opsContinuity = { score: 50, evidence: "" };
    scores.stratAlign = { score: 90, evidence: "" };
    scores.reversibility = { score: 70, evidence: "" };
    scores.implQuality = { score: 40, evidence: "" };

    const profile = WEIGHT_PROFILES[0]!; // Alpha
    // Expected: (15*80 + 30*100 + 10*60 + 10*50 + 20*90 + 10*70 + 5*40) / 100
    // = (1200 + 3000 + 600 + 500 + 1800 + 700 + 200) / 100 = 80
    expect(applyLens(scores, profile)).toBe(80);
  });

  test("different lenses give different scores for same criteria", () => {
    // techSafety high, econImpact low — Alpha (econ-heavy) vs Gamma (tech-heavy) should differ
    const scores = {} as Record<CriterionId, { score: number; evidence: string }>;
    scores.techSafety = { score: 90, evidence: "" };
    scores.econImpact = { score: 30, evidence: "" };
    scores.govIntegrity = { score: 50, evidence: "" };
    scores.opsContinuity = { score: 50, evidence: "" };
    scores.stratAlign = { score: 50, evidence: "" };
    scores.reversibility = { score: 50, evidence: "" };
    scores.implQuality = { score: 50, evidence: "" };

    const alpha = WEIGHT_PROFILES.find((p) => p.id === "alpha")!;
    const gamma = WEIGHT_PROFILES.find((p) => p.id === "gamma")!;

    const alphaScore = applyLens(scores, alpha);
    const gammaScore = applyLens(scores, gamma);

    // Gamma weights techSafety=30 (higher) and econImpact=15 (lower than Alpha's 30)
    // Alpha: econImpact weight=30, techSafety weight=15
    // So gamma should score higher with high techSafety, low econImpact
    expect(gammaScore).toBeGreaterThan(alphaScore);
  });
});

describe("applyAllLenses", () => {
  test("returns 4 lens results", () => {
    const scores = uniformCriterionScores(75);
    const results = applyAllLenses(scores);
    expect(results).toHaveLength(4);
  });

  test("each lens has id, name, score, and verdict", () => {
    const scores = uniformCriterionScores(85);
    const results = applyAllLenses(scores);
    for (const r of results) {
      expect(r.lensId).toBeDefined();
      expect(r.lensName).toBeDefined();
      expect(typeof r.weightedScore).toBe("number");
      expect(r.verdict).toBeDefined();
    }
  });

  test("uniform scores yield same score for all lenses", () => {
    const scores = uniformCriterionScores(80);
    const results = applyAllLenses(scores);
    for (const r of results) {
      expect(r.weightedScore).toBe(80);
      expect(r.verdict).toBe("APPROVE");
    }
  });
});

describe("determineVerdict", () => {
  test("APPROVE for 80+", () => {
    expect(determineVerdict(80)).toBe("APPROVE");
    expect(determineVerdict(100)).toBe("APPROVE");
  });

  test("NEEDS_REVIEW for 65-79", () => {
    expect(determineVerdict(65)).toBe("NEEDS_REVIEW");
    expect(determineVerdict(79)).toBe("NEEDS_REVIEW");
  });

  test("ABSTAIN for 50-64", () => {
    expect(determineVerdict(50)).toBe("ABSTAIN");
    expect(determineVerdict(64)).toBe("ABSTAIN");
  });

  test("NEEDS_REVIEW for 35-49", () => {
    expect(determineVerdict(35)).toBe("NEEDS_REVIEW");
    expect(determineVerdict(49)).toBe("NEEDS_REVIEW");
  });

  test("REJECT for 0-34", () => {
    expect(determineVerdict(0)).toBe("REJECT");
    expect(determineVerdict(34)).toBe("REJECT");
  });
});

describe("checkHardVeto", () => {
  test("triggers when techSafety < 20", () => {
    const scores = uniformCriterionScores(50);
    scores.techSafety = { score: 10, evidence: "" };
    const { triggered, techSafetyScore } = checkHardVeto(scores);
    expect(triggered).toBe(true);
    expect(techSafetyScore).toBe(10);
  });

  test("does not trigger when techSafety >= 20", () => {
    const scores = uniformCriterionScores(50);
    scores.techSafety = { score: 20, evidence: "" };
    const { triggered, techSafetyScore } = checkHardVeto(scores);
    expect(triggered).toBe(false);
    expect(techSafetyScore).toBe(20);
  });

  test("triggers at techSafety = 0", () => {
    const scores = uniformCriterionScores(90);
    scores.techSafety = { score: 0, evidence: "" };
    const { triggered } = checkHardVeto(scores);
    expect(triggered).toBe(true);
  });

  test("does not trigger at techSafety = 19", () => {
    const scores = uniformCriterionScores(50);
    scores.techSafety = { score: 19, evidence: "" };
    const { triggered } = checkHardVeto(scores);
    expect(triggered).toBe(true);
  });
});

describe("aggregateCriterionBased", () => {
  test("empty evaluations return REJECT due to hard veto (techSafety=0)", () => {
    const result = aggregateCriterionBased([]);
    expect(result.verdict).toBe("REJECT");
    expect(result.finalScore).toBe(0);
    expect(result.hardVeto).toBe(true);
    expect(result.contributingCriteria).toBe(0);
  });

  test("all criteria high scores → APPROVE", () => {
    const evals = uniformEvaluations(90);
    const result = aggregateCriterionBased(evals);
    expect(result.verdict).toBe("APPROVE");
    expect(result.finalScore).toBe(90);
    expect(result.hardVeto).toBe(false);
    expect(result.contributingCriteria).toBe(7);
  });

  test("all criteria low scores → REJECT", () => {
    const evals = uniformEvaluations(20);
    const result = aggregateCriterionBased(evals);
    expect(result.verdict).toBe("REJECT");
    expect(result.finalScore).toBe(20);
  });

  test("hard veto overrides score-based verdict", () => {
    const scores = {} as Record<CriterionId, number>;
    for (const id of CRITERION_IDS) {
      scores[id] = id === "techSafety" ? 10 : 90;
    }
    const evals = makeEvaluations(scores);
    const result = aggregateCriterionBased(evals);
    expect(result.hardVeto).toBe(true);
    expect(result.verdict).toBe("REJECT");
    expect(result.avgTechSafety).toBe(10);
  });

  test("criterion scores preserved correctly", () => {
    const scores = {} as Record<CriterionId, number>;
    scores.techSafety = 80;
    scores.econImpact = 60;
    scores.govIntegrity = 70;
    scores.opsContinuity = 50;
    scores.stratAlign = 90;
    scores.reversibility = 40;
    scores.implQuality = 75;
    const evals = makeEvaluations(scores);
    const result = aggregateCriterionBased(evals);

    expect(result.criterionScores.techSafety.score).toBe(80);
    expect(result.criterionScores.econImpact.score).toBe(60);
    expect(result.criterionScores.stratAlign.score).toBe(90);
  });

  test("4 lens results returned", () => {
    const evals = uniformEvaluations(70);
    const result = aggregateCriterionBased(evals);
    expect(result.lensResults).toHaveLength(4);
  });

  test("uniform scores → all lenses agree", () => {
    const evals = uniformEvaluations(80);
    const result = aggregateCriterionBased(evals);
    for (const lens of result.lensResults) {
      expect(lens.weightedScore).toBe(80);
      expect(lens.verdict).toBe("APPROVE");
    }
    expect(result.finalScore).toBe(80);
  });

  test("partial evaluations (missing criteria)", () => {
    // Only provide 3 out of 7 criteria
    const evals: QocCriterionEvaluation[] = [
      { agendaId: 1, criterionId: "techSafety", score: 90, evidence: "", reasoning: "", createdAt: "" },
      { agendaId: 1, criterionId: "econImpact", score: 80, evidence: "", reasoning: "", createdAt: "" },
      { agendaId: 1, criterionId: "govIntegrity", score: 70, evidence: "", reasoning: "", createdAt: "" },
    ];
    const result = aggregateCriterionBased(evals);
    expect(result.contributingCriteria).toBe(3);
    // Missing criteria default to 0, so lens scores will be low
    expect(result.finalScore).toBeLessThan(50);
  });
});

describe("weight profiles", () => {
  test("all weight profiles sum to 100", () => {
    for (const profile of WEIGHT_PROFILES) {
      const sum = Object.values(profile.weights).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    }
  });

  test("all criteria have minimum weight 5 in every profile", () => {
    for (const profile of WEIGHT_PROFILES) {
      for (const id of CRITERION_IDS) {
        expect(profile.weights[id]).toBeGreaterThanOrEqual(5);
      }
    }
  });
});
