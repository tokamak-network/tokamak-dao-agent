import { useState, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat } from "./chat/useChat.ts";
import { ChatBubble } from "./chat/ChatBubble.tsx";
import { ChatInput } from "./chat/ChatInput.tsx";
import type { Message } from "./chat/types.ts";
import { useWallet } from "../contexts/WalletContext.tsx";
import { isWalletConfigured } from "../config/wagmi.ts";

// ── Types ────────────────────────────────────────────────────────────

interface Agenda {
  id: number;
  title: string;
  content: string;
  onChainAgendaId: number | null;
  onChainCreatedAt: string | null;
  onChainStatus: string | null;
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

interface UserComment {
  id: number;
  agendaId: number;
  walletAddress: string;
  content: string;
  createdAt: string;
}

interface AgendaDetail extends Agenda {
  updatedAt: string;
  opinions: Opinion[];
  comments: UserComment[];
}

interface AgentInfo {
  agentName?: string;
  name?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Parse a date string as UTC (SQLite datetime('now') omits the Z suffix). */
function parseUtc(dateStr: string): Date {
  const s = dateStr.endsWith("Z") || dateStr.includes("+") ? dateStr : dateStr + "Z";
  return new Date(s);
}

function truncateAddress(addr: string): string {
  if (!addr || addr === "anonymous") return "Anonymous";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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

/** Map on-chain status string (e.g. "EXECUTED / ACCEPT") to a display label and data-status for CSS. */
function getOnChainBadge(onChainStatus: string | null): { label: string; dataStatus: string } | null {
  if (!onChainStatus) return null;
  const status = onChainStatus.split("/")[0]!.trim();
  switch (status) {
    case "EXECUTED":
      return { label: "Executed", dataStatus: "executed" };
    case "ENDED":
      return { label: "Ended", dataStatus: "closed" };
    case "NOTICE":
      return { label: "Notice", dataStatus: "pending_review" };
    case "VOTING":
      return { label: "Voting", dataStatus: "open" };
    case "WAITING_EXEC":
      return { label: "Waiting", dataStatus: "draft" };
    default:
      return null;
  }
}

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
    return <AgendaWizard onBack={goToList} onCreated={goToDetail} />;
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
  const { isConnected, openModal } = useWallet();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    if (isWalletConfigured && !isConnected) {
      openModal();
      return;
    }
    onCreate();
  }, [isConnected, openModal, onCreate]);

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
          <button className="forum-create-btn" onClick={handleCreate}>
            {isWalletConfigured && !isConnected ? "Connect Wallet to Create" : "+ New Agenda"}
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
          <button className="forum-create-btn" onClick={handleCreate}>
            {isWalletConfigured && !isConnected ? "Connect Wallet to Create" : "+ New Agenda"}
          </button>
        </div>
      </div>
      <div className="forum-thread-list">
        <div className="forum-thread-header">
          <span className="forum-thread-header-topic">Topic</span>
          <span className="forum-thread-header-stat" style={{ width: 80 }}>Opinions</span>
          <span className="forum-thread-header-stat" style={{ width: 100 }}>Activity</span>
        </div>
        {agendas.map((agenda) => (
          <button
            key={agenda.id}
            className="forum-thread-row"
            onClick={() => onSelect(agenda.id)}
          >
            <div className="forum-thread-main">
              <div className="forum-thread-title-line">
                {(() => {
                  const badge = getOnChainBadge(agenda.onChainStatus);
                  return (
                    <span
                      className="forum-status-badge"
                      data-status={badge?.dataStatus ?? agenda.status}
                    >
                      {badge?.label ?? STATUS_LABELS[agenda.status] ?? agenda.status}
                    </span>
                  );
                })()}
                <span className="forum-thread-title">{agenda.title}</span>
              </div>
              {agenda.creator && agenda.creator !== "anonymous" && agenda.creator !== "on-chain-sync" && (
                <span className="forum-thread-creator">{truncateAddress(agenda.creator)}</span>
              )}
            </div>
            <div className="forum-thread-stats">
              <span className="forum-thread-stat-opinions">
                {agenda.opinionCount ?? 0}
              </span>
              <span className="forum-thread-stat-activity">
                {parseUtc(agenda.onChainCreatedAt ?? agenda.createdAt).toLocaleDateString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Agenda Draft Types & Extraction ───────────────────────────────────

interface AgendaDraftCalldata {
  description: string;
  targets: string[];
  functionBytecodes: string[];
  atomicExecute: boolean;
  decodedCalls: {
    target: string;
    targetName: string;
    functionName: string;
    args: { name: string; value: string }[];
    calldata: string;
  }[];
}

interface AgendaDraft {
  title?: string;
  content?: string;
  calldata?: AgendaDraftCalldata;
}

function extractAgendaDraft(messages: Message[]): AgendaDraft | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    const text = msg.parts
      .filter((p) => p.type === "text" && p.content)
      .map((p) => p.content)
      .join("");
    const match = text.match(/```agenda-draft\s*\n([\s\S]*?)\n```/);
    if (match) {
      try {
        const data = JSON.parse(match[1]!);
        return data as AgendaDraft;
      } catch {}
    }
  }
  return null;
}

// ── TIP prefix helpers ───────────────────────────────────────────────

function stripTipPrefix(title: string): string {
  return title.replace(/^TIP-[^:]*:\s*/, "");
}

function makeTipPrefix(n: number): string {
  return `TIP-${n}: `;
}

function ensureTipPrefix(title: string, n: number): string {
  const bare = stripTipPrefix(title);
  return bare ? `${makeTipPrefix(n)}${bare}` : "";
}

// ── Wizard Suggestions ───────────────────────────────────────────────

const WIZARD_SUGGESTIONS = [
  "Change the DAO seigniorage rate",
  "Approve TON from the DAO vault",
  "Update the minimum staking amount",
  "Change the agenda creation fee",
];

// ── AgendaWizard (Split-Panel) ───────────────────────────────────────

function AgendaWizard({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (id: number) => void;
}) {
  const { address, isConnected, openModal } = useWallet();
  const chat = useChat(undefined, "forum_proposal");
  const [draft, setDraft] = useState<AgendaDraft>({});
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{ agendaId: number } | null>(null);
  const [calldataExpanded, setCalldataExpanded] = useState(false);
  const [contentPreview, setContentPreview] = useState(false);
  const [nextTipNumber, setNextTipNumber] = useState<number>(1);

  // Fetch next TIP number from backend
  useEffect(() => {
    fetch("/api/forum/agenda/next-tip-number")
      .then((r) => r.json())
      .then((data) => setNextTipNumber(data.nextTipNumber ?? 1))
      .catch(() => {});
  }, []);

  // Extract draft from AI messages
  const latestDraft = useMemo(() => extractAgendaDraft(chat.messages), [chat.messages]);

  useEffect(() => {
    if (!latestDraft) return;
    setDraft((prev) => {
      const next = { ...prev };
      if (latestDraft.title && !userEditedFields.has("title")) next.title = ensureTipPrefix(latestDraft.title, nextTipNumber);
      if (latestDraft.content && !userEditedFields.has("content")) next.content = latestDraft.content;
      if (latestDraft.calldata) next.calldata = latestDraft.calldata;
      return next;
    });
  }, [latestDraft, userEditedFields, nextTipNumber]);

  const handleTitleChange = (val: string) => {
    setUserEditedFields((s) => new Set(s).add("title"));
    setDraft((d) => ({ ...d, title: ensureTipPrefix(val, nextTipNumber) }));
  };

  const handleContentChange = (val: string) => {
    setUserEditedFields((s) => new Set(s).add("content"));
    setDraft((d) => ({ ...d, content: val }));
  };

  const resetField = (field: "title" | "content") => {
    setUserEditedFields((s) => {
      const next = new Set(s);
      next.delete(field);
      return next;
    });
    if (latestDraft) {
      const val = latestDraft[field] ?? undefined;
      setDraft((d) => ({
        ...d,
        [field]: field === "title" && val ? ensureTipPrefix(val, nextTipNumber) : val ?? d[field],
      }));
    }
  };

  const walletReady = !isWalletConfigured || isConnected;
  const isReady = !!(draft.title && draft.content && draft.calldata && walletReady);

  // Build the full content with on-chain execution details appended
  const buildFinalContent = (): string => {
    let finalContent = draft.content || "";
    if (draft.calldata) {
      const calls = draft.calldata.decodedCalls || [];
      const execSection = calls
        .map((c, i) => {
          const argsStr = c.args
            .filter((a) => a.name != null && a.value != null)
            .map((a) => `  - **${a.name}**: \`${a.value}\``)
            .join("\n");
          return `### Call ${calls.length > 1 ? i + 1 : ""}
- **Target**: ${c.targetName} (\`${c.target}\`)
- **Function**: \`${c.functionName}\`
${argsStr ? `- **Arguments**:\n${argsStr}` : ""}
- **Calldata**: \`${c.calldata}\``;
        })
        .join("\n\n");

      finalContent += `\n\n## On-Chain Execution\n\n${execSection}`;
    }
    return finalContent;
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/forum/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          content: buildFinalContent(),
          creator: address,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const agenda = await res.json();
      setReviewModal({ agendaId: agenda.id, allDone: false });
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-scroll chat when messages update
  useEffect(() => {
    chat.messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]);

  // Determine wizard step
  const step = draft.calldata ? 3 : draft.title ? 2 : 1;

  // Split assistant messages that contain ```question blocks into two bubbles
  const displayMessages = useMemo(() => {
    return chat.messages.flatMap((msg, idx) => {
      // Don't split the last message while streaming
      if (msg.role !== "assistant") return [msg];
      if (chat.isLoading && idx === chat.messages.length - 1) return [msg];

      const fullText = msg.parts
        .filter((p) => p.type === "text")
        .map((p) => p.content || "")
        .join("");
      const qMatch = fullText.match(/```question\s*\n([\s\S]*?)\n```/);
      if (!qMatch) return [msg];

      const mainParts = msg.parts.map((p) =>
        p.type === "text"
          ? { ...p, content: (p.content || "").replace(/```question\s*\n[\s\S]*?\n```\s*$/, "").trimEnd() }
          : p
      );
      const questionMsg: Message = {
        role: "assistant",
        content: qMatch[1]!,
        parts: [{ type: "text", content: qMatch[1]! }],
        timestamp: msg.timestamp,
      };
      return [{ ...msg, parts: mainParts }, questionMsg];
    });
  }, [chat.messages, chat.isLoading]);

  const hasMessages = chat.messages.length > 0;

  return (
    <div className="wizard-container">
      {/* Left Panel: Chat */}
      <div className="wizard-left">
        <div className="wizard-left-header">
          <button className="forum-back-btn" onClick={onBack} style={{ margin: 0 }}>
            &larr; Back
          </button>
          <span className="wizard-left-title">Proposal Wizard</span>
          {hasMessages && (
            <button
              className="wizard-new-chat-btn"
              onClick={chat.handleNewChat}
              title="Start over"
            >
              New
            </button>
          )}
        </div>

        <div className="wizard-chat-area">
          {!hasMessages ? (
            <div className="wizard-welcome">
              <div className="wizard-welcome-title">What would you like to propose?</div>
              <div className="wizard-welcome-desc">
                Describe your governance idea and I'll help you build a complete proposal with executable calldata.
              </div>
              <div className="wizard-suggestions">
                {WIZARD_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="chat-suggestion-btn"
                    onClick={() => chat.handleSuggestion(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="wizard-messages">
              {displayMessages.map((msg, i) => (
                <ChatBubble
                  key={i}
                  message={msg}
                  isStreaming={
                    chat.isLoading &&
                    i === displayMessages.length - 1 &&
                    msg.role === "assistant"
                  }
                />
              ))}
              <div ref={chat.messagesEndRef} />
            </div>
          )}
        </div>

        <div className="wizard-input-area">
          <ChatInput
            value={chat.input}
            onChange={chat.setInput}
            onSubmit={() => chat.handleSubmit()}
            isLoading={chat.isLoading}
            inputRef={chat.inputRef}
          />
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="wizard-right">
        {/* Step Indicator */}
        <div className="wizard-steps">
          <div className={`wizard-step ${step >= 1 ? "active" : ""} ${step > 1 ? "done" : ""}`}>
            <span className="wizard-step-num">1</span>
            <span className="wizard-step-label">Draft</span>
          </div>
          <div className="wizard-step-line" />
          <div className={`wizard-step ${step >= 2 ? "active" : ""} ${step > 2 ? "done" : ""}`}>
            <span className="wizard-step-num">2</span>
            <span className="wizard-step-label">Review</span>
          </div>
          <div className="wizard-step-line" />
          <div className={`wizard-step ${step >= 3 ? "active" : ""}`}>
            <span className="wizard-step-num">3</span>
            <span className="wizard-step-label">Submit</span>
          </div>
        </div>

        {/* Title */}
        <div className="wizard-field">
          <div className="wizard-field-header">
            <label className="forum-form-label">Title</label>
            {userEditedFields.has("title") && (
              <button className="wizard-reset-btn" onClick={() => resetField("title")} title="Sync with AI">
                &#x21bb;
              </button>
            )}
          </div>
          <textarea
            className="forum-form-input wizard-title-input"
            value={draft.title || ""}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="AI will suggest a title..."
            maxLength={200}
            rows={1}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            ref={(el) => {
              if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
            }}
          />
        </div>

        {/* Content */}
        <div className="wizard-field wizard-field-grow">
          <div className="wizard-field-header">
            <label className="forum-form-label">Content</label>
            <div className="wizard-field-actions">
              <button
                className={`wizard-preview-btn ${contentPreview ? "active" : ""}`}
                onClick={() => setContentPreview(!contentPreview)}
              >
                {contentPreview ? "Edit" : "Preview"}
              </button>
              {userEditedFields.has("content") && (
                <button className="wizard-reset-btn" onClick={() => resetField("content")} title="Sync with AI">
                  &#x21bb;
                </button>
              )}
            </div>
          </div>
          {contentPreview ? (
            <div className="wizard-content-preview">
              {draft.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.content}</ReactMarkdown>
              ) : (
                <span className="wizard-content-preview-empty">No content yet</span>
              )}
            </div>
          ) : (
            <textarea
              className="forum-form-textarea wizard-content-textarea"
              value={draft.content || ""}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="AI will build the proposal content..."
              maxLength={10000}
            />
          )}
        </div>

        {/* Calldata */}
        <div className="wizard-field">
          <label className="forum-form-label">On-Chain Calldata</label>
          {draft.calldata ? (
            <div className="wizard-calldata">
              <button
                className="wizard-calldata-header"
                onClick={() => setCalldataExpanded(!calldataExpanded)}
              >
                <span className="wizard-calldata-icon">TX</span>
                <span className="wizard-calldata-desc">{draft.calldata.description}</span>
                <span className={`tool-call-chevron ${calldataExpanded ? "open" : ""}`}>&#9654;</span>
              </button>
              {calldataExpanded && (
                <div className="wizard-calldata-body">
                  {draft.calldata.decodedCalls.map((call, i) => (
                    <div key={i} className="wizard-calldata-call">
                      <div className="wizard-calldata-fn">
                        <span className="proposal-call-fn">{call.functionName}</span>
                        <span className="proposal-call-target">{call.targetName}</span>
                      </div>
                      {call.args.length > 0 && (
                        <ul className="wizard-calldata-args">
                          {call.args.map((a, j) => (
                            <li key={j}>
                              <code>{a.name}</code>: {a.value}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="wizard-calldata-raw">
                        <code>{call.calldata}</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="wizard-calldata-empty">
              Chat with AI to generate executable calldata
            </div>
          )}
        </div>

        {/* Submit */}
        {error && <div className="forum-form-error">{error}</div>}

        {isWalletConfigured && !isConnected ? (
          <button
            className="forum-form-submit wizard-submit"
            onClick={() => openModal()}
          >
            Connect Wallet to Submit
          </button>
        ) : (
          <button
            className="forum-form-submit wizard-submit"
            disabled={!isReady || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>
        )}

        {isReady ? null : walletReady ? (
          <div className="wizard-submit-hint">
            {!draft.title
              ? "Describe your proposal in the chat to get started"
              : !draft.content
                ? "Continue chatting to build proposal content"
                : "Waiting for AI to generate calldata..."}
          </div>
        ) : null}
      </div>

      {/* Review modal overlay */}
      {reviewModal && (
        <div className="forum-review-modal-overlay">
          <div className="forum-review-modal">
            <AgentReviewModalContent
              agendaId={reviewModal.agendaId}
              onViewResults={() => {
                const id = reviewModal.agendaId;
                setReviewModal(null);
                onCreated(id);
              }}
            />
          </div>
        </div>
      )}
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

// ── Agent Review Modal Content (rich modal after submit) ─────────────

function AgentReviewModalContent({
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

// ── Agent Evaluation Panel (auto-polling loading screen) ─────────────

function AgentEvaluationPanel({
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

// ── Opinion Comment ──────────────────────────────────────────────────

function agentAvatarUrl(name: string): string {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - parseUtc(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function OpinionComment({ opinion }: { opinion: Opinion }) {
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

// ── User Comment Item ────────────────────────────────────────────────

function UserCommentItem({
  comment,
  agendaId,
  onChanged,
}: {
  comment: UserComment;
  agendaId: number;
  onChanged: () => void;
}) {
  const { address } = useWallet();
  const isOwner = !!address && address.toLowerCase() === comment.walletAddress.toLowerCase();
  const initials = comment.walletAddress.slice(2, 4).toUpperCase();

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!editContent.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/forum/agenda/${agendaId}/comment/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, content: editContent.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this comment?")) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/forum/agenda/${agendaId}/comment/${comment.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onChanged();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="forum-comment">
      <div className="forum-comment-avatar-wallet">{initials}</div>
      <div className="forum-comment-body">
        <div className="forum-comment-meta">
          <span className="forum-comment-name">
            {truncateAddress(comment.walletAddress)}
          </span>
          <span className="forum-comment-time">{timeAgo(comment.createdAt)}</span>
          {isOwner && !editing && (
            <span className="forum-comment-actions">
              <button className="forum-comment-action-btn" onClick={() => { setEditing(true); setEditContent(comment.content); }}>Edit</button>
              <button className="forum-comment-action-btn delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? "..." : "Delete"}
              </button>
            </span>
          )}
        </div>
        {error && <div className="forum-form-error">{error}</div>}
        {editing ? (
          <div className="forum-comment-edit">
            <textarea
              className="forum-form-textarea"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={2000}
              rows={3}
            />
            <div className="forum-comment-edit-actions">
              <button className="forum-comment-action-btn" onClick={() => setEditing(false)}>Cancel</button>
              <button className="forum-form-submit" onClick={handleSave} disabled={saving || !editContent.trim()}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="forum-comment-text">
            <p>{comment.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Comment Form ─────────────────────────────────────────────────────

function CommentForm({
  agendaId,
  onCommentAdded,
}: {
  agendaId: number;
  onCommentAdded: () => void;
}) {
  const { address, isConnected, openModal } = useWallet();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isWalletConfigured && !isConnected) {
    return (
      <div className="forum-comment-form-connect">
        <button className="forum-form-submit" onClick={() => openModal()}>
          Connect Wallet to Comment
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!content.trim() || !address) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/forum/agenda/${agendaId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, content: content.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setContent("");
      onCommentAdded();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="forum-comment-form">
      <textarea
        className="forum-form-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
        maxLength={2000}
        rows={3}
      />
      {error && <div className="forum-form-error">{error}</div>}
      <div className="forum-comment-form-footer">
        <span className="forum-comment-form-address">
          {truncateAddress(address || "")}
        </span>
        <button
          className="forum-form-submit"
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
        >
          {submitting ? "Posting..." : "Post Comment"}
        </button>
      </div>
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
