import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Opinion } from "./types.ts";
import { STAKEHOLDER_LABELS, PERSONALITY_LABELS, VERDICT_COLORS } from "./constants.ts";
import { agentAvatarUrl, timeAgo } from "./helpers.ts";
import { useTranslation, TranslateButton } from "./useTranslation.tsx";
import { ConfidenceBar } from "./ConfidenceBar.tsx";

export function OpinionComment({ opinion }: { opinion: Opinion }) {
  const verdictColor = VERDICT_COLORS[opinion.verdict] ?? "var(--term-text-muted)";
  const priorities: string[] = opinion.prioritiesJson
    ? JSON.parse(opinion.prioritiesJson).map((p: any) =>
        typeof p === "string" ? p : p.label ?? p.id ?? String(p),
      )
    : [];

  const { displayText, loading, showTranslated, toggle } = useTranslation(opinion.reasoning);

  return (
    <div className="forum-comment">
      <img
        className="forum-comment-avatar"
        src={agentAvatarUrl(opinion.agentName)}
        alt={opinion.agentName}
      />
      <div className="forum-comment-body">
        <div className="forum-comment-meta">
          <span className="forum-comment-name">{opinion.agentName}</span>
          <span className="agent-badge stakeholder">
            {STAKEHOLDER_LABELS[opinion.stakeholderType] ?? opinion.stakeholderType}
          </span>
          <span className={`agent-badge personality-${opinion.personality}`}>
            {PERSONALITY_LABELS[opinion.personality] ?? opinion.personality}
          </span>
          <span className="forum-comment-time">{timeAgo(opinion.createdAt)}</span>
        </div>

        <div className="forum-comment-verdict">
          <span className="forum-verdict" style={{ color: verdictColor }}>
            {opinion.verdict}
          </span>
          <ConfidenceBar level={opinion.confidence} />
        </div>

        <div className="forum-comment-text">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
        </div>
        <TranslateButton loading={loading} showTranslated={showTranslated} onClick={toggle} />

        {priorities.length > 0 && (
          <div className="forum-opinion-priorities">
            {priorities.map((p) => (
              <span key={p} className="forum-priority-tag">{p}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
