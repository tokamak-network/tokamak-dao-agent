/**
 * ElizaOS Plugin: Tokamak Forum Integration
 *
 * Receives webhook notifications for new DAO agendas,
 * analyzes them using MCP tools, and submits persona-based opinions.
 *
 * Data flow:
 *   POST /forum/agenda (agenda created)
 *     → webhook notification → this plugin's /webhook/new-agenda
 *     → MCP tool calls for on-chain analysis
 *     → LLM generates persona-based opinion
 *     → POST /forum/agenda/:id/opinion
 */

import type { Plugin, IAgentRuntime, Route } from "@elizaos/core";

const FORUM_BASE_URL = process.env.FORUM_BASE_URL || "http://localhost:3333/forum";

/**
 * Analyze an agenda using the agent's MCP tools and submit an opinion.
 */
async function analyzeAndSubmitOpinion(
  runtime: IAgentRuntime,
  agenda: { id: number; title: string; content: string; deadline: string },
): Promise<void> {
  const agentName = runtime.character.username || runtime.character.name;
  const stakeholderType = runtime.character.bio?.[0] || "";
  const personality = runtime.character.bio?.[1] || "";

  // Build analysis prompt incorporating character knowledge and style
  const knowledge = (runtime.character.knowledge || []).join("\n- ");
  const styleGuidelines = (runtime.character.style?.all || []).join("\n- ");

  const analysisPrompt = `당신은 토카막 네트워크 DAO 거버넌스 참여자입니다.

## 당신의 역할
${stakeholderType}
${personality}

## 보유 지식
- ${knowledge}

## 응답 스타일
- ${styleGuidelines}

## 분석할 안건
제목: ${agenda.title}
내용: ${agenda.content}
마감일: ${agenda.deadline}

## 요청사항
이 안건에 대해 다음 형식으로 의견을 제시하세요:

1. **판정** (approve/reject/abstain 중 하나)
2. **근거** (온체인 데이터를 참조하며 3-5문장)
3. **신뢰도** (1-5, 온체인 검증이 뒷받침될수록 높음)
4. **우선순위** (이 안건에서 고려한 상위 3가지 요소)

MCP 도구를 사용하여 관련 온체인 데이터를 조회한 후 의견을 작성하세요.`;

  try {
    // Use runtime's message completion to generate analysis with MCP tool access
    const response = await runtime.useModel({
      prompt: analysisPrompt,
      maxTokens: 2000,
    });

    const responseText = typeof response === "string" ? response : String(response);

    // Parse the LLM response into structured opinion
    const opinion = parseOpinionResponse(responseText);

    // Submit opinion to forum API
    const submitRes = await fetch(`${FORUM_BASE_URL}/agenda/${agenda.id}/opinion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentName,
        stakeholderType: extractStakeholderType(stakeholderType),
        personality: extractPersonality(personality),
        verdict: opinion.verdict,
        reasoning: opinion.reasoning,
        confidence: opinion.confidence,
        priorities: opinion.priorities,
      }),
    });

    if (!submitRes.ok) {
      const errorBody = await submitRes.text();
      console.error(`[tokamak-forum] Failed to submit opinion for agenda ${agenda.id}: ${submitRes.status} ${errorBody}`);
    } else {
      console.log(`[tokamak-forum] ${agentName} submitted opinion for agenda ${agenda.id}: ${opinion.verdict}`);
    }
  } catch (err) {
    console.error(`[tokamak-forum] Error analyzing agenda ${agenda.id}:`, err);
  }
}

/**
 * Parse LLM response into structured opinion fields.
 */
function parseOpinionResponse(text: string): {
  verdict: string;
  reasoning: string;
  confidence: number;
  priorities: { id: string; label: string; weight: number }[];
} {
  // Extract verdict (forum API requires uppercase: APPROVE, REJECT, NEEDS_REVIEW, ABSTAIN)
  let verdict = "ABSTAIN";
  const verdictMatch = text.match(/판정[：:]\s*(approve|reject|abstain|needs_review)/i);
  if (verdictMatch) {
    verdict = verdictMatch[1].toUpperCase();
  } else if (text.includes("찬성") || text.includes("승인")) {
    verdict = "APPROVE";
  } else if (text.includes("반대") || text.includes("거부")) {
    verdict = "REJECT";
  }

  // Extract confidence
  let confidence = 3;
  const confMatch = text.match(/신뢰도[：:]\s*(\d)/);
  if (confMatch) {
    confidence = Math.min(5, Math.max(1, parseInt(confMatch[1])));
  }

  // Extract priorities from numbered/bulleted list after "우선순위"
  const priorities: { id: string; label: string; weight: number }[] = [];
  const prioritySection = text.split(/우선순위/i)[1];
  if (prioritySection) {
    const lines = prioritySection.split("\n").filter((l) => l.trim().match(/^[\d\-\*•]/));
    lines.slice(0, 3).forEach((line, i) => {
      const label = line.replace(/^[\d\.\-\*•\s]+/, "").trim();
      if (label) {
        priorities.push({
          id: `priority_${i + 1}`,
          label: label.slice(0, 100),
          weight: 3 - i, // 3, 2, 1
        });
      }
    });
  }

  // Use full text as reasoning (excluding parsed sections for cleanliness)
  const reasoning = text
    .replace(/우선순위[\s\S]*$/, "")
    .replace(/신뢰도[：:]\s*\d/, "")
    .trim()
    .slice(0, 2000);

  return { verdict, reasoning, confidence, priorities };
}

function extractStakeholderType(bio: string): string {
  if (bio.includes("TON") && bio.includes("보유자")) return "ton_holder";
  if (bio.includes("오퍼레이터") || bio.includes("Layer 2")) return "l2_operator";
  if (bio.includes("검증자") || bio.includes("밸리데이터")) return "validator";
  if (bio.includes("재단")) return "foundation";
  return "other";
}

function extractPersonality(bio: string): string {
  if (bio.includes("진보적") || bio.includes("적극적 생태계 확장")) return "progressive";
  if (bio.includes("보수적") || bio.includes("검증된 방안")) return "conservative";
  if (bio.includes("방어적") || bio.includes("보안 취약점")) return "defensive";
  if (bio.includes("공격적") || bio.includes("과감한")) return "aggressive";
  return "neutral";
}

// ── Plugin Routes ─────────────────────────────────────────────────────

const webhookRoute: Route = {
  type: "POST",
  path: "/webhook/new-agenda",
  handler: async (req: any, res: any, runtime: IAgentRuntime) => {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const agenda = body.data || body;

      if (!agenda.id || !agenda.title) {
        res.status(400).json({ error: "Invalid agenda data: id and title required" });
        return;
      }

      // Respond immediately, process async
      res.status(202).json({ status: "accepted", agendaId: agenda.id });

      // Fire-and-forget analysis
      analyzeAndSubmitOpinion(runtime, agenda).catch((err) =>
        console.error(`[tokamak-forum] Background analysis failed:`, err),
      );
    } catch (err) {
      console.error("[tokamak-forum] Webhook handler error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  },
};

// ── Plugin Actions ────────────────────────────────────────────────────

const analyzeAgendaAction = {
  name: "ANALYZE_AGENDA",
  description: "DAO 안건을 분석하고 페르소나 기반 의견을 제출합니다",
  similes: ["analyze proposal", "review agenda", "안건 분석", "의견 제출"],
  validate: async (_runtime: IAgentRuntime, message: any) => {
    const text = message.content?.text || "";
    return text.includes("agenda") || text.includes("안건") || text.includes("proposal");
  },
  handler: async (runtime: IAgentRuntime, message: any, state: any) => {
    const text = message.content?.text || "";

    // Try to extract agenda ID from message
    const idMatch = text.match(/(?:agenda|안건)\s*#?(\d+)/i);
    if (!idMatch) {
      return { text: "안건 ID를 지정해주세요. 예: 'agenda #1 분석'" };
    }

    const agendaId = parseInt(idMatch[1]);

    // Fetch agenda from forum API
    const res = await fetch(`${FORUM_BASE_URL}/agenda/${agendaId}`);
    if (!res.ok) {
      return { text: `안건 #${agendaId}을 찾을 수 없습니다.` };
    }

    const agenda = (await res.json()) as { id: number; title: string; content: string; deadline: string };

    await analyzeAndSubmitOpinion(runtime, agenda);

    return { text: `안건 #${agendaId} "${agenda.title}"에 대한 분석과 의견 제출이 완료되었습니다.` };
  },
  examples: [
    [
      { user: "user", content: { text: "agenda #5 분석해줘" } },
      { user: "agent", content: { text: "안건 #5에 대한 분석과 의견 제출이 완료되었습니다." } },
    ],
  ],
};

// ── Plugin Definition ─────────────────────────────────────────────────

export const tokamakForumPlugin: Plugin = {
  name: "tokamak-forum",
  description: "토카막 DAO 포럼 통합: 안건 웹훅 수신, 분석, 의견 제출",
  routes: [webhookRoute],
  actions: [analyzeAgendaAction],
};

export default tokamakForumPlugin;
