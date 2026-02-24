/**
 * Proposal Routes
 *
 * GET  /api/v1/tenants/:slug/proposals              — List proposals
 * GET  /api/v1/tenants/:slug/proposals/:id           — Get proposal
 * POST /api/v1/tenants/:slug/proposals/:id/analyze   — Run QOC evaluation
 * POST /api/v1/tenants/:slug/proposals/:id/deliberate — Run deliberation
 * POST /api/v1/tenants/:slug/proposals/:id/simulate  — Simulate execution
 */

import { Hono } from "hono";
import type { Address, Hex } from "viem";
import {
  listProposals,
  getProposal,
  getLatestAggregatedResult,
  saveCriterionEvaluation,
  saveAggregatedResult,
} from "../../db/index.js";
import { requireAuth, requireTenantMatch } from "../middleware/auth.js";
import { simulateProposalExecution } from "../../verification/simulate.js";
import { decodeProposalCalldatas } from "../../verification/decode.js";
import { getChainManager } from "../../chain/client.js";

export const proposalRoutes = new Hono();

// All proposal routes require authentication
proposalRoutes.use("/*", requireAuth, requireTenantMatch);

// ─── GET /proposals ──────────────────────────────────────────

proposalRoutes.get("/", async (c) => {
  const tenant = c.get("tenant");
  const status = c.req.query("status") as any;
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);

  const proposals = await listProposals(tenant.id, { status, limit, offset });

  return c.json({
    proposals: proposals.map((p) => ({
      id: p.id,
      onChainId: p.onChainId,
      title: p.title,
      status: p.status,
      proposer: p.proposer,
      forVotes: p.forVotes.toString(),
      againstVotes: p.againstVotes.toString(),
      abstainVotes: p.abstainVotes.toString(),
      createdAt: p.createdAt,
    })),
    total: proposals.length,
  });
});

// ─── GET /proposals/:id ──────────────────────────────────────

proposalRoutes.get("/:id", async (c) => {
  const tenant = c.get("tenant");
  const proposal = await getProposal(tenant.id, c.req.param("id"));

  if (!proposal) {
    return c.json({ code: "NOT_FOUND", message: "Proposal not found" }, 404);
  }

  // Get latest evaluation if exists
  const evaluation = await getLatestAggregatedResult(proposal.id);

  // Decode calldatas
  const decoded = decodeProposalCalldatas(proposal.calldatas);

  return c.json({
    proposal: {
      id: proposal.id,
      onChainId: proposal.onChainId,
      title: proposal.title,
      description: proposal.description,
      status: proposal.status,
      proposer: proposal.proposer,
      targets: proposal.targets,
      calldatas: decoded,
      forVotes: proposal.forVotes.toString(),
      againstVotes: proposal.againstVotes.toString(),
      abstainVotes: proposal.abstainVotes.toString(),
      startBlock: proposal.startBlock.toString(),
      endBlock: proposal.endBlock.toString(),
      createdAt: proposal.createdAt,
    },
    evaluation: evaluation
      ? {
          finalScore: evaluation.finalScore,
          verdict: evaluation.verdict,
          hardVeto: evaluation.hardVeto,
          lensResults: evaluation.lensResults,
          criterionScores: evaluation.criterionScores,
          contributingCriteria: evaluation.contributingCriteria,
          createdAt: evaluation.createdAt,
        }
      : null,
  });
});

// ─── POST /proposals/:id/analyze ─────────────────────────────

