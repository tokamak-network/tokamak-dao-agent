import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

// ── Types ────────────────────────────────────────────────────────────

interface Agenda {
  id: number;
  title: string;
  content: string;
  onChainAgendaId: number | null;
  creator: string;
  deadline: string;
  status: "open" | "closed" | "archived";
  createdAt: string;
  opinionCount?: number;
}

interface Opinion {
  id: number;
  agendaId: number;
  agentName: string;
  stakeholderType: string;
  personality: string;
  verdict: string;
  reasoning: string;
  confidence: number;
  prioritiesJson: string | null;
  createdAt: string;
}

interface AgendaDetail extends Agenda {
  opinions: Opinion[];
}

// ── Constants ────────────────────────────────────────────────────────

const STAKEHOLDER_LABELS: Record<string, string> = {
  ton_holder: "TON Holder",
  layer2_operator: "Layer2 Operator",
  validator: "Validator",
  foundation: "Foundation",
};

const PERSONALITY_LABELS: Record<string, string> = {
  progressive: "Progressive",
  conservative: "Conservative",
  aggressive: "Aggressive",
  defensive: "Defensive",
};

const VERDICT_COLORS: Record<string, string> = {
  APPROVE: "var(--term-success)",
  REJECT: "var(--term-error)",
  NEEDS_REVIEW: "var(--term-warning)",
  ABSTAIN: "var(--term-text-muted)",
};

// ── Main Component ───────────────────────────────────────────────────

export function ForumTab() {
  const [selectedAgendaId, setSelectedAgendaId] = useState<number | null>(null);

  if (selectedAgendaId !== null) {
    return (
      <AgendaDetailView
        agendaId={selectedAgendaId}
        onBack={() => setSelectedAgendaId(null)}
      />
    );
  }

  return <AgendaListView onSelect={setSelectedAgendaId} />;
}

// ── List View ────────────────────────────────────────────────────────

