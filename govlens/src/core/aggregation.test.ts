/**
 * QOC Aggregation Engine Tests
 *
 * Tests the core mathematical logic that is protocol-agnostic.
 */

import { describe, test, expect } from "bun:test";
import {
  determineVerdict,
  applyLens,
  applyAllLenses,
  checkHardVeto,
  aggregate,
  DEFAULT_THRESHOLDS,
} from "./aggregation.js";
import {
  DEFAULT_CRITERIA,
  DEFAULT_LENSES,
  DEFAULT_HARD_VETO,
  DEFAULT_VERDICT_THRESHOLDS,
} from "./defaults.js";
import type {
  CriterionEvaluation,
  WeightProfile,
  VerdictThresholds,
} from "../types/index.js";

// ─── Test Helpers ────────────────────────────────────────────

function makeEvaluation(
  criterionId: string,
  score: number,
): CriterionEvaluation {
  return {
    proposalId: "test-proposal",
    tenantId: "test-tenant",
    criterionId,
    score,
    evidence: `Test evidence for ${criterionId}`,
    reasoning: `Test reasoning for ${criterionId}`,
    createdAt: new Date().toISOString(),
  };
}

function makeScores(
  scores: Record<string, number>,
): Record<string, { score: number; evidence: string }> {
  const result: Record<string, { score: number; evidence: string }> = {};
  for (const [id, score] of Object.entries(scores)) {
    result[id] = { score, evidence: `Evidence for ${id}` };
  }
  return result;
}

// ─── determineVerdict ────────────────────────────────────────

describe("determineVerdict", () => {
  test("returns APPROVE for score >= 80", () => {
    expect(determineVerdict(80)).toBe("APPROVE");
    expect(determineVerdict(95)).toBe("APPROVE");
    expect(determineVerdict(100)).toBe("APPROVE");
  });

  test("returns NEEDS_REVIEW for score 65-79", () => {
    expect(determineVerdict(65)).toBe("NEEDS_REVIEW");
    expect(determineVerdict(79)).toBe("NEEDS_REVIEW");
  });

  test("returns ABSTAIN for score 50-64", () => {
    expect(determineVerdict(50)).toBe("ABSTAIN");
    expect(determineVerdict(64)).toBe("ABSTAIN");
  });

  test("returns NEEDS_REVIEW for score 35-49", () => {
    expect(determineVerdict(35)).toBe("NEEDS_REVIEW");
    expect(determineVerdict(49)).toBe("NEEDS_REVIEW");
  });

  test("returns REJECT for score < 35", () => {
    expect(determineVerdict(34)).toBe("REJECT");
    expect(determineVerdict(0)).toBe("REJECT");
  });

  test("supports custom thresholds", () => {
    const custom: VerdictThresholds = {
      approve: 90,
      needsReviewHigh: 70,
      abstain: 50,
      needsReviewLow: 30,
    };
    expect(determineVerdict(85, custom)).toBe("NEEDS_REVIEW");
    expect(determineVerdict(90, custom)).toBe("APPROVE");
    expect(determineVerdict(25, custom)).toBe("REJECT");
  });
});

// ─── applyLens ───────────────────────────────────────────────

