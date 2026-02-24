import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat } from "../chat/useChat.ts";
import { ChatBubble } from "../chat/ChatBubble.tsx";
import { ChatInput } from "../chat/ChatInput.tsx";
import type { Message } from "../chat/types.ts";
import type { AgendaDraft } from "./types.ts";
import { WIZARD_SUGGESTIONS } from "./constants.ts";
import { extractAgendaDraft, ensureTipPrefix } from "./helpers.ts";
import { AgentReviewModalContent } from "./AgentReviewModal.tsx";
import { useWallet } from "../../contexts/WalletContext.tsx";
import { isWalletConfigured } from "../../config/wagmi.ts";

export function AgendaWizard({
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
      setReviewModal({ agendaId: agenda.id });
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
