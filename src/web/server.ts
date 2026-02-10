/**
 * Hono web server for Tokamak DAO Agent chat UI
 *
 * Proxies chat messages through a configurable AI provider (Anthropic, OpenAI, …)
 * with a tool_use agentic loop, streaming responses back via SSE.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { stream } from "hono/streaming";
import { detectProvider, getOrCreateProvider } from "./providers/index.ts";
import type { ChatMessage, ContentBlock, ChatProvider } from "./providers/types.ts";
import { getToolDefinitions, executeTool } from "../mcp/tools/handlers.ts";
import { formatError } from "../mcp/tools/validation.ts";
import { SYSTEM_PROMPT } from "./system-prompt.ts";
import {
  MAX_TOOL_ROUNDS,
  MAX_TOOL_RESULT_CHARS,
  MAX_TOOL_RESULT_DISPLAY_CHARS,
  CHAT_MAX_TOKENS,
  DEFAULT_CHAT_MODEL,
} from "../config.ts";

const app = new Hono();

app.use("/api/*", cors());

const MODEL_RAW = process.env.CHAT_MODEL || DEFAULT_CHAT_MODEL;
const defaultConfig = detectProvider(MODEL_RAW);

app.get("/api/health", (c) =>
  c.json({
    status: "ok",
    provider: defaultConfig.provider,
    model: defaultConfig.model,
  }),
);

// ── Model listing ──────────────────────────────────────────────────────

app.get("/api/models", async (c) => {
  try {
    // Try fetching from OpenAI-compatible /v1/models endpoint
    const baseUrl =
      process.env.OPENAI_BASE_URL || process.env.ANTHROPIC_BASE_URL;
    const apiKey =
      process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (baseUrl && apiKey) {
      const url = `${baseUrl.replace(/\/$/, "")}/v1/models`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (res.ok) {
        const data = (await res.json()) as {
          data: { id: string; owned_by?: string }[];
        };
        const models = data.data.map((m) => m.id).sort();
        return c.json({
          models,
          default: defaultConfig.model,
          provider: defaultConfig.provider,
        });
      }
    }

    // Fallback: return just the default model
    return c.json({
      models: [defaultConfig.model],
      default: defaultConfig.model,
      provider: defaultConfig.provider,
    });
  } catch {
    return c.json({
      models: [defaultConfig.model],
      default: defaultConfig.model,
      provider: defaultConfig.provider,
    });
  }
});

// ── Chat endpoint ──────────────────────────────────────────────────────

app.post("/api/chat", async (c) => {
  const body = await c.req.json<{
    messages: { role: "user" | "assistant"; content: string }[];
    model?: string;
  }>();

  const tools = getToolDefinitions();

  // Resolve model: per-request override or server default
  const requestConfig = body.model
    ? detectProvider(body.model)
    : defaultConfig;
  const provider: ChatProvider = await getOrCreateProvider(
    requestConfig.provider,
  );
  const modelName = requestConfig.model;

  // Use manual SSE via stream() for full control
  return stream(c, async (s) => {
    // Set SSE headers
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    const sendEvent = async (data: Record<string, any>) => {
      await s.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      let messages: ChatMessage[] = body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        let currentText = "";
        let currentToolUse: {
          id: string;
          name: string;
          inputJson: string;
        } | null = null;
        const assistantContent: ContentBlock[] = [];
        const pendingTools: {
          id: string;
          name: string;
          input: Record<string, any>;
        }[] = [];
        let stopReason: string | null = null;

        console.log(
          `[chat] round ${round + 1}, model: ${modelName}, messages: ${messages.length}`,
        );

        const events = provider.createStream({
          model: modelName,
          system: SYSTEM_PROMPT,
          messages,
          tools,
          maxTokens: CHAT_MAX_TOKENS,
        });

        // Phase 1: Stream response, collect tool calls (don't execute yet)
        for await (const event of events) {
          switch (event.type) {
            case "text_delta":
              currentText += event.text;
              await sendEvent({ type: "text_delta", content: event.text });
              break;

            case "tool_use_start":
              currentToolUse = {
                id: event.id,
                name: event.name,
                inputJson: "",
              };
              await sendEvent({
                type: "tool_use",
                name: event.name,
                input: {},
              });
              break;

            case "input_json_delta":
              if (currentToolUse) {
                currentToolUse.inputJson += event.partial_json;
              }
              break;

            case "tool_use_end":
              if (currentToolUse) {
                let input: Record<string, any> = {};
                try {
                  input = JSON.parse(currentToolUse.inputJson || "{}");
                } catch {}

                assistantContent.push({
                  type: "tool_use",
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input,
                });

                pendingTools.push({
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input,
                });

                currentToolUse = null;
              }
              break;

            case "message_end":
              // Flush any trailing text
              if (currentText) {
                assistantContent.push({ type: "text", text: currentText });
                currentText = "";
              }
              stopReason = event.stop_reason;
              break;
          }
        }

        // Flush text if message_end didn't fire (defensive)
        if (currentText) {
          assistantContent.push({ type: "text", text: currentText });
          currentText = "";
        }

        // Phase 2: Execute all tool calls in parallel
        if (pendingTools.length === 0 || stopReason !== "tool_use") {
          await sendEvent({ type: "done" });
          return;
        }

        console.log(
          `[chat] executing ${pendingTools.length} tools in parallel`,
        );

        const toolResults = await Promise.all(
          pendingTools.map(async (tool) => {
            console.log(
              `[chat] tool: ${tool.name}`,
              JSON.stringify(tool.input).slice(0, 200),
            );

            let result: string;
            let isError = false;
            try {
              result = await executeTool(tool.name, tool.input);
            } catch (err) {
              result = formatError(err);
              isError = true;
              console.error(`[chat] tool error:`, result);
            }

            await sendEvent({
              type: "tool_result",
              name: tool.name,
              result: result.slice(0, MAX_TOOL_RESULT_DISPLAY_CHARS),
              is_error: isError,
            });

            const truncatedResult =
              result.length > MAX_TOOL_RESULT_CHARS
                ? result.slice(0, MAX_TOOL_RESULT_CHARS) +
                  `\n\n[... truncated ${result.length - MAX_TOOL_RESULT_CHARS} chars]`
                : result;

            return {
              tool_use_id: tool.id,
              content: truncatedResult,
              ...(isError ? { is_error: true as const } : {}),
            };
          }),
        );

        messages.push({ role: "assistant", content: assistantContent });
        messages.push(...provider.buildToolResultsMessage(toolResults));

        await sendEvent({ type: "thinking" });
      }

      await sendEvent({
        type: "text_delta",
        content:
          "\n\n⚠️ 도구 호출 라운드 제한(50회)에 도달하여 분석이 중단되었습니다. 추가 질문을 통해 이어갈 수 있습니다.",
      });
      await sendEvent({ type: "done" });
    } catch (err) {
      console.error("[chat] error:", err);
      await sendEvent({
        type: "error",
        message: formatError(err),
      });
      await sendEvent({ type: "done" });
    }
  });
});

const port = Number(process.env.PORT) || 3333;

console.log(`Tokamak DAO Agent web server starting on port ${port}...`);
console.log(
  `Default provider: ${defaultConfig.provider}, Model: ${defaultConfig.model}`,
);

export default {
  port,
  fetch: app.fetch,
  idleTimeout: 120, // seconds — prevent Bun from killing SSE during long API calls
};