describe("applyLens", () => {
  test("computes weighted score correctly", () => {
    const scores = makeScores({
      techSafety: 80,
      econImpact: 60,
      govIntegrity: 70,
      opsContinuity: 50,
      stratAlign: 90,
      reversibility: 40,
      implQuality: 70,
    });

    // Token Holder weights: techSafety=15, econImpact=30, govIntegrity=10,
    //   opsContinuity=10, stratAlign=20, reversibility=10, implQuality=5
    const tokenHolder = DEFAULT_LENSES[0]!;
    const result = applyLens(scores, tokenHolder);

    // Expected: (15*80 + 30*60 + 10*70 + 10*50 + 20*90 + 10*40 + 5*70) / 100
    // = (1200 + 1800 + 700 + 500 + 1800 + 400 + 350) / 100
    // = 6750 / 100 = 67.5
    expect(result).toBe(67.5);
  });

  test("handles missing criteria gracefully", () => {
    const scores = makeScores({ techSafety: 80, econImpact: 60 });
    const profile: WeightProfile = {
      id: "test",
      name: "Test",
      stakeholderType: "test",
      description: "Test profile",
      weights: { techSafety: 50, econImpact: 50 },
    };
    const result = applyLens(scores, profile);
    expect(result).toBe(70); // (50*80 + 50*60) / 100
  });

  test("returns 0 for empty scores", () => {
    const profile: WeightProfile = {
      id: "test",
      name: "Test",
      stakeholderType: "test",
      description: "Test",
      weights: { techSafety: 100 },
    };
    expect(applyLens({}, profile)).toBe(0);
  });
});

// ─── applyAllLenses ──────────────────────────────────────────

describe("applyAllLenses", () => {
  test("applies all default lenses", () => {
    const scores = makeScores({
      techSafety: 80,
      econImpact: 80,
      govIntegrity: 80,
      opsContinuity: 80,
      stratAlign: 80,
      reversibility: 80,
      implQuality: 80,
    });

    const results = applyAllLenses(scores, DEFAULT_LENSES);
    expect(results).toHaveLength(4);

    // All scores = 80, all weights sum to 100, so all results = 80
    for (const result of results) {
      expect(result.weightedScore).toBe(80);
      expect(result.verdict).toBe("APPROVE");
    }
  });

  test("produces different verdicts per lens", () => {
    const scores = makeScores({
      techSafety: 30,   // Low — Protocol Dev will hate this
      econImpact: 90,   // High — Token Holder will love this
      govIntegrity: 50,
      opsContinuity: 20, // Very low
      stratAlign: 70,
      reversibility: 40,
      implQuality: 30,
    });

    const results = applyAllLenses(scores, DEFAULT_LENSES);
    const tokenHolder = results.find((r) => r.lensId === "token_holder");
    const protocolDev = results.find((r) => r.lensId === "protocol_dev");

    // Token holder should score higher (econImpact weighted heavily)
    // Protocol dev should score lower (techSafety weighted heavily)
    expect(tokenHolder!.weightedScore).toBeGreaterThan(
      protocolDev!.weightedScore,
    );
  });
});

// ─── checkHardVeto ───────────────────────────────────────────

describe("checkHardVeto", () => {
  test("triggers when criterion below threshold", () => {
    const scores = makeScores({ techSafety: 15 });
    const result = checkHardVeto(scores, DEFAULT_HARD_VETO);
    expect(result.triggered).toBe(true);
    expect(result.score).toBe(15);
    expect(result.threshold).toBe(20);
  });

  test("does not trigger when at threshold", () => {
    const scores = makeScores({ techSafety: 20 });
    const result = checkHardVeto(scores, DEFAULT_HARD_VETO);
    expect(result.triggered).toBe(false);
  });

  test("does not trigger when above threshold", () => {
    const scores = makeScores({ techSafety: 80 });
    const result = checkHardVeto(scores, DEFAULT_HARD_VETO);
    expect(result.triggered).toBe(false);
  });

  test("does not trigger without rule", () => {
    const scores = makeScores({ techSafety: 0 });
    const result = checkHardVeto(scores);
    expect(result.triggered).toBe(false);
  });

  test("triggers on missing criterion (defaults to 0)", () => {
    const result = checkHardVeto({}, DEFAULT_HARD_VETO);
    expect(result.triggered).toBe(true);
  });
});

// ─── aggregate ───────────────────────────────────────────────

