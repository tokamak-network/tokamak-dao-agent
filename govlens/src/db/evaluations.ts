/**
 * Evaluation & Credibility Data Access
 */

import type {
  CriterionEvaluation,
  AggregatedResult,
  CredibilityRecord,
  DeliberationRound,
} from "../types/index.js";
import { getDb } from "./client.js";

// ─── Criterion Evaluations ───────────────────────────────────

export async function saveCriterionEvaluation(
  eval_: CriterionEvaluation,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO criterion_evaluations (tenant_id, proposal_id, criterion_id, score, evidence, reasoning)
    VALUES (${eval_.tenantId}, ${eval_.proposalId}, ${eval_.criterionId}, ${eval_.score}, ${eval_.evidence}, ${eval_.reasoning})
  `;
}

export async function getCriterionEvaluations(
  proposalId: string,
): Promise<CriterionEvaluation[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM criterion_evaluations
    WHERE proposal_id = ${proposalId}
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    proposalId: r.proposal_id,
    tenantId: r.tenant_id,
    criterionId: r.criterion_id,
    score: r.score,
    evidence: r.evidence,
    reasoning: r.reasoning,
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
  }));
}

// ─── Aggregated Results ──────────────────────────────────────

export async function saveAggregatedResult(
  result: AggregatedResult,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO aggregated_results (
      tenant_id, proposal_id, criterion_scores, lens_results,
      final_score, verdict, hard_veto, veto_detail, contributing_criteria
    ) VALUES (
      ${result.tenantId},
      ${result.proposalId},
      ${JSON.stringify(result.criterionScores)},
      ${JSON.stringify(result.lensResults)},
      ${result.finalScore},
      ${result.verdict},
      ${result.hardVeto},
      ${result.vetoDetail ? JSON.stringify(result.vetoDetail) : null},
      ${result.contributingCriteria}
    )
  `;
}

export async function getLatestAggregatedResult(
  proposalId: string,
): Promise<AggregatedResult | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT * FROM aggregated_results
    WHERE proposal_id = ${proposalId}
    ORDER BY created_at DESC LIMIT 1
  `;
  if (!row) return null;

  return {
    proposalId: row.proposal_id,
    tenantId: row.tenant_id,
    criterionScores:
      typeof row.criterion_scores === "string"
        ? JSON.parse(row.criterion_scores)
        : row.criterion_scores,
    lensResults:
      typeof row.lens_results === "string"
        ? JSON.parse(row.lens_results)
        : row.lens_results,
    finalScore: row.final_score,
    verdict: row.verdict,
    hardVeto: row.hard_veto,
    vetoDetail: row.veto_detail
      ? typeof row.veto_detail === "string"
        ? JSON.parse(row.veto_detail)
        : row.veto_detail
      : undefined,
    contributingCriteria: row.contributing_criteria,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

// ─── Deliberation Rounds ─────────────────────────────────────

export async function saveDeliberationRound(
  round: DeliberationRound,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO deliberation_rounds (id, tenant_id, proposal_id, phase, agent_name, criterion_id, score, reasoning)
    VALUES (${round.id}, ${round.tenantId}, ${round.proposalId}, ${round.phase}, ${round.agentName}, ${round.criterionId}, ${round.score}, ${round.reasoning})
  `;
}

export async function getDeliberationRounds(
  proposalId: string,
): Promise<DeliberationRound[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM deliberation_rounds
    WHERE proposal_id = ${proposalId}
    ORDER BY phase ASC, created_at ASC
  `;
  return rows.map((r) => ({
    id: r.id,
    proposalId: r.proposal_id,
    tenantId: r.tenant_id,
    phase: r.phase,
    agentName: r.agent_name,
    criterionId: r.criterion_id,
    score: r.score,
    reasoning: r.reasoning,
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
  }));
}

// ─── Agent Credibility ───────────────────────────────────────

export async function saveCredibilityRecord(
  record: Omit<CredibilityRecord, "id">,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO agent_credibility (tenant_id, agent_name, proposal_id, predicted_verdict, predicted_score, actual_outcome, score_delta)
    VALUES (${record.tenantId}, ${record.agentName}, ${record.proposalId}, ${record.predictedVerdict}, ${record.predictedScore}, ${record.actualOutcome}, ${record.scoreDelta})
  `;
}

export async function getCredibilityRecords(
  tenantId: string,
): Promise<CredibilityRecord[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM agent_credibility
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
  `;
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    agentName: r.agent_name,
    proposalId: r.proposal_id,
    predictedVerdict: r.predicted_verdict,
    predictedScore: r.predicted_score,
    actualOutcome: r.actual_outcome,
    scoreDelta: r.score_delta,
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
    resolvedAt: r.resolved_at?.toISOString?.() ?? r.resolved_at,
  }));
}

export async function resolveCredibility(
  tenantId: string,
  proposalId: string,
  actualOutcome: string,
  scoreDelta: number,
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE agent_credibility
    SET actual_outcome = ${actualOutcome},
        score_delta = ${scoreDelta},
        resolved_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND proposal_id = ${proposalId}
      AND resolved_at IS NULL
  `;
}
