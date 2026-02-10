import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "./types";
import { ToolCallBlock } from "./ToolCallBlock";

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

export function ChatBubble({
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
              ) : part.type === "thinking" ? (
                <div key={i} className="thinking-indicator">
                  <span className="thinking-dots">
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                  </span>
                  <span className="thinking-label">Analyzing...</span>
                </div>
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
