/**
 * Hono web server for Tokamak DAO Agent chat UI
 *
 * Proxies chat messages through Anthropic API with tool_use loop,
 * streaming responses back via SSE.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { stream } from "hono/streaming";
import Anthropic from "@anthropic-ai/sdk";
import { getToolDefinitions, executeTool } from "../mcp/tools/handlers.ts";
import { SYSTEM_PROMPT } from "./system-prompt.ts";

const app = new Hono();

app.use("/api/*", cors());

const anthropic = new Anthropic();
const MODEL = process.env.CHAT_MODEL || "claude-sonnet-4-5-20250929";
const MAX_TOOL_ROUNDS = 10;

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.post("/api/chat", async (c) => {
  const body = await c.req.json<{
    messages: { role: "user" | "assistant"; content: string }[];
  }>();

  const tools = getToolDefinitions();

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
      let messages: Anthropic.MessageParam[] = body.messages.map((m) => ({
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
        const assistantContent: Anthropic.ContentBlockParam[] = [];
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        let stopReason: string | null = null;

        console.log(`[chat] round ${round + 1}, messages: ${messages.length}`);

        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 8192,
          system: SYSTEM_PROMPT,
          tools,
          messages,
          stream: true,
        });

        for await (const event of response) {
          switch (event.type) {
            case "content_block_start":
              if (event.content_block.type === "text") {
                currentText = "";
              } else if (event.content_block.type === "tool_use") {
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  inputJson: "",
                };
                await sendEvent({
                  type: "tool_use",
                  name: event.content_block.name,
                  input: {},
                });
              }
              break;

            case "content_block_delta":
              if (event.delta.type === "text_delta") {
                currentText += event.delta.text;
                await sendEvent({
                  type: "text_delta",
                  content: event.delta.text,
                });
              } else if (
                event.delta.type === "input_json_delta" &&
                currentToolUse
              ) {
                currentToolUse.inputJson += event.delta.partial_json;
              }
              break;

            case "content_block_stop":
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

                console.log(
                  `[chat] executing tool: ${currentToolUse.name}`,
                  JSON.stringify(input).slice(0, 200)
                );

                let result: string;
                let isError = false;
                try {
                  result = await executeTool(currentToolUse.name, input);
                } catch (err) {
                  result = err instanceof Error ? err.message : String(err);
                  isError = true;
                  console.error(`[chat] tool error:`, result);
                }

                await sendEvent({
                  type: "tool_result",
                  name: currentToolUse.name,
                  result: result.slice(0, 2000),
                  is_error: isError,
                });

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: currentToolUse.id,
                  content: result,
                  ...(isError ? { is_error: true } : {}),
                });

                currentToolUse = null;
              } else if (currentText) {
                assistantContent.push({
                  type: "text",
                  text: currentText,
                });
                currentText = "";
              }
              break;

            case "message_delta":
              if ("stop_reason" in event.delta) {
                stopReason = event.delta.stop_reason;
              }
              break;
          }
        }

        if (stopReason !== "tool_use" || toolResults.length === 0) {
          await sendEvent({ type: "done" });
          return;
        }

        messages.push({ role: "assistant", content: assistantContent });
        messages.push({ role: "user", content: toolResults });
      }

      await sendEvent({ type: "done" });
    } catch (err) {
      console.error("[chat] error:", err);
      await sendEvent({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      await sendEvent({ type: "done" });
    }
  });
});

const port = Number(process.env.PORT) || 3333;

console.log(`Tokamak DAO Agent web server starting on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