describe("aggregate", () => {
  const config = {
    criteria: DEFAULT_CRITERIA,
    lenses: DEFAULT_LENSES,
    verdictThresholds: DEFAULT_VERDICT_THRESHOLDS,
    hardVetoRule: DEFAULT_HARD_VETO,
  };

  test("produces APPROVE for all-high scores", () => {
    const evaluations = DEFAULT_CRITERIA.map((c) =>
      makeEvaluation(c.id, 90),
    );

    const result = aggregate(evaluations, config, "p1", "t1");

    expect(result.verdict).toBe("APPROVE");
    expect(result.finalScore).toBeGreaterThanOrEqual(80);
    expect(result.hardVeto).toBe(false);
    expect(result.contributingCriteria).toBe(7);
    expect(result.lensResults).toHaveLength(4);
  });

  test("produces REJECT for all-low scores", () => {
    const evaluations = DEFAULT_CRITERIA.map((c) =>
      makeEvaluation(c.id, 10),
    );

    const result = aggregate(evaluations, config, "p1", "t1");

    expect(result.verdict).toBe("REJECT");
    expect(result.hardVeto).toBe(true); // techSafety=10 < 20
    expect(result.finalScore).toBeLessThan(35);
  });

  test("hard veto overrides high final score", () => {
    // All criteria high except techSafety
    const evaluations = DEFAULT_CRITERIA.map((c) =>
      makeEvaluation(c.id, c.id === "techSafety" ? 15 : 95),
    );

    const result = aggregate(evaluations, config, "p1", "t1");

    // Final score would be high without veto
    expect(result.verdict).toBe("REJECT");
    expect(result.hardVeto).toBe(true);
    expect(result.vetoDetail).toBeDefined();
    expect(result.vetoDetail!.criterionId).toBe("techSafety");
    expect(result.vetoDetail!.score).toBe(15);
  });

  test("handles partial evaluations", () => {
    const evaluations = [
      makeEvaluation("techSafety", 70),
      makeEvaluation("econImpact", 80),
    ];

    const result = aggregate(evaluations, config, "p1", "t1");

    expect(result.contributingCriteria).toBe(2);
    // Should still produce results (missing criteria default to 0)
    expect(result.lensResults).toHaveLength(4);
  });

  test("handles empty evaluations", () => {
    const result = aggregate([], config, "p1", "t1");

    expect(result.contributingCriteria).toBe(0);
    expect(result.finalScore).toBe(0);
    expect(result.verdict).toBe("REJECT");
    expect(result.hardVeto).toBe(true); // techSafety = 0 < 20
  });

  test("works without hard veto rule", () => {
    const configNoVeto = { ...config, hardVetoRule: undefined };
    const evaluations = DEFAULT_CRITERIA.map((c) =>
      makeEvaluation(c.id, c.id === "techSafety" ? 10 : 90),
    );

    const result = aggregate(evaluations, configNoVeto, "p1", "t1");

    expect(result.hardVeto).toBe(false);
    // Verdict based purely on score
    expect(result.verdict).not.toBe("REJECT"); // Score is high enough
  });

  test("works with custom criteria and lenses", () => {
    const customConfig = {
      criteria: [
        { id: "a", label: "A", description: "", scoreLow: "", scoreMid: "", scoreHigh: "" },
        { id: "b", label: "B", description: "", scoreLow: "", scoreMid: "", scoreHigh: "" },
      ],
      lenses: [
        {
          id: "l1",
          name: "Lens 1",
          stakeholderType: "test",
          description: "",
          weights: { a: 60, b: 40 },
        },
      ],
      verdictThresholds: DEFAULT_VERDICT_THRESHOLDS,
      hardVetoRule: undefined,
    };

    const evaluations = [
      makeEvaluation("a", 80),
      makeEvaluation("b", 60),
    ];

    const result = aggregate(evaluations, customConfig, "p1", "t1");

    // Expected: (60*80 + 40*60) / 100 = 72
    expect(result.finalScore).toBe(72);
    expect(result.verdict).toBe("NEEDS_REVIEW"); // 65 <= 72 < 80
    expect(result.lensResults).toHaveLength(1);
  });
});
