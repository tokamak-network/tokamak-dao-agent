/**
 * AI agent opinion auto-generation for forum agendas.
 * Uses user-created agents from DB, falls back to hardcoded defaults when none exist.
 */

import { detectProvider, getOrCreateProvider } from "./providers/index.ts";
import type { ForumAgenda } from "../db/agendas.ts";
import { createOpinion } from "../db/opinions.ts";
import { listAgents } from "../db/agents.ts";
import type { DbAgent } from "../db/agents.ts";
import { OPINION_MODEL, OPINION_MAX_TOKENS } from "../config.ts";

interface AgentConfig {
  agentName: string;
  stakeholderType: string;
  personality: string;
  perspective: string;
}

const FALLBACK_AGENTS: AgentConfig[] = [
  {
    agentName: "Agent Alpha",
    stakeholderType: "ton_holder",
    personality: "progressive",
    perspective: "Token value growth, DeFi utility",
  },
  {
    agentName: "Agent Beta",
    stakeholderType: "layer2_operator",
    personality: "conservative",
    perspective: "Network stability, operator costs",
  },
  {
    agentName: "Agent Gamma",
    stakeholderType: "validator",
    personality: "defensive",
    perspective: "Security, decentralization, validator rewards",
  },
  {
    agentName: "Agent Delta",
    stakeholderType: "foundation",
    personality: "aggressive",
    perspective: "Ecosystem growth, bold moves",
  },
];

const PERSPECTIVE_MAP: Record<string, Record<string, string>> = {
  ton_holder: {
    progressive: "Token value growth, DeFi utility, staker rewards",
    conservative: "Stable yields, predictable staking returns",
    aggressive: "Maximum staker returns, bold economic changes",
    defensive: "Protect staker value, risk mitigation",
  },
  layer2_operator: {
    progressive: "Network growth, new operator opportunities",
    conservative: "Network stability, operator cost predictability",
    aggressive: "Aggressive fee optimization, operator dominance",
    defensive: "Protect operator economics, prevent destabilization",
  },
  validator: {
    progressive: "Validation efficiency, expanded security role",
    conservative: "Proven security model, gradual improvements",
    aggressive: "Stronger security budgets, higher validator rewards",
    defensive: "Security preservation, resist parameter changes",
  },
  foundation: {
    progressive: "Ecosystem expansion, strategic partnerships",
    conservative: "Treasury stability, controlled growth",
    aggressive: "Bold ecosystem moves, rapid expansion",
    defensive: "Treasury protection, risk-averse governance",
  },
};

function derivePerspective(stakeholderType: string, personality: string): string {
  return PERSPECTIVE_MAP[stakeholderType]?.[personality] ?? `${stakeholderType} perspective, ${personality} approach`;
}

function dbAgentToConfig(agent: DbAgent): AgentConfig {
  return {
    agentName: agent.name,
    stakeholderType: agent.stakeholderType,
    personality: agent.personality,
    perspective: derivePerspective(agent.stakeholderType, agent.personality),
  };
}

export function getActiveAgents(): AgentConfig[] {
  const dbAgents = listAgents();
  if (dbAgents.length > 0) {
    return dbAgents.map(dbAgentToConfig);
  }
  return FALLBACK_AGENTS;
}

function buildSystemPrompt(agent: AgentConfig): string {
  return `You are ${agent.agentName}, a Tokamak Network DAO governance analyst.
Stakeholder role: ${agent.stakeholderType}
Analysis style: ${agent.personality}
Focus: ${agent.perspective}

Analyze the governance agenda below and respond with ONLY valid JSON:
{
  "verdict": "APPROVE" | "REJECT" | "NEEDS_REVIEW" | "ABSTAIN",
  "reasoning": "2-4 sentences explaining your position",
  "confidence": <1-5 integer>,
  "priorities": ["priority1", "priority2"]
}

Focus on impacts relevant to your stakeholder perspective.
Write the reasoning field in English.
Do not include any text outside the JSON object.`;
}

function buildUserPrompt(agenda: ForumAgenda): string {
  return `# Agenda: ${agenda.title}

${agenda.content}

Deadline: ${agenda.deadline}
Creator: ${agenda.creator}`;
}

interface AgentResponse {
  verdict: string;
  reasoning: string;
  confidence: number;
  priorities: string[];
}

function parseAgentResponse(text: string): AgentResponse | null {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("[forum-agents] JSON parse failed, trying regex extraction:", err instanceof Error ? err.message : err);
  }

  // Extract JSON from markdown code block or surrounding text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (err) {
      console.error("[forum-agents] regex-extracted JSON parse failed:", err instanceof Error ? err.message : err);
    }
  }

  return null;
}

async function runAgent(agent: AgentConfig, agenda: ForumAgenda): Promise<void> {
  const modelConfig = detectProvider(OPINION_MODEL);
  const provider = await getOrCreateProvider(modelConfig.provider);

  let fullText = "";
  const events = provider.createStream({
    model: modelConfig.model,
    system: buildSystemPrompt(agent),
    messages: [{ role: "user", content: buildUserPrompt(agenda) }],
    tools: [],
    maxTokens: OPINION_MAX_TOKENS,
  });

  for await (const event of events) {
    if (event.type === "text_delta") {
      fullText += event.text;
    }
  }

  const parsed = parseAgentResponse(fullText.trim());
  if (!parsed) {
    console.error(`[forum-agents] ${agent.agentName}: failed to parse response:`, fullText);
    return;
  }

  createOpinion({
    agendaId: agenda.id,
    agentName: agent.agentName,
    stakeholderType: agent.stakeholderType,
    personality: agent.personality,
    verdict: parsed.verdict,
    reasoning: parsed.reasoning,
    confidence: parsed.confidence,
    priorities: parsed.priorities,
  });

  console.log(`[forum-agents] ${agent.agentName}: ${parsed.verdict} (confidence: ${parsed.confidence}/5)`);
}

/**
 * Generate opinions from active AI agents for the given agenda.
 * Uses user-created agents from DB, falls back to 4 default agents when DB is empty.
 * Designed to be called fire-and-forget (no await needed).
 */
export async function generateAgentOpinions(agenda: ForumAgenda): Promise<void> {
  const agents = getActiveAgents();
  console.log(`[forum-agents] generating opinions for agenda #${agenda.id}: "${agenda.title}" (${agents.length} agents)`);

  const results = await Promise.allSettled(
    agents.map((agent) => runAgent(agent, agenda)),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed > 0) {
    for (const r of results) {
      if (r.status === "rejected") {
        console.error("[forum-agents] agent failed:", r.reason);
      }
    }
  }

  console.log(`[forum-agents] agenda #${agenda.id}: ${succeeded}/${agents.length} opinions generated`);
}

/**
 * Generate a single agent's opinion for the given agenda.
 * Returns true if the opinion was generated, false if agent not found.
 */
export async function generateSingleAgentOpinion(
  agenda: ForumAgenda,
  agentName: string,
): Promise<boolean> {
  const agents = getActiveAgents();
  const agent = agents.find((a) => a.agentName === agentName);
  if (!agent) {
    // Try fallback agents explicitly
    const fallback = FALLBACK_AGENTS.find((a) => a.agentName === agentName);
    if (!fallback) return false;
    await runAgent(fallback, agenda);
    return true;
  }
  await runAgent(agent, agenda);
  return true;
}
