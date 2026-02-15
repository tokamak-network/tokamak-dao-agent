import { useState, useEffect, useCallback } from "react";
import { useTabContext } from "../contexts/TabContext";
import { useChat } from "./chat/useChat";
import { ChatBubble } from "./chat/ChatBubble";
import { ChatLoader } from "./chat/ChatLoader";
import { ChatInput } from "./chat/ChatInput";

export function AnalyzeProposalTab({ selectedModel }: { selectedModel?: string }) {
  const { pendingProposal, clearPendingProposal } = useTabContext();
  const [agendaId, setAgendaId] = useState("");

  const {
    messages,
    input,
    setInput,
    isLoading,
    messagesEndRef,
    inputRef,
    handleSubmit,
  } = useChat(selectedModel, "analyze_proposal");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle pending proposal from Generate Calldata tab
  useEffect(() => {
    if (pendingProposal && messages.length === 0 && !isLoading) {
      const msg = `Please analyze this proposal:\n\nTargets: ${pendingProposal.targets.join(", ")}\nCalldata: ${pendingProposal.functionBytecodes.join(", ")}\nAtomic: ${pendingProposal.atomicExecute}\nDescription: ${pendingProposal.description}`;
      clearPendingProposal();
      handleSubmit(msg);
    }
  }, [pendingProposal]);

  const handleAnalyzeAgenda = useCallback(() => {
    const id = agendaId.trim();
    if (!id || isNaN(Number(id))) return;
    setAgendaId("");
    handleSubmit(`Analyze on-chain agenda #${id}`);
  }, [agendaId, handleSubmit]);

  const isStreaming =
    isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant";

  if (messages.length === 0) {
    return (
      <div className="welcome-container">
        <div style={{ maxWidth: "800px", width: "100%", padding: "0 24px" }}>
          <div className="chat-welcome">
            <div className="chat-welcome-title phosphor-glow">
              Analyze a Proposal
            </div>
            <div className="chat-welcome-subtitle">
              Enter an agenda ID or paste proposal data for analysis
            </div>

            {/* Agenda ID input card */}
            <div className="agenda-input-card">
              <label className="agenda-input-label">On-chain Agenda ID</label>
              <div className="agenda-input-row">
                <input
                  type="text"
                  className="agenda-id-input"
                  placeholder="e.g. 42"
                  value={agendaId}
                  onChange={(e) => setAgendaId(e.target.value.replace(/[^0-9]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAnalyzeAgenda();
                  }}
                />
                <button
                  className="agenda-analyze-btn"
                  onClick={handleAnalyzeAgenda}
                  disabled={!agendaId.trim()}
                >
                  Analyze
                </button>
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
              <ChatBubble
                key={i}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1}
              />
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
