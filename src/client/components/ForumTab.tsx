import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ── Types ────────────────────────────────────────────────────────────

interface Agenda {
  id: number;
  title: string;
  content: string;
  onChainAgendaId: number | null;
  creator: string;
  deadline: string;
  status: "draft" | "pending_review" | "rejected" | "open" | "closed" | "archived";
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

interface Validation {
  id: number;
  agendaId: number;
  validatorType: "format" | "relevance" | "feasibility";
  status: "pass" | "fail";
  score: number | null;
  feedback: string;
  createdAt: string;
}

interface AgendaDetail extends Agenda {
  opinions: Opinion[];
}

interface AgentInfo {
  agentName?: string;
  name?: string;
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

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Reviewing",
  rejected: "Rejected",
  open: "Open",
  closed: "Closed",
  archived: "Archived",
};

const FALLBACK_AGENT_NAMES = [
  "Agent Alpha",
  "Agent Beta",
  "Agent Gamma",
  "Agent Delta",
];

// ── Translation Hook ─────────────────────────────────────────────────

function useTranslation(originalText: string) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  const toggle = useCallback(async () => {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }

    if (translated) {
      setShowTranslated(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/forum/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: originalText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTranslated(data.translated);
      setShowTranslated(true);
    } catch (err) {
      console.error("[translate] failed:", err);
    } finally {
      setLoading(false);
    }
  }, [originalText, translated, showTranslated]);

  const displayText = showTranslated && translated ? translated : originalText;

  return { displayText, loading, showTranslated, toggle };
}

// ── Translate Button ─────────────────────────────────────────────────

