import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import Anthropic from "@anthropic-ai/sdk";

const app = new Hono();

app.use("/api/*", cors());

const anthropic = new Anthropic();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

app.post("/api/chat", async (c) => {
  const { messages } = await c.req.json<{ messages: ChatMessage[] }>();

  return streamSSE(c, async (stream) => {
    try {
      const response = await anthropic.messages.stream({
        model: "claude-sonnet-4.5",
        max_tokens: 4096,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        system:
          "You are a helpful AI assistant for Tokamak DAO. You help users understand the Tokamak Network ecosystem and participate in DAO governance. Be concise and informative.",
      });

      for await (const event of response) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          await stream.writeSSE({
            data: JSON.stringify({ content: event.delta.text }),
          });
        }
      }

      await stream.writeSSE({ data: "[DONE]" });
    } catch (error) {
      console.error("Anthropic API error:", error);
      await stream.writeSSE({
        data: JSON.stringify({ error: "Failed to generate response" }),
      });
    }
  });
});

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

const port = 3000;
console.log(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
