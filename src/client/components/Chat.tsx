import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ToolCall {
  name: string;
  result?: string;
  isError?: boolean;
  isRunning: boolean;
}

interface MessagePart {
  type: "text" | "tool_call";
  content?: string;
  toolCall?: ToolCall;
}

interface Message {
  role: "user" | "assistant";
  content: string; // plain text for user, used for API history
  parts: MessagePart[]; // structured parts for display
  timestamp: Date;
}

const SPINNER_FRAMES = ["|", "/", "-", "\\"];

/**
 * Fix bold/italic markers adjacent to CJK characters.
 * Markdown parsers require word boundaries around emphasis markers,
 * but no boundary exists between `**` and Korean characters like `**텍스트**를`.
 * Inserting a zero-width space provides the needed boundary.
 */
function fixCjkEmphasis(text: string): string {
  return text.replace(/(\*{1,3})(.+?)\1(?=[가-힣ㄱ-ㅎㅏ-ㅣ一-龥])/g, '$&\u200B');
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

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

// Collapsible tool call display
function ToolCallBlock({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tool-call-block">
      <div className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className={`tool-call-chevron ${expanded ? "open" : ""}`}>
          &#9654;
        </span>
        <span className="tool-call-name">{toolCall.name}</span>
        {toolCall.isRunning ? (
          <>
            <span className="tool-spinner" />
            <span className="tool-call-status running">running...</span>
          </>
        ) : toolCall.isError ? (
          <span className="tool-call-status error">error</span>
        ) : (
          <span className="tool-call-status done">done</span>
        )}
      </div>
      {expanded && toolCall.result && (
        <div className="tool-call-body">{toolCall.result}</div>
      )}
    </div>
  );
}

function TerminalHeader({
  isConnected,
  isLoading,
  showAsciiArt = true,
}: {
  isConnected: boolean;
  isLoading: boolean;
  showAsciiArt?: boolean;
}) {
  return (
    <div className="terminal-box-header">
      <div style={{ borderBottom: "1px solid var(--term-border)" }}>
        <div
          className="text-xs"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 16px",
          }}
        >
          <span style={{ color: "var(--term-text-muted)", fontSize: "13px" }}>
            Tokamak DAO Agent
          </span>
          <div className="flex items-center">
            <span
              className={`status-dot ${
                isLoading
                  ? "status-loading"
                  : isConnected
                  ? "status-connected"
                  : "status-disconnected"
              }`}
            />
            <span style={{ color: "var(--term-text-muted)" }}>
              {isLoading
                ? "PROCESSING"
                : isConnected
                ? "CONNECTED"
                : "DISCONNECTED"}
            </span>
          </div>
        </div>
      </div>
      {showAsciiArt && (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}
        >
          <pre
            className="terminal-header-ascii phosphor-glow"
            style={{
              color: "var(--term-accent)",
              fontSize: "12px",
              lineHeight: "1.3",
              letterSpacing: "0.05em",
              textAlign: "center",
            }}
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
        className={`chat-bubble ${isUser ? "user" : "assistant"} ${
          !isUser ? "phosphor-glow" : ""
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <>
            {message.parts.map((part, i) =>
              part.type === "text" ? (
                <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>{fixCjkEmphasis(part.content || "")}</ReactMarkdown>
              ) : part.toolCall ? (
                <ToolCallBlock key={i} toolCall={part.toolCall} />
              ) : null
            )}
          </>
        )}
        {isStreaming && <span className="cursor-blink" />}
      </div>
      <div className="bubble-meta">
        <span className="bubble-timestamp">{timeStr}</span>
      </div>
    </div>
  );
}

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
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
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

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showBootSequence, setShowBootSequence] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSuggestion = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    const newUserMsg: Message = {
      role: "user",
      content: userMessage,
      parts: [{ type: "text", content: userMessage }],
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Build API message history (plain text only)
      const apiMessages = [...messages, newUserMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      const assistantTimestamp = new Date();
      let textContent = "";
      const parts: MessagePart[] = [];
      let buffer = "";

      // Add initial empty assistant message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          parts: [],
          timestamp: assistantTimestamp,
        },
      ]);

      const updateAssistant = (
        newContent: string,
        newParts: MessagePart[]
      ) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: newContent,
            parts: [...newParts],
            timestamp: assistantTimestamp,
          };
          return updated;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            switch (parsed.type) {
              case "text_delta":
                textContent += parsed.content;
                // Find or create current text part
                if (
                  parts.length === 0 ||
                  parts[parts.length - 1]!.type !== "text"
                ) {
                  parts.push({ type: "text", content: parsed.content });
                } else {
                  parts[parts.length - 1]!.content =
                    (parts[parts.length - 1]!.content || "") + parsed.content;
                }
                updateAssistant(textContent, parts);
                break;

              case "tool_use":
                parts.push({
                  type: "tool_call",
                  toolCall: {
                    name: parsed.name,
                    isRunning: true,
                  },
                });
                updateAssistant(textContent, parts);
                break;

              case "tool_result": {
                // Find the last running tool call with this name and update it
                for (let i = parts.length - 1; i >= 0; i--) {
                  const part = parts[i]!;
                  if (
                    part.type === "tool_call" &&
                    part.toolCall?.name === parsed.name &&
                    part.toolCall?.isRunning
                  ) {
                    part.toolCall = {
                      name: parsed.name,
                      result: parsed.result,
                      isError: parsed.is_error,
                      isRunning: false,
                    };
                    break;
                  }
                }
                updateAssistant(textContent, parts);
                break;
              }

              case "error":
                textContent += `\n\nERROR: ${parsed.message || "Unknown error"}`;
                if (
                  parts.length === 0 ||
                  parts[parts.length - 1]!.type !== "text"
                ) {
                  parts.push({ type: "text", content: `ERROR: ${parsed.message}` });
                } else {
                  parts[parts.length - 1]!.content += `\n\nERROR: ${parsed.message}`;
                }
                updateAssistant(textContent, parts);
                break;

              case "done":
                break;
            }
          } catch {
            // Ignore parse errors for partial data
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[chat] error:", errorMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `ERROR: ${errorMsg}`,
          parts: [
            {
              type: "text",
              content: `ERROR: ${errorMsg}`,
            },
          ],
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
    isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant";

  return (
    <div className="chat-layout">
      <TerminalHeader
        isConnected={isConnected}
        isLoading={isLoading}
        showAsciiArt={messages.length === 0}
      />

      {messages.length === 0 ? (
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
                <button
                  className="chat-suggestion-btn"
                  onClick={() => handleSuggestion("SeigManager 컨트랙트 정보 알려줘")}
                >
                  SeigManager 정보
                </button>
                <button
                  className="chat-suggestion-btn"
                  onClick={() => handleSuggestion("최근 DAO 안건 분석해줘")}
                >
                  DAO 안건 분석
                </button>
                <button
                  className="chat-suggestion-btn"
                  onClick={() => handleSuggestion("TON 토큰 컨트랙트 소스코드 보여줘")}
                >
                  컨트랙트 소스코드
                </button>
                <button
                  className="chat-suggestion-btn"
                  onClick={() =>
                    handleSuggestion("DepositManager의 현재 스토리지 상태를 읽어줘")
                  }
                >
                  온체인 상태 조회
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
