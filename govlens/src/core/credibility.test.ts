/**
 * Credibility Tracking Tests
 */

import { describe, test, expect } from "bun:test";
import {
  isHighConfidence,
  verdictToDirection,
  outcomeToDirection,
  computeCredibilityDelta,
  summarizeCredibility,
} from "./credibility.js";
import type { CredibilityRecord, OutcomeMapping } from "../types/index.js";

const mapping: OutcomeMapping = {
  positiveOutcomes: ["executed", "passed", "approved"],
  negativeOutcomes: ["rejected", "defeated", "expired"],
};

describe("isHighConfidence", () => {
  test("high confidence at extremes", () => {
    expect(isHighConfidence(90)).toBe(true);
    expect(isHighConfidence(70)).toBe(true);
    expect(isHighConfidence(30)).toBe(true);
    expect(isHighConfidence(10)).toBe(true);
  });

  test("low confidence in middle", () => {
    expect(isHighConfidence(50)).toBe(false);
    expect(isHighConfidence(40)).toBe(false);
    expect(isHighConfidence(60)).toBe(false);
    expect(isHighConfidence(69)).toBe(false);
    expect(isHighConfidence(31)).toBe(false);
  });
});

describe("verdictToDirection", () => {
  test("APPROVE is positive", () => {
    expect(verdictToDirection("APPROVE")).toBe("positive");
  });

  test("NEEDS_REVIEW is positive", () => {
    expect(verdictToDirection("NEEDS_REVIEW")).toBe("positive");
  });

  test("REJECT is negative", () => {
    expect(verdictToDirection("REJECT")).toBe("negative");
  });

  test("ABSTAIN is negative", () => {
    expect(verdictToDirection("ABSTAIN")).toBe("negative");
  });
});

describe("outcomeToDirection", () => {
  test("executed is positive", () => {
    expect(outcomeToDirection("executed", mapping)).toBe("positive");
  });

  test("rejected is negative", () => {
    expect(outcomeToDirection("rejected", mapping)).toBe("negative");
  });

  test("unknown defaults to negative", () => {
    expect(outcomeToDirection("unknown", mapping)).toBe("negative");
  });
});

describe("computeCredibilityDelta", () => {
  test("high confidence + correct = +3", () => {
    expect(computeCredibilityDelta("APPROVE", 90, "executed", mapping)).toBe(3);
  });

  test("low confidence + correct = +1", () => {
    expect(computeCredibilityDelta("APPROVE", 55, "executed", mapping)).toBe(1);
  });

  test("high confidence + wrong = -2", () => {
    expect(computeCredibilityDelta("APPROVE", 90, "rejected", mapping)).toBe(-2);
  });

  test("low confidence + wrong = -1", () => {
    expect(computeCredibilityDelta("APPROVE", 55, "rejected", mapping)).toBe(-1);
  });
});

describe("summarizeCredibility", () => {
  test("summarizes records by agent", () => {
    const records: CredibilityRecord[] = [
      {
        id: "1",
        tenantId: "t1",
        agentName: "Agent A",
        proposalId: "p1",
        predictedVerdict: "APPROVE",
        predictedScore: 90,
        actualOutcome: "executed",
        scoreDelta: 3,
        createdAt: "2024-01-01",
        resolvedAt: "2024-01-02",
      },
      {
        id: "2",
        tenantId: "t1",
        agentName: "Agent A",
        proposalId: "p2",
        predictedVerdict: "REJECT",
        predictedScore: 20,
        actualOutcome: "executed",
        scoreDelta: -2,
        createdAt: "2024-01-03",
        resolvedAt: "2024-01-04",
      },
      {
        id: "3",
        tenantId: "t1",
        agentName: "Agent B",
        proposalId: "p1",
        predictedVerdict: "APPROVE",
        predictedScore: 75,
        actualOutcome: "executed",
        scoreDelta: 3,
        createdAt: "2024-01-01",
        resolvedAt: "2024-01-02",
      },
    ];

    const summaries = summarizeCredibility(records);
    expect(summaries).toHaveLength(2);

    // Agent B should be first (higher total score: 3 vs 1)
    expect(summaries[0]!.agentName).toBe("Agent B");
    expect(summaries[0]!.totalScore).toBe(3);
    expect(summaries[0]!.accuracy).toBe(100);

    // Agent A: 3 + (-2) = 1
    expect(summaries[1]!.agentName).toBe("Agent A");
    expect(summaries[1]!.totalScore).toBe(1);
    expect(summaries[1]!.correctCount).toBe(1);
    expect(summaries[1]!.resolvedPredictions).toBe(2);
    expect(summaries[1]!.accuracy).toBe(50);
  });

  test("handles unresolved records", () => {
    const records: CredibilityRecord[] = [
      {
        id: "1",
        tenantId: "t1",
        agentName: "Agent A",
        proposalId: "p1",
        predictedVerdict: "APPROVE",
        predictedScore: 90,
        actualOutcome: null,
        scoreDelta: 0,
        createdAt: "2024-01-01",
        resolvedAt: null,
      },
    ];

    const summaries = summarizeCredibility(records);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.totalPredictions).toBe(1);
    expect(summaries[0]!.resolvedPredictions).toBe(0);
    expect(summaries[0]!.accuracy).toBe(0);
  });
});
