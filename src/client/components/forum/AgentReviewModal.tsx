import { useState, useEffect } from "react";
import type { Opinion } from "./types.ts";
import { FALLBACK_AGENT_NAMES, STAKEHOLDER_LABELS, VERDICT_COLORS } from "./constants.ts";
import { agentAvatarUrl } from "./helpers.ts";
import { ConfidenceBar } from "./ConfidenceBar.tsx";

export function AgentReviewModalContent({
  agendaId,
  onViewResults,
}: {
  agendaId: number;
  onViewResults: () => void;
}) {
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [allDone, setAllDone] = useState(false);

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
          setAllDone(true);
        }
      } catch (err) {
        console.error("[forum] agent review poll error:", err);
      }
    }

    poll();
    interval = setInterval(poll, 3_000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [agendaId]);

  const opinionMap = new Map(opinions.map((o) => [o.agentName, o]));
  const doneCount = FALLBACK_AGENT_NAMES.filter((n) => opinionMap.has(n)).length;
  const total = FALLBACK_AGENT_NAMES.length;

  return (
    <>
      <div className="review-modal-header">
        <h3 className="review-modal-title">Agent Review</h3>
        <p className="review-modal-desc">
          {allDone
            ? "All agents have completed their review."
            : "AI agents are analyzing your proposal from different stakeholder perspectives."}
        </p>
        <div className="review-modal-progress">
          <div className="review-modal-progress-bar">
            <div
              className="review-modal-progress-fill"
              style={{ width: `${(doneCount / total) * 100}%` }}
            />
          </div>
          <span className="review-modal-progress-label">{doneCount} of {total} complete</span>
        </div>
      </div>

      <div className="review-modal-grid">
        {FALLBACK_AGENT_NAMES.map((name) => {
          const op = opinionMap.get(name);
          const verdictColor = op
            ? VERDICT_COLORS[op.verdict] ?? "var(--term-text-muted)"
            : undefined;
          const stakeholder = op
            ? STAKEHOLDER_LABELS[op.stakeholderType] ?? op.stakeholderType
            : null;
          const reasoning = op?.reasoning ?? "";
          const snippet = reasoning.length > 120
            ? reasoning.slice(0, 120).trimEnd() + "..."
            : reasoning;

          return (
            <div
              key={name}
              className={`review-modal-card ${op ? "done" : "pending"}`}
              style={op ? { borderColor: verdictColor } : undefined}
            >
              <div className="review-modal-card-top">
                <img
                  className="review-modal-avatar"
                  src={agentAvatarUrl(name)}
                  alt={name}
                />
                <div className="review-modal-card-info">
                  <span className="review-modal-agent-name">{name}</span>
                  {stakeholder && (
                    <span className="review-modal-stakeholder">{stakeholder}</span>
                  )}
                </div>
                {op ? (
                  <span className="review-modal-verdict" style={{ color: verdictColor }}>
                    {op.verdict}
                  </span>
                ) : (
                  <span className="review-modal-verdict pending">Analyzing...</span>
                )}
              </div>
              {op ? (
                <>
                  <ConfidenceBar level={op.confidence} />
                  <p className="review-modal-reasoning">{snippet}</p>
                </>
              ) : (
                <div className="review-modal-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <button className="forum-form-submit review-modal-btn" onClick={onViewResults}>
          View Full Results
        </button>
      )}
    </>
  );
}