function TranslateButton({
  loading,
  showTranslated,
  onClick,
}: {
  loading: boolean;
  showTranslated: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="forum-translate-btn"
      onClick={onClick}
      disabled={loading}
    >
      {loading
        ? "Translating..."
        : showTranslated
          ? "Show Original"
          : "Translate"}
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────────────

type ViewState =
  | { view: "list" }
  | { view: "create" }
  | { view: "detail"; agendaId: number };

function agendaIdFromPath(): number | null {
  const match = window.location.pathname.match(/^\/forum\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function isCreatePath(): boolean {
  return window.location.pathname === "/forum/new";
}

function deriveInitialState(): ViewState {
  if (isCreatePath()) return { view: "create" };
  const id = agendaIdFromPath();
  if (id !== null) return { view: "detail", agendaId: id };
  return { view: "list" };
}

export function ForumTab() {
  const [state, setState] = useState<ViewState>(deriveInitialState);

  const goToList = useCallback(() => {
    setState({ view: "list" });
    history.pushState(null, "", "/forum");
  }, []);

  const goToCreate = useCallback(() => {
    setState({ view: "create" });
    history.pushState(null, "", "/forum/new");
  }, []);

  const goToDetail = useCallback((id: number) => {
    setState({ view: "detail", agendaId: id });
    history.pushState(null, "", `/forum/${id}`);
  }, []);

  useEffect(() => {
    const onPopState = () => setState(deriveInitialState());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (state.view === "create") {
    return <AgendaFormView onBack={goToList} onCreated={goToDetail} />;
  }

  if (state.view === "detail") {
    return <AgendaDetailView agendaId={state.agendaId} onBack={goToList} />;
  }

  return <AgendaListView onSelect={goToDetail} onCreate={goToCreate} />;
}

// ── List View ────────────────────────────────────────────────────────

function AgendaListView({
  onSelect,
  onCreate,
}: {
  onSelect: (id: number) => void;
  onCreate: () => void;
}) {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgendas = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/agenda");
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
            No agendas yet. Create one to start the governance discussion.
          </div>
          <button className="forum-create-btn" onClick={onCreate}>
            + New Agenda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-container">
      <div className="forum-header">
        <div className="forum-header-row">
          <h2 className="forum-title">Forum Agendas</h2>
          <button className="forum-create-btn" onClick={onCreate}>
            + New Agenda
          </button>
        </div>
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
                {STATUS_LABELS[agenda.status] ?? agenda.status}
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

// ── Form View ────────────────────────────────────────────────────────

function AgendaFormView({
  onBack,
  onCreated,
  initialData,
}: {
  onBack: () => void;
  onCreated: (id: number) => void;
  initialData?: { title: string; content: string; deadline: string; creator: string };
}) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [deadline, setDeadline] = useState(
    initialData?.deadline
      ? initialData.deadline.slice(0, 16)
      : "",
  );
  const [creator, setCreator] = useState(initialData?.creator ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/forum/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          deadline: new Date(deadline).toISOString(),
          ...(creator ? { creator } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const agenda = await res.json();
      onCreated(agenda.id);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="forum-container">
      <button className="forum-back-btn" onClick={onBack}>
        &larr; Back to agendas
      </button>

      <div className="forum-form-card">
        <h2 className="forum-form-title">New Agenda</h2>
        <p className="forum-form-desc">
          Submit a governance proposal. It will be automatically validated before becoming open for discussion.
        </p>

        <form onSubmit={handleSubmit} className="forum-form">
          <div className="forum-form-field">
            <label className="forum-form-label" htmlFor="agenda-title">
              Title
            </label>
            <input
              id="agenda-title"
              className="forum-form-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Clear, specific proposal title"
              maxLength={200}
              required
            />
          </div>

          <div className="forum-form-field">
            <label className="forum-form-label" htmlFor="agenda-content">
              Content
            </label>
            <textarea
              id="agenda-content"
              className="forum-form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Include: purpose/background, specific proposal, expected outcomes"
              maxLength={10000}
              rows={8}
              required
            />
          </div>

          <div className="forum-form-row">
            <div className="forum-form-field">
              <label className="forum-form-label" htmlFor="agenda-deadline">
                Deadline
              </label>
              <input
                id="agenda-deadline"
                className="forum-form-input"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>

            <div className="forum-form-field">
              <label className="forum-form-label" htmlFor="agenda-creator">
                Creator (optional)
              </label>
              <input
                id="agenda-creator"
                className="forum-form-input"
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="anonymous"
              />
            </div>
          </div>

          {error && <div className="forum-form-error">{error}</div>}

          <button
            type="submit"
            className="forum-form-submit"
            disabled={submitting || !title || !content || !deadline}
          >
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>
        </form>
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
  const [editing, setEditing] = useState(false);

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

  useEffect(() => {
    if (!detail || detail.status !== "open") return;
    let cancelled = false;

    async function loadSummary() {
      setSummaryLoading(true);
      try {
        const res = await fetch(`/api/forum/agenda/${agendaId}/summary`);
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
  }, [agendaId, detail?.status]);

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
          <span className="forum-status-badge" data-status={detail.status}>
            {STATUS_LABELS[detail.status] ?? detail.status}
          </span>
        </div>
        <div className="forum-detail-meta">
          <span>Deadline: {new Date(detail.deadline).toLocaleDateString()}</span>
          <span>Created: {new Date(detail.createdAt).toLocaleDateString()}</span>
          {detail.onChainAgendaId !== null && (
            <span>On-chain ID: #{detail.onChainAgendaId}</span>
          )}
        </div>
        <TranslatableContent text={detail.content} />
      </div>

      {/* Validation panel — show for pending_review and rejected */}
      {(detail.status === "pending_review" || detail.status === "rejected") && (
        <ValidationResultsPanel
          agendaId={agendaId}
          status={detail.status}
          onEdit={() => setEditing(true)}
          onStatusChange={loadDetail}
        />
      )}

      {/* Opinion request panel — show for open */}
      {detail.status === "open" && (
        <OpinionRequestPanel
          agendaId={agendaId}
          existingOpinions={detail.opinions}
          onOpinionAdded={loadDetail}
        />
      )}

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
      ) : detail.status === "open" ? (
        <div className="forum-empty-opinions">
          No opinions yet. Use the buttons above to request agent opinions.
        </div>
      ) : null}

      {/* Summary — only for open agendas with opinions */}
      {detail.status === "open" && detail.opinions.length > 0 && (
        <>
          <h3 className="forum-section-title">AI Summary</h3>
          <div className="forum-summary">
            {summaryLoading ? (
              <div className="forum-loading">Generating summary...</div>
            ) : summary ? (
              <TranslatableMarkdown text={summary} />
            ) : (
              <div className="forum-empty-opinions">
                No summary available yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Edit View ────────────────────────────────────────────────────────

function AgendaEditView({
  agenda,
  onBack,
  onUpdated,
}: {
  agenda: AgendaDetail;
  onBack: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(agenda.title);
  const [content, setContent] = useState(agenda.content);
  const [deadline, setDeadline] = useState(agenda.deadline.slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/forum/agenda/${agenda.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          deadline: new Date(deadline).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      onUpdated();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="forum-container">
      <button className="forum-back-btn" onClick={onBack}>
        &larr; Back to agenda
      </button>

      <div className="forum-form-card">
        <h2 className="forum-form-title">Edit & Resubmit</h2>
        <p className="forum-form-desc">
          Modify your proposal and resubmit for validation.
        </p>

        <form onSubmit={handleSubmit} className="forum-form">
          <div className="forum-form-field">
            <label className="forum-form-label" htmlFor="edit-title">
              Title
            </label>
            <input
              id="edit-title"
              className="forum-form-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="forum-form-field">
            <label className="forum-form-label" htmlFor="edit-content">
              Content
            </label>
            <textarea
              id="edit-content"
              className="forum-form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={10000}
              rows={8}
              required
            />
          </div>

          <div className="forum-form-field">
            <label className="forum-form-label" htmlFor="edit-deadline">
              Deadline
            </label>
            <input
              id="edit-deadline"
              className="forum-form-input"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>

          {error && <div className="forum-form-error">{error}</div>}

          <button
            type="submit"
            className="forum-form-submit"
            disabled={submitting || !title || !content || !deadline}
          >
            {submitting ? "Resubmitting..." : "Resubmit for Review"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Validation Results Panel ─────────────────────────────────────────

function ValidationResultsPanel({
  agendaId,
  status,
  onEdit,
  onStatusChange,
}: {
  agendaId: number;
  status: "pending_review" | "rejected";
  onEdit: () => void;
  onStatusChange: () => void;
}) {
  const [validations, setValidations] = useState<Validation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchValidations() {
      try {
        const res = await fetch(`/api/forum/agenda/${agendaId}/validations`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setValidations(data.validations);
          setLoading(false);

          // Stop polling if all 3 validations are in
          if (data.validations.length === 3 && interval) {
            clearInterval(interval);
            interval = null;
            // Status might have changed, refresh parent
            onStatusChange();
          }
        }
      } catch (err) {
        console.error("[forum] failed to load validations:", err);
      }
    }

    fetchValidations();

    // Poll if still pending
    if (status === "pending_review") {
      interval = setInterval(fetchValidations, 3_000);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [agendaId, status, onStatusChange]);

  const validatorLabels: Record<string, string> = {
    format: "Format",
    relevance: "Relevance",
    feasibility: "Feasibility",
  };

  const isPending = status === "pending_review" && validations.length < 3;

  return (
    <div className="forum-validation-panel">
      <h3 className="forum-section-title">Validation Results</h3>
      <div className="forum-validation-grid">
        {["format", "relevance", "feasibility"].map((type) => {
          const v = validations.find((v) => v.validatorType === type);
          return (
            <div
              key={type}
              className={`forum-validation-card ${v ? v.status : "pending"}`}
            >
              <div className="forum-validation-card-header">
                <span className="forum-validation-type">
                  {validatorLabels[type]}
                </span>
                {v ? (
                  <span
                    className={`forum-validation-status ${v.status}`}
                  >
                    {v.status === "pass" ? "PASS" : "FAIL"}
                    {v.score !== null && ` (${v.score}/10)`}
                  </span>
                ) : (
                  <span className="forum-validation-status pending">
                    {isPending ? "..." : "N/A"}
                  </span>
                )}
              </div>
              {v ? (
                <div className="forum-validation-feedback">{v.feedback}</div>
              ) : isPending ? (
                <div className="forum-validation-feedback dim">
                  Analyzing...
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {status === "rejected" && (
        <button className="forum-form-submit resubmit" onClick={onEdit}>
          Edit and Resubmit
        </button>
      )}

      {isPending && (
        <div className="forum-validation-waiting">
          Validation in progress...
        </div>
      )}
    </div>
  );
}

// ── Opinion Request Panel ────────────────────────────────────────────

function OpinionRequestPanel({
  agendaId,
  existingOpinions,
  onOpinionAdded,
}: {
  agendaId: number;
  existingOpinions: Opinion[];
  onOpinionAdded: () => void;
}) {
  const [agents, setAgents] = useState<string[]>([]);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/forum/agent");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const customNames = (data.agents ?? []).map(
          (a: AgentInfo) => a.name ?? a.agentName ?? "Unknown",
        );
        // Core agents + custom agents, deduplicated
        const all = [...FALLBACK_AGENT_NAMES, ...customNames.filter(
          (n: string) => !FALLBACK_AGENT_NAMES.includes(n),
        )];
        setAgents(all);
      } catch {
        setAgents(FALLBACK_AGENT_NAMES);
      }
    }
    fetchAgents();
  }, []);

  const existingNames = new Set(existingOpinions.map((o) => o.agentName));

  const handleRequest = async (agentName: string) => {
    setRequesting(agentName);
    setStatusMsg({ text: `${agentName} is analyzing the agenda...`, type: "info" });

    try {
      const res = await fetch(`/api/forum/agenda/${agendaId}/opinion/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName }),
      });

      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

      if (res.status === 409) {
        setStatusMsg({ text: `${agentName} has already submitted an opinion.`, type: "info" });
        onOpinionAdded();
      } else if (res.status === 201) {
        setStatusMsg({ text: `${agentName} submitted their opinion!`, type: "success" });
        onOpinionAdded();
        setTimeout(() => setStatusMsg(null), 5_000);
      } else {
        setStatusMsg({ text: `Error: ${data.error || "Unknown error"}`, type: "error" });
      }
    } catch (err) {
      console.error("[forum] opinion request error:", err);
      setStatusMsg({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="forum-opinion-request-panel">
      <h3 className="forum-section-title">Request Agent Opinions</h3>

      {statusMsg && (
        <div className={`forum-request-status ${statusMsg.type}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="forum-agent-request-grid">
        {agents.map((name) => {
          const hasOpinion = existingNames.has(name);
          const isLoading = requesting === name;

          return (
            <button
              key={name}
              className={`forum-agent-request-btn ${hasOpinion ? "done" : ""}`}
              onClick={() => handleRequest(name)}
              disabled={hasOpinion || requesting !== null}
            >
              {isLoading ? (
                <span className="forum-agent-btn-loading">Generating...</span>
              ) : hasOpinion ? (
                <>
                  <span className="forum-agent-btn-check">&#10003;</span>
                  {name}
                </>
              ) : (
                <>Ask {name}</>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Translatable Content Wrappers ────────────────────────────────────

function TranslatableContent({ text }: { text: string }) {
  const { displayText, loading, showTranslated, toggle } = useTranslation(text);

  return (
    <>
      <div className="forum-detail-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown></div>
      <TranslateButton loading={loading} showTranslated={showTranslated} onClick={toggle} />
    </>
  );
}

function TranslatableMarkdown({ text }: { text: string }) {
  const { displayText, loading, showTranslated, toggle } = useTranslation(text);

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
      <TranslateButton loading={loading} showTranslated={showTranslated} onClick={toggle} />
    </>
  );
}

// ── Opinion Card ─────────────────────────────────────────────────────

function OpinionCard({ opinion }: { opinion: Opinion }) {
  const verdictColor = VERDICT_COLORS[opinion.verdict] ?? "var(--term-text-muted)";
  const priorities: string[] = opinion.prioritiesJson
    ? JSON.parse(opinion.prioritiesJson).map((p: any) =>
        typeof p === "string" ? p : p.label ?? p.id ?? String(p),
      )
    : [];

  const { displayText, loading, showTranslated, toggle } = useTranslation(opinion.reasoning);

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

      <div className="forum-opinion-reasoning"><ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown></div>
      <TranslateButton loading={loading} showTranslated={showTranslated} onClick={toggle} />

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
