import { useState, useEffect } from "react";
import type { Opinion } from "./types.ts";
import { FALLBACK_AGENT_NAMES, VERDICT_COLORS } from "./constants.ts";

export function AgentEvaluationPanel({
  agendaId,
  onAllComplete,
}: {
  agendaId: number;
  onAllComplete: () => void;
}) {
  const [opinions, setOpinions] = useState<Opinion[]>([]);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const res = await fetch(`/api/forum/agenda/${agendaId}/opinions`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const ops: Opinion[] = data.opinions ?? [];
        setOpinions(ops);

        const coreReady = FALLBACK_AGENT_NAMES.every((name) =>
          ops.some((o) => o.agentName === name),
        );
        if (coreReady) {
          if (interval) clearInterval(interval);
          interval = null;
          onAllComplete();
        }
      } catch (err) {
        console.error("[forum] agent eval poll error:", err);
      }
    }

    poll();
    interval = setInterval(poll, 3_000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [agendaId, onAllComplete]);

  const opinionMap = new Map(opinions.map((o) => [o.agentName, o]));

  return (
    <div className="forum-validation-panel">
      <h3 className="forum-section-title">Agent Evaluation</h3>
      <div className="forum-agent-eval-grid">
        {FALLBACK_AGENT_NAMES.map((name) => {
          const op = opinionMap.get(name);
          const verdictColor = op
            ? VERDICT_COLORS[op.verdict] ?? "var(--term-text-muted)"
            : undefined;

          return (
            <div
              key={name}
              className={`forum-validation-card ${op ? "pass" : "pending"}`}
              style={op ? { borderColor: verdictColor } : undefined}
            >
              <div className="forum-validation-card-header">
                <span className="forum-validation-type">{name}</span>
                {op ? (
                  <span className="forum-validation-status" style={{ color: verdictColor }}>
                    {op.verdict}
                  </span>
                ) : (
                  <span className="forum-validation-status pending">...</span>
                )}
              </div>
              {op ? (
                <div className="forum-validation-feedback">
                  Confidence: {op.confidence}/5
                </div>
              ) : (
                <div className="forum-validation-feedback dim">Analyzing...</div>
              )}
            </div>
          );
        })}
      </div>

      {!FALLBACK_AGENT_NAMES.every((n) => opinionMap.has(n)) && (
        <div className="forum-validation-waiting">
          Agents are evaluating the proposal...
        </div>
      )}
    </div>
  );
}
