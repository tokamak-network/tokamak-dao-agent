/**
 * Hono web server for Tokamak DAO Agent chat UI
 *
 * Proxies chat messages through a configurable AI provider (Anthropic, OpenAI, …)
 * with a tool_use agentic loop, streaming responses back via SSE.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { stream } from "hono/streaming";
import { serveStatic } from "hono/bun";
import { resolve } from "path";
import { detectProvider, getOrCreateProvider } from "./providers/index.ts";
import type { ChatMessage, ContentBlock, ChatProvider } from "./providers/types.ts";
import { getToolDefinitions, executeTool } from "../mcp/tools/handlers.ts";
import { formatError } from "../mcp/tools/validation.ts";
import { getSystemPrompt } from "./system-prompt.ts";
import {
  MAX_TOOL_ROUNDS,
  MAX_TOOL_RESULT_CHARS,
  MAX_TOOL_RESULT_DISPLAY_CHARS,
  CHAT_MAX_TOKENS,
  DEFAULT_CHAT_MODEL,
  MODE_MODELS,
} from "../config.ts";

const app = new Hono();

app.use("/api/*", cors());

const MODEL_RAW = process.env.CHAT_MODEL || DEFAULT_CHAT_MODEL;
const defaultConfig = detectProvider(MODEL_RAW);

const startedAt = Date.now();

app.get("/api/health", (c) =>
  c.json({
    status: "ok",
    provider: defaultConfig.provider,
    model: defaultConfig.model,
    tools: getToolDefinitions().length,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
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
    mode?: string;
  }>();

  const tools = getToolDefinitions();

  // Resolve model: per-request override → mode default → server default
  const resolvedModel =
    body.model || (body.mode && MODE_MODELS[body.mode]) || MODEL_RAW;
  const requestConfig = detectProvider(resolvedModel);
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

      // In make_proposal mode, after initial research (assistant already responded),
      // restrict tools to encode_calldata only to prevent unnecessary research loops.
      let activeTools = tools;
      if (body.mode === "make_proposal") {
        const assistantMsgCount = body.messages.filter(
          (m) => m.role === "assistant",
        ).length;
        if (assistantMsgCount >= 1) {
          activeTools = tools.filter((t) => t.name === "encode_calldata");
        }
      }

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
          system: getSystemPrompt(body.mode),
          messages,
          tools: activeTools,
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
                tool_id: event.id,
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

        // Execute tools in parallel, but collect results first
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

            const truncatedResult =
              result.length > MAX_TOOL_RESULT_CHARS
                ? result.slice(0, MAX_TOOL_RESULT_CHARS) +
                  `\n\n[... truncated ${result.length - MAX_TOOL_RESULT_CHARS} chars]`
                : result;

            return {
              tool_use_id: tool.id,
              name: tool.name,
              displayResult: result.slice(0, MAX_TOOL_RESULT_DISPLAY_CHARS),
              isError,
              content: truncatedResult,
            };
          }),
        );

        // Send tool_result SSE events sequentially to prevent stream write interleaving
        for (const tr of toolResults) {
          await sendEvent({
            type: "tool_result",
            tool_id: tr.tool_use_id,
            name: tr.name,
            result: tr.displayResult,
            is_error: tr.isError,
          });
        }

        messages.push({ role: "assistant", content: assistantContent });
        messages.push(
          ...provider.buildToolResultsMessage(
            toolResults.map((tr) => ({
              tool_use_id: tr.tool_use_id,
              content: tr.content,
              ...(tr.isError ? { is_error: true as const } : {}),
            })),
          ),
        );

        await sendEvent({ type: "thinking" });
      }

      await sendEvent({
        type: "text_delta",
        content:
          "\n\n⚠️ Tool call round limit (250) reached. Analysis has been stopped. You can continue with follow-up questions.",
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

// ── Static file serving (production) ──────────────────────────────────

const DIST_DIR = resolve(import.meta.dir, "../../dist");
const INDEX_HTML_PATH = resolve(DIST_DIR, "index.html");

app.use("/assets/*", serveStatic({ root: "./dist" }));

app.get("/", (c) => c.redirect("/app"));

const serveSpa = async (c: any) => {
  const file = Bun.file(INDEX_HTML_PATH);
  if (await file.exists()) {
    return c.html(await file.text());
  }
  return c.text("App not built. Run: bun run build", 404);
};

app.get("/app", serveSpa);
app.get("/app/*", serveSpa);

// ── Server startup ───────────────────────────────────────────────────

const port = Number(process.env.PORT) || 3333;

console.log(`Tokamak DAO Agent web server starting on port ${port}...`);
console.log(
  `Default provider: ${defaultConfig.provider}, Model: ${defaultConfig.model}`,
);
console.log(`Serving static files from ${DIST_DIR}`);

export default {
  port,
  fetch: app.fetch,
  idleTimeout: 120, // seconds — prevent Bun from killing SSE during long API calls
};