proposalRoutes.post("/:id/analyze", async (c) => {
  const tenant = c.get("tenant");
  const proposal = await getProposal(tenant.id, c.req.param("id"));

  if (!proposal) {
    return c.json({ code: "NOT_FOUND", message: "Proposal not found" }, 404);
  }

  // Import dynamically to avoid circular deps and allow lazy loading
  const { runFullEvaluation } = await import("../../analysis/agents.js");
  const { DEFAULT_CRITERION_AGENTS } = await import("../../core/defaults.js");

  // Get or create LLM provider
  const { getLLMProvider } = await import("../../analysis/provider.js");
  const { provider, model } = getLLMProvider();

  // Generate domain knowledge
  const { getAllAdapters } = await import("../../adapters/index.js");
  const client = getChainManager();
  const adapter = getAllAdapters().find((a) => a.type === tenant.frameworkType);
  const domainKnowledge = adapter
    ? await adapter.generateDomainKnowledge(
        tenant.config.additionalContracts,
        tenant.chainId,
        client,
      )
    : undefined;

  const { evaluations, aggregated } = await runFullEvaluation({
    proposal,
    config: tenant.config,
    criterionAgents: DEFAULT_CRITERION_AGENTS,
    llmProvider: provider,
    model,
    domainKnowledge,
  });

  // Persist results
  for (const evaluation of evaluations) {
    await saveCriterionEvaluation(evaluation);
  }
  await saveAggregatedResult(aggregated);

  return c.json({
    result: {
      finalScore: aggregated.finalScore,
      verdict: aggregated.verdict,
      hardVeto: aggregated.hardVeto,
      vetoDetail: aggregated.vetoDetail,
      lensResults: aggregated.lensResults,
      criterionScores: aggregated.criterionScores,
      contributingCriteria: aggregated.contributingCriteria,
    },
  });
});

// ─── POST /proposals/:id/deliberate ──────────────────────────

proposalRoutes.post("/:id/deliberate", async (c) => {
  const tenant = c.get("tenant");
  const proposal = await getProposal(tenant.id, c.req.param("id"));

  if (!proposal) {
    return c.json({ code: "NOT_FOUND", message: "Proposal not found" }, 404);
  }

  const { runDeliberation } = await import("../../analysis/deliberation.js");
  const { DEFAULT_CRITERION_AGENTS } = await import("../../core/defaults.js");
  const { getLLMProvider } = await import("../../analysis/provider.js");
  const { provider, model } = getLLMProvider();

  const client = getChainManager();
  const { getAllAdapters } = await import("../../adapters/index.js");
  const adapter = getAllAdapters().find((a) => a.type === tenant.frameworkType);
  const domainKnowledge = adapter
    ? await adapter.generateDomainKnowledge(
        tenant.config.additionalContracts,
        tenant.chainId,
        client,
      )
    : undefined;

  const result = await runDeliberation({
    proposal,
    config: tenant.config,
    criterionAgents: DEFAULT_CRITERION_AGENTS,
    llmProvider: provider,
    model,
    domainKnowledge,
  });

  return c.json({
    phase1: {
      finalScore: result.phase1Result.finalScore,
      verdict: result.phase1Result.verdict,
    },
    phase2: {
      finalScore: result.phase2Result.finalScore,
      verdict: result.phase2Result.verdict,
    },
    metaAnalysis: {
      contradictions: result.metaAnalysis.contradictions,
      adjustments: result.metaAnalysis.adjustments,
      synthesis: result.metaAnalysis.synthesis,
    },
    rounds: result.rounds.length,
  });
});

// ─── POST /proposals/:id/simulate ────────────────────────────

proposalRoutes.post("/:id/simulate", async (c) => {
  const tenant = c.get("tenant");
  const proposal = await getProposal(tenant.id, c.req.param("id"));

  if (!proposal) {
    return c.json({ code: "NOT_FOUND", message: "Proposal not found" }, 404);
  }

  if (proposal.targets.length === 0) {
    return c.json({
      code: "NO_CALLDATA",
      message: "Proposal has no execution targets",
    }, 422);
  }

  const client = getChainManager();

  // Find executor (timelock address if available)
  const timelock = tenant.config.additionalContracts.find(
    (c) => c.role === "timelock",
  );

  const result = await simulateProposalExecution(client, tenant.chainId, {
    targets: proposal.targets,
    values: proposal.values,
    calldatas: proposal.calldatas,
    executor: timelock?.address,
  });

  // Decode calldatas for readability
  const decoded = decodeProposalCalldatas(proposal.calldatas);

  return c.json({
    success: result.overallSuccess,
    failedAt: result.failedAt,
    calls: result.results.map((r, i) => ({
      target: proposal.targets[i],
      decoded: decoded[i],
      success: r.success,
      revertReason: r.revertReason,
    })),
  });
});