function AgendaListView({ onSelect }: { onSelect: (id: number) => void }) {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgendas = useCallback(async () => {
    try {
      const res = await fetch("/forum/agenda");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAgendas(data.agendas);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgendas();
    const interval = setInterval(fetchAgendas, 30_000);
    return () => clearInterval(interval);
  }, [fetchAgendas]);

  if (loading) {
    return (
      <div className="forum-container">
        <div className="forum-loading">Loading agendas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="forum-container">
        <div className="forum-error">Failed to load agendas: {error}</div>
      </div>
    );
  }

  if (agendas.length === 0) {
    return (
      <div className="welcome-container">
        <div className="chat-welcome">
          <div className="chat-welcome-title phosphor-glow">Forum</div>
          <div className="chat-welcome-subtitle">
            No agendas yet. Create one via the API to see AI agent opinions here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-container">
      <div className="forum-header">
        <h2 className="forum-title">Forum Agendas</h2>
      </div>
      <div className="forum-agenda-grid">
        {agendas.map((agenda) => (
          <button
            key={agenda.id}
            className="forum-agenda-card"
            onClick={() => onSelect(agenda.id)}
          >
            <div className="forum-agenda-card-top">
              <h3 className="forum-agenda-card-title">{agenda.title}</h3>
              <span
                className="forum-status-badge"
                data-status={agenda.status}
              >
                {agenda.status}
              </span>
            </div>
            <div className="forum-agenda-card-meta">
              <span>Deadline: {new Date(agenda.deadline).toLocaleDateString()}</span>
              <span>{agenda.opinionCount ?? 0} opinions</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Detail View ──────────────────────────────────────────────────────

function AgendaDetailView({
  agendaId,
  onBack,
}: {
  agendaId: number;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<AgendaDetail | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/forum/agenda/${agendaId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setDetail(data);
      } catch (err) {
        console.error("[forum] failed to load agenda detail:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [agendaId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setSummaryLoading(true);
      try {
        const res = await fetch(`/forum/agenda/${agendaId}/summary`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setSummary(data.summaryText ?? data.summary ?? null);
      } catch (err) {
        console.error("[forum] failed to load summary:", err);
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    }

    loadSummary();
    return () => { cancelled = true; };
  }, [agendaId]);

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

  return (
    <div className="forum-container">
      <button className="forum-back-btn" onClick={onBack}>
        &larr; Back to agendas
      </button>

      {/* Agenda header */}
      <div className="forum-detail-header">
        <div className="forum-detail-title-row">
          <h2 className="forum-detail-title">{detail.title}</h2>
          <span className="forum-status-badge" data-status={detail.status}>
            {detail.status}
          </span>
        </div>
        <div className="forum-detail-meta">
          <span>Deadline: {new Date(detail.deadline).toLocaleDateString()}</span>
          <span>Created: {new Date(detail.createdAt).toLocaleDateString()}</span>
          {detail.onChainAgendaId !== null && (
            <span>On-chain ID: #{detail.onChainAgendaId}</span>
          )}
        </div>
        <div className="forum-detail-content">{detail.content}</div>
      </div>

      {/* Opinions */}
      {detail.opinions.length > 0 ? (
        <>
          <h3 className="forum-section-title">Agent Opinions ({detail.opinions.length})</h3>
          <div className="forum-opinions-grid">
            {detail.opinions.map((op) => (
              <OpinionCard key={op.id} opinion={op} />
            ))}
          </div>
        </>
      ) : (
        <div className="forum-empty-opinions">
          No opinions yet. AI agents are still analyzing this agenda...
        </div>
      )}

      {/* Summary */}
      <h3 className="forum-section-title">AI Summary</h3>
      <div className="forum-summary">
        {summaryLoading ? (
          <div className="forum-loading">Generating summary...</div>
        ) : summary ? (
          <ReactMarkdown>{summary}</ReactMarkdown>
        ) : (
          <div className="forum-empty-opinions">
            No summary available yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Opinion Card ─────────────────────────────────────────────────────

function OpinionCard({ opinion }: { opinion: Opinion }) {
  const verdictColor = VERDICT_COLORS[opinion.verdict] ?? "var(--term-text-muted)";
  const priorities: string[] = opinion.prioritiesJson
    ? JSON.parse(opinion.prioritiesJson)
    : [];

  return (
    <div
      className="forum-opinion-card"
      style={{ borderLeftColor: verdictColor }}
    >
      <div className="forum-opinion-header">
        <span className="forum-opinion-name">{opinion.agentName}</span>
        <div className="forum-opinion-badges">
          <span className="agent-badge stakeholder">
            {STAKEHOLDER_LABELS[opinion.stakeholderType] ?? opinion.stakeholderType}
          </span>
          <span className={`agent-badge personality-${opinion.personality}`}>
            {PERSONALITY_LABELS[opinion.personality] ?? opinion.personality}
          </span>
        </div>
      </div>

      <div className="forum-opinion-verdict-row">
        <span className="forum-verdict" style={{ color: verdictColor }}>
          {opinion.verdict}
        </span>
        <ConfidenceBar level={opinion.confidence} />
      </div>

      <div className="forum-opinion-reasoning">{opinion.reasoning}</div>

      {priorities.length > 0 && (
        <div className="forum-opinion-priorities">
          {priorities.map((p) => (
            <span key={p} className="forum-priority-tag">{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Confidence Bar ───────────────────────────────────────────────────

function ConfidenceBar({ level }: { level: number }) {
  const blocks = 5;
  const filled = Math.min(Math.max(Math.round(level), 0), blocks);

  return (
    <div className="forum-confidence" title={`Confidence: ${level}/5`}>
      {Array.from({ length: blocks }, (_, i) => (
        <span
          key={i}
          className={`forum-confidence-block${i < filled ? " filled" : ""}`}
        />
      ))}
    </div>
  );
}
