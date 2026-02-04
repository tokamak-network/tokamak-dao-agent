import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import Anthropic from "@anthropic-ai/sdk";
import {
  generateSystemPrompt,
  initializeSearch,
  searchKnowledge,
} from "./knowledge";

const app = new Hono();

app.use("/api/*", cors());

const anthropic = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4.5";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Initialize knowledge base on startup
initializeSearch().catch((err) => {
  console.warn("Failed to initialize knowledge base:", err);
});

app.post("/api/chat", async (c) => {
  const { messages } = await c.req.json<{ messages: ChatMessage[] }>();

  return streamSSE(c, async (stream) => {
    try {
      // Get the latest user message for RAG context
      const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === "user");
      const userQuery = lastUserMessage?.content || "";

      // Generate system prompt with RAG context
      const systemPrompt = await generateSystemPrompt(userQuery);

      const response = await anthropic.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        system: systemPrompt,
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

// Knowledge search endpoint
app.post("/api/search", async (c) => {
  const { query, topK = 5 } = await c.req.json<{ query: string; topK?: number }>();

  try {
    const results = await searchKnowledge(query, topK);
    return c.json({
      results: results.map((r) => ({
        title: r.chunk.metadata.title,
        category: r.chunk.metadata.category,
        content: r.chunk.content,
        score: r.score,
        matchType: r.matchType,
      })),
    });
  } catch (error) {
    console.error("Search error:", error);
    return c.json({ error: "Search failed" }, 500);
  }
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
