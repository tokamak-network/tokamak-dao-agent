import { useState, useEffect, useCallback } from "react";
import type { AgendaDetail } from "./types.ts";
import { FALLBACK_AGENT_NAMES, STATUS_LABELS } from "./constants.ts";
import { parseUtc, truncateAddress, getOnChainBadge } from "./helpers.ts";
import { TranslatableContent } from "./TranslatableContent.tsx";
import { AgentEvaluationPanel } from "./AgentEvaluationPanel.tsx";
import { OpinionRequestPanel } from "./OpinionRequestPanel.tsx";
import { OpinionComment } from "./OpinionComment.tsx";
import { UserCommentItem } from "./UserCommentItem.tsx";
import { CommentForm } from "./CommentForm.tsx";
import { AgendaEditView } from "./AgendaEditView.tsx";

export function AgendaDetailView({
  agendaId,
  onBack,
}: {
  agendaId: number;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<AgendaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"opinions" | "comments">("comments");
  const [coreAgentsReady, setCoreAgentsReady] = useState<boolean | null>(null);

  const loadDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/forum/agenda/${agendaId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDetail(data);
    } catch (err) {
      console.error("[forum] failed to load agenda detail:", err);
    } finally {
      setLoading(false);
    }
  }, [agendaId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Initialize coreAgentsReady when detail loads
  useEffect(() => {
    if (!detail || detail.status !== "open") return;
    if (coreAgentsReady !== null) return; // already initialized

    const hasAll = FALLBACK_AGENT_NAMES.every((name) =>
      detail.opinions.some((o) => o.agentName === name),
    );
    if (hasAll) {
      setCoreAgentsReady(true);
      return;
    }

    // Skip loading screen for old agendas (created >2 min ago)
    const ageMs = Date.now() - parseUtc(detail.createdAt).getTime();
    if (ageMs > 2 * 60 * 1000) {
      setCoreAgentsReady(true);
      return;
    }

    setCoreAgentsReady(false);
  }, [detail, coreAgentsReady]);

  const handleCoreAgentsComplete = useCallback(() => {
    setCoreAgentsReady(true);
    setActiveTab("opinions");
    loadDetail();
  }, [loadDetail]);

  if (loading) {
    return (
      <div className="forum-container">
        <div className="forum-loading">Loading agenda...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="forum-container">
        <div className="forum-error">Agenda not found.</div>
      </div>
    );
  }

  if (editing) {
    return (
      <AgendaEditView
        agenda={detail}
        onBack={() => setEditing(false)}
        onUpdated={() => {
          setEditing(false);
          setLoading(true);
          loadDetail();
        }}
      />
    );
  }

  return (
    <div className="forum-container">
      <button className="forum-back-btn" onClick={onBack}>
        &larr; Back to agendas
      </button>

      {/* Agenda header */}
      <div className="forum-detail-header">
        <div className="forum-detail-title-row">
          <h2 className="forum-detail-title">{detail.title}</h2>
          {(() => {
            const badge = getOnChainBadge(detail.onChainStatus);
            return (
              <span className="forum-status-badge" data-status={badge?.dataStatus ?? detail.status}>
                {badge?.label ?? STATUS_LABELS[detail.status] ?? detail.status}
              </span>
            );
          })()}
        </div>
        <div className="forum-detail-meta">
          <span>Created: {parseUtc(detail.onChainCreatedAt ?? detail.createdAt).toLocaleDateString()}</span>
          {detail.creator && detail.creator !== "anonymous" && detail.creator !== "on-chain-sync" && (
            <span className="forum-thread-creator">
              By: {truncateAddress(detail.creator)}
            </span>
          )}
          {detail.onChainAgendaId !== null && (
            <span>On-chain ID: #{detail.onChainAgendaId}</span>
          )}
          {detail.onChainStatus && (
            <span>Result: {detail.onChainStatus}</span>
          )}
        </div>
        <TranslatableContent text={detail.content} />
      </div>

      {/* Validation panel removed — agenda goes directly to QOC evaluation */}

      {/* Agent evaluation loading screen — show while core agents analyze */}
      {detail.status === "open" && coreAgentsReady === false && (
        <AgentEvaluationPanel
          agendaId={agendaId}
          onAllComplete={handleCoreAgentsComplete}
        />
      )}

      {/* Opinion request panel — show when core agents are done */}
      {detail.status === "open" && coreAgentsReady === true && (
        <OpinionRequestPanel
          agendaId={agendaId}
          existingOpinions={detail.opinions}
          onOpinionAdded={loadDetail}
        />
      )}

      {/* Tab bar */}
      <div className="forum-detail-tabs">
        <button
          className={`forum-detail-tab ${activeTab === "comments" ? "active" : ""}`}
          onClick={() => setActiveTab("comments")}
        >
          Comments ({(detail.comments ?? []).length})
        </button>
        <button
          className={`forum-detail-tab ${activeTab === "opinions" ? "active" : ""}`}
          onClick={() => setActiveTab("opinions")}
        >
          Agent Opinions ({detail.opinions.length})
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "opinions" ? (
        detail.opinions.length > 0 ? (
          <div className="forum-comments">
            {detail.opinions.map((op) => (
              <OpinionComment key={op.id} opinion={op} />
            ))}
          </div>
        ) : detail.status === "open" ? (
          <div className="forum-empty-opinions">
            No opinions yet. Use the buttons above to request agent opinions.
          </div>
        ) : (
          <div className="forum-empty-opinions">No agent opinions.</div>
        )
      ) : (
        <div className="forum-comments">
          {(detail.comments ?? []).map((comment) => (
            <UserCommentItem key={comment.id} comment={comment} agendaId={agendaId} onChanged={loadDetail} />
          ))}
          <CommentForm agendaId={agendaId} onCommentAdded={loadDetail} />
        </div>
      )}

    </div>
  );
}
