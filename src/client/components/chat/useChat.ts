import { useState, useRef } from "react";
import type { Message, MessagePart } from "./types";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setIsLoading(false);
    if (inputRef.current) inputRef.current.style.height = "auto";
    inputRef.current?.focus();
  };

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
                // Remove thinking indicator when text arrives
                if (
                  parts.length > 0 &&
                  parts[parts.length - 1]!.type === "thinking"
                ) {
                  parts.pop();
                }
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
                // Remove thinking indicator when new tool call arrives
                if (
                  parts.length > 0 &&
                  parts[parts.length - 1]!.type === "thinking"
                ) {
                  parts.pop();
                }
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

              case "thinking":
                // Remove previous thinking indicator if any
                if (
                  parts.length > 0 &&
                  parts[parts.length - 1]!.type === "thinking"
                ) {
                  parts.pop();
                }
                parts.push({ type: "thinking" });
                updateAssistant(textContent, parts);
                break;

              case "done":
                // Remove thinking indicator on completion
                if (
                  parts.length > 0 &&
                  parts[parts.length - 1]!.type === "thinking"
                ) {
                  parts.pop();
                  updateAssistant(textContent, parts);
                }
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

  return {
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
  };
}
