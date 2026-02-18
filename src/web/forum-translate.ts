/**
 * English→Korean translation service for forum content.
 * Reuses the existing provider infrastructure.
 */

import { detectProvider, getOrCreateProvider } from "./providers/index.ts";
import { TRANSLATE_MODEL, TRANSLATE_MAX_TOKENS } from "../config.ts";

const TRANSLATE_SYSTEM_PROMPT = `You are a professional English-to-Korean translator specializing in blockchain and DAO governance.

Rules:
- Translate the given English text into natural Korean.
- Preserve all technical terms, contract names, addresses (0x...), and function names as-is.
- Preserve markdown formatting (headings, bold, lists, code blocks).
- Do not add explanations or commentary — output only the translated text.`;

export async function translateText(text: string): Promise<string> {
  const modelConfig = detectProvider(TRANSLATE_MODEL);
  const provider = await getOrCreateProvider(modelConfig.provider);

  let fullText = "";
  const events = provider.createStream({
    model: modelConfig.model,
    system: TRANSLATE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
    tools: [],
    maxTokens: TRANSLATE_MAX_TOKENS,
  });

  for await (const event of events) {
    if (event.type === "text_delta") {
      fullText += event.text;
    }
  }

  return fullText.trim();
}
