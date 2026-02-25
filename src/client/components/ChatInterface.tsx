import { useEffect, useRef } from "react";
import { useChat } from "./chat/useChat";
import { ChatBubble } from "./chat/ChatBubble";
import { ChatLoader } from "./chat/ChatLoader";
import { ChatInput } from "./chat/ChatInput";
import type { TabMode } from "../contexts/TabContext";
import { useTabContext } from "../contexts/TabContext";

export interface DemoScenario {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  audience: string;
  duration: string;
  targetTab: TabMode;
  message: string;
}

interface ChatInterfaceProps {
  mode: TabMode;
  selectedModel?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  suggestions?: { label: string; text: string }[];
  scenarios?: DemoScenario[];
}

export function ChatInterface({
  mode,
  selectedModel,
  welcomeTitle = "How can I help you?",
  welcomeSubtitle = "Tokamak DAO Agent answers your questions",
  suggestions = [],
  scenarios = [],
}: ChatInterfaceProps) {
  const { navigateWithMessage, pendingChatMessage, clearPendingChatMessage } = useTabContext();
  const {
    messages,
    input,
    setInput,
    isLoading,
    messagesEndRef,
    inputRef,
    handleNewChat,
    handleSuggestion,
    handleSubmit,
  } = useChat(selectedModel, mode);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const pendingConsumedRef = useRef(false);
  useEffect(() => {
    if (pendingChatMessage && messages.length === 0 && !isLoading && !pendingConsumedRef.current) {
      pendingConsumedRef.current = true;
      clearPendingChatMessage();
      handleSubmit(pendingChatMessage);
    }
  }, [pendingChatMessage]);

  const isStreaming =
    isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant";

  const handleScenario = (scenario: DemoScenario) => {
    if (scenario.targetTab === mode) {
      // Same tab — just submit the message directly
      handleSubmit(scenario.message);
    } else {
      // Different tab — navigate with pending message
      navigateWithMessage(scenario.targetTab, scenario.message);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="welcome-container">
        <div style={{ maxWidth: "900px", width: "100%", padding: "0 24px" }}>
          <div className="chat-welcome">
            <div className="chat-welcome-title phosphor-glow">{welcomeTitle}</div>
            <div className="chat-welcome-subtitle">{welcomeSubtitle}</div>

            {scenarios.length > 0 && (
              <div className="demo-scenario-grid">
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    className="demo-scenario-card"
                    onClick={() => handleScenario(s)}
                  >
                    <div className="demo-scenario-number">{s.number}</div>
                    <div className="demo-scenario-body">
                      <div className="demo-scenario-title">{s.title}</div>
                      <div className="demo-scenario-subtitle">{s.subtitle}</div>
                      <div className="demo-scenario-meta">
                        <span>{s.audience}</span>
                        <span>{s.duration}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="chat-welcome-suggestions" style={scenarios.length > 0 ? { marginTop: "16px" } : undefined}>
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    className="chat-suggestion-btn"
                    onClick={() => handleSuggestion(s.text)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
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
