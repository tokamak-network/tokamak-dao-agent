import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SPINNER_FRAMES = ["|", "/", "-", "\\"];

// Format timestamp as HH:MM
function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ASCII Spinner Component
function AsciiSpinner() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return <span className="ascii-spinner">{SPINNER_FRAMES[frame]}</span>;
}

// Terminal Header with ASCII Art and Status
function TerminalHeader({
  isConnected,
  isLoading,
  selectedModel,
  onModelChange,
  showAsciiArt = true,
}: {
  isConnected: boolean;
  isLoading: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  showAsciiArt?: boolean;
}) {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="terminal-box-header">
      <div style={{ borderBottom: "1px solid var(--term-border)" }}>
        <div
          className="text-xs"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px" }}
        >
          <div className="dropdown-wrapper" ref={modelDropdownRef}>
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="chat-model-btn"
            >
              {selectedModel}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showModelDropdown && (
              <ModelDropdown
                selectedModel={selectedModel}
                onSelect={onModelChange}
                onClose={() => setShowModelDropdown(false)}
              />
            )}
          </div>
          <div className="flex items-center">
            <span
              className={`status-dot ${
                isLoading ? "status-loading" : isConnected ? "status-connected" : "status-disconnected"
              }`}
            />
            <span style={{ color: "var(--term-text-muted)" }}>
              {isLoading ? "PROCESSING" : isConnected ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </div>
        </div>
      </div>
      {showAsciiArt && (
        <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
          <pre
            className="terminal-header-ascii phosphor-glow"
            style={{ color: "var(--term-accent)", fontSize: "12px", lineHeight: "1.3", letterSpacing: "0.05em", textAlign: "center" }}
          >
{` _____ ___  _  __    _    __  __    _    _  __
|_   _/ _ \\| |/ /   / \\  |  \\/  |  / \\  | |/ /
  | || | | | ' /   / _ \\ | |\\/| | / _ \\ | ' /
  | || |_| | . \\  / ___ \\| |  | |/ ___ \\| . \\
  |_| \\___/|_|\\_\\/_/   \\_\\_|  |_/_/   \\_\\_|\\_\\

            DAO AGENT v1.0.0                  `}
          </pre>
        </div>
      )}
    </div>
  );
}

// Chat Bubble Component
function ChatBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";
  const timeStr = formatTime(message.timestamp);

  return (
    <div className={`chat-bubble-wrapper ${isUser ? "user" : "assistant"}`}>
      <div
        className={`chat-bubble ${isUser ? "user" : "assistant"} ${!isUser ? "phosphor-glow" : ""}`}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}
        {isStreaming && <span className="cursor-blink" />}
      </div>
      <div className="bubble-meta">
        <span className="bubble-timestamp">{timeStr}</span>
      </div>
    </div>
  );
}

// Chat Loading Indicator (typing dots)
function ChatLoader() {
  return (
    <div className="chat-bubble-wrapper assistant">
      <div className="chat-bubble assistant">
        <div className="chat-loader">
          <div className="chat-loader-dot" />
          <div className="chat-loader-dot" />
          <div className="chat-loader-dot" />
        </div>
      </div>
    </div>
  );
}

// Model Dropdown Component
function ModelDropdown({
  selectedModel,
  onSelect,
  onClose,
}: {
  selectedModel: string;
  onSelect: (model: string) => void;
  onClose: () => void;
}) {
  const models = [
    { id: "Opus 4.5", name: "Opus 4.5" },
    { id: "Sonnet 4", name: "Sonnet 4" },
    { id: "Haiku 3.5", name: "Haiku 3.5" },
  ];

  return (
    <div className="model-dropdown">
      {models.map((model) => (
        <button
          key={model.id}
          className={`model-dropdown-item ${selectedModel === model.id ? "selected" : ""}`}
          onClick={() => {
            onSelect(model.id);
            onClose();
          }}
        >
          <span>{model.name}</span>
          {selectedModel === model.id && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

// Chat Input Component
function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const adjustHeight = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
    }
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-box">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
            rows={1}
            className="chat-input-textarea"
          />
          <button
            onClick={onSubmit}
            disabled={isLoading || !value.trim()}
            className="chat-send-btn"
            title="전송 (Enter)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="chat-input-hint">
        AI 응답에는 오류가 있을 수 있습니다. 중요한 정보는 확인하세요.
      </div>
    </div>
  );
}

// Main Chat Component
export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [selectedModel, setSelectedModel] = useState("Opus 4.5");
  const [showBootSequence, setShowBootSequence] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Boot sequence effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBootSequence(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (!showBootSequence) {
      inputRef.current?.focus();
    }
  }, [showBootSequence]);

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    const newMessage: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantMessage = "";
      const assistantTimestamp = new Date();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", timestamp: assistantTimestamp },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantMessage,
                    timestamp: assistantTimestamp,
                  };
                  return updated;
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "ERROR: Request failed. Check connection and retry.",
          timestamp: new Date(),
        },
      ]);
      setIsConnected(false);
      setTimeout(() => setIsConnected(true), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Boot Sequence Screen
  if (showBootSequence) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-8"
        style={{ background: "var(--term-bg-primary)" }}
      >
        <div className="space-y-2 text-sm" style={{ color: "var(--term-accent)" }}>
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
            Connecting to Anthropic API...
          </div>
          <div className="boot-line" style={{ animationDelay: "800ms" }}>
            <AsciiSpinner /> System ready.
          </div>
        </div>
      </div>
    );
  }

  const isStreaming =
    isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "assistant";

  return (
    <div className="chat-layout">
      {/* Header */}
      <TerminalHeader
        isConnected={isConnected}
        isLoading={isLoading}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        showAsciiArt={messages.length === 0}
      />

      {messages.length === 0 ? (
        /* Welcome Screen - centered layout */
        <div className="welcome-container">
          <div style={{ maxWidth: "800px", width: "100%", padding: "0 24px" }}>
            <div className="chat-welcome">
              <div className="chat-welcome-title phosphor-glow">
                무엇을 도와드릴까요?
              </div>
              <div className="chat-welcome-subtitle">
                Tokamak DAO Agent가 질문에 답변해드립니다
              </div>
              <div className="chat-welcome-suggestions">
                <button className="chat-suggestion-btn">DAO 거버넌스란?</button>
                <button className="chat-suggestion-btn">TON 토큰 정보</button>
                <button className="chat-suggestion-btn">스테이킹 방법</button>
                <button className="chat-suggestion-btn">제안 생성하기</button>
              </div>
            </div>
            {/* Input Area */}
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
        /* Chat Mode - messages with input at bottom */
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

                {/* Loading indicator when waiting for response */}
                {isLoading && !isStreaming && <ChatLoader />}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Input Area */}
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
