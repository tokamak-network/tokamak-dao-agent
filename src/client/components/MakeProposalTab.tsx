import { useTabContext, type Proposal } from "../contexts/TabContext";
import { useChat } from "./chat/useChat";
import { useEffect, useState } from "react";
import { ChatBubble } from "./chat/ChatBubble";
import { ChatLoader } from "./chat/ChatLoader";
import { ChatInput } from "./chat/ChatInput";

const SUGGESTIONS = [
  { label: "DAO Seig Change", text: "I want to change the DAO seigniorage rate" },
  { label: "Parameter Update", text: "Update a contract parameter" },
  { label: "Fund Transfer", text: "Transfer funds from the DAO vault" },
];

interface ProposalCardProps {
  proposal: Proposal;
  onAnalyze: () => void;
}

function ProposalCard({ proposal, onAnalyze }: ProposalCardProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="proposal-card">
      <div className="proposal-card-header">
        <span className="proposal-card-icon">PROPOSAL</span>
        <span className="proposal-card-targets">{proposal.targets.length} target{proposal.targets.length > 1 ? "s" : ""}</span>
        {proposal.atomicExecute && <span className="proposal-card-atomic">ATOMIC</span>}
      </div>
      <div className="proposal-card-description">{proposal.description}</div>
      <div className="proposal-card-calls">
        {proposal.decodedCalls.map((call, i) => (
          <div key={i} className="proposal-call-item">
            <div
              className="proposal-call-header"
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{ cursor: "pointer" }}
            >
              <span className="proposal-call-index">#{i + 1}</span>
              <span className="proposal-call-fn">{call.functionName}</span>
              <span className="proposal-call-target">{call.targetName}</span>
              <span className="proposal-call-chevron">{expanded === i ? "\u25BC" : "\u25B6"}</span>
            </div>
            {expanded === i && (
              <div className="proposal-call-details">
                <div><strong>Target:</strong> {call.target}</div>
                <div><strong>Arguments:</strong></div>
                <ul>
                  {call.args.map((arg, j) => (
                    <li key={j}>{arg.name}: {arg.value}</li>
                  ))}
                </ul>
                <div className="proposal-call-calldata">
                  <strong>Calldata:</strong>
                  <code>{call.calldata.slice(0, 66)}...</code>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="proposal-analyze-btn" onClick={onAnalyze}>
        Analyze this Proposal &rarr;
      </button>
    </div>
  );
}

/**
 * Try to extract a proposal JSON from a `proposal-data` code block in message text.
 */
function extractProposal(text: string): Proposal | null {
  const match = text.match(/```proposal-data\s*\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]!);
    if (data.targets && data.functionBytecodes && data.decodedCalls) {
      return data as Proposal;
    }
  } catch {}
  return null;
}

export function MakeProposalTab({ selectedModel }: { selectedModel?: string }) {
  const { transferToAnalyze } = useTabContext();
  const {
    messages,
    input,
    setInput,
    isLoading,
    messagesEndRef,
    inputRef,
    handleSuggestion,
    handleSubmit,
  } = useChat(selectedModel, "make_proposal");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isStreaming =
    isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant";

  // Check for proposals in assistant messages
  const proposals: { index: number; proposal: Proposal }[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;
    if (msg.role === "assistant") {
      const p = extractProposal(msg.content);
      if (p) proposals.push({ index: i, proposal: p });
    }
  }

  if (messages.length === 0) {
    return (
      <div className="welcome-container">
        <div style={{ maxWidth: "800px", width: "100%", padding: "0 24px" }}>
          <div className="chat-welcome">
            <div className="chat-welcome-title phosphor-glow">
              What proposal would you like to create?
            </div>
            <div className="chat-welcome-subtitle">
              Describe your intent and I'll build the proposal data
            </div>
            <div className="chat-welcome-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  className="chat-suggestion-btn"
                  onClick={() => handleSuggestion(s.text)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            inputRef={inputRef}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="chat-messages-area">
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div className="chat-messages-list">
            {messages.map((msg, i) => (
              <div key={i}>
                <ChatBubble
                  message={msg}
                  isStreaming={isStreaming && i === messages.length - 1}
                />
                {/* Render proposal card after the assistant message that contains it */}
                {proposals.find((p) => p.index === i) && (
                  <div style={{ padding: "0 0 16px" }}>
                    <ProposalCard
                      proposal={proposals.find((p) => p.index === i)!.proposal}
                      onAnalyze={() => transferToAnalyze(proposals.find((p) => p.index === i)!.proposal)}
                    />
                  </div>
                )}
              </div>
            ))}
            {isLoading && !isStreaming && <ChatLoader />}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        inputRef={inputRef}
      />
    </>
  );
}
