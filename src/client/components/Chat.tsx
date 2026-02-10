import { useState, useEffect } from "react";
import { useChat } from "./chat/useChat";
import { AsciiSpinner } from "./chat/AsciiSpinner";
import { TerminalHeader } from "./chat/TerminalHeader";
import { ChatBubble } from "./chat/ChatBubble";
import { ChatLoader } from "./chat/ChatLoader";
import { ChatInput } from "./chat/ChatInput";

export default function Chat() {
  const [showBootSequence, setShowBootSequence] = useState(true);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | undefined>();

  const {
    messages,
    input,
    setInput,
    isLoading,
    isConnected,
    messagesEndRef,
    inputRef,
    handleNewChat,
    handleSuggestion,
    handleSubmit,
  } = useChat(selectedModel);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        setProviderName(data.provider);
        // Only set default model if user hasn't already picked one
        setSelectedModel((prev) => prev ?? data.model);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowBootSequence(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!showBootSequence) inputRef.current?.focus();
  }, [showBootSequence]);

  // Boot Sequence Screen
  if (showBootSequence) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-8"
        style={{ background: "var(--term-bg-primary)" }}
      >
        <div
          className="space-y-2 text-sm"
          style={{ color: "var(--term-accent)" }}
        >
          <div className="boot-line" style={{ animationDelay: "0ms" }}>
            TOKAMAK DAO AGENT v1.0.0
          </div>
          <div className="boot-line" style={{ animationDelay: "200ms" }}>
            Initializing neural interface...
          </div>
          <div className="boot-line" style={{ animationDelay: "400ms" }}>
            Loading language models...
          </div>
          <div className="boot-line" style={{ animationDelay: "600ms" }}>
            {`Connecting to ${providerName ?? "AI"} API...`}
          </div>
          <div className="boot-line" style={{ animationDelay: "800ms" }}>
            <AsciiSpinner /> System ready.
          </div>
        </div>
      </div>
    );
  }

  const isStreaming =
    isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant";

  return (
    <div className="chat-layout">
      <TerminalHeader
        isConnected={isConnected}
        isLoading={isLoading}
        showAsciiArt={messages.length === 0}
        onNewChat={messages.length > 0 ? handleNewChat : undefined}
        model={selectedModel}
        onModelChange={setSelectedModel}
      />

      {messages.length === 0 ? (
        <div className="welcome-container">
          <div style={{ maxWidth: "800px", width: "100%", padding: "0 24px" }}>
            <div className="chat-welcome">
              <div className="chat-welcome-title phosphor-glow">
                How can I help you?
              </div>
              <div className="chat-welcome-subtitle">
                Tokamak DAO Agent answers your questions
              </div>
              <div className="chat-welcome-suggestions">
                <button
                  className="chat-suggestion-btn"
                  onClick={() => handleSuggestion("Show me SeigManager contract info")}
                >
                  SeigManager Info
                </button>
                <button
                  className="chat-suggestion-btn"
                  onClick={() => handleSuggestion("Analyze recent DAO proposals")}
                >
                  DAO Proposals
                </button>
                <button
                  className="chat-suggestion-btn"
                  onClick={() => handleSuggestion("Show me TON token contract source code")}
                >
                  Contract Source
                </button>
                <button
                  className="chat-suggestion-btn"
                  onClick={() =>
                    handleSuggestion("Read the current storage state of DepositManager")
                  }
                >
                  On-chain State
                </button>
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
      ) : (
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
      )}
    </div>
  );
}
