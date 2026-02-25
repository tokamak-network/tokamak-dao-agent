/**
 * web_fetch tool - HTTP fetch with domain allowlist for dynamic data discovery
 *
 * Enables the AI agent to look up DEX protocol information, contract metadata,
 * and other DeFi data from trusted public APIs.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Allowed domains (security boundary).
 * Only these hosts can be fetched.
 */
const ALLOWED_DOMAINS = [
  "api.llama.fi",         // DeFiLlama — DEX/protocol data (free, no key)
  "api.etherscan.io",     // Contract verification info
  "api.dexscreener.com",  // DEX pair/volume data
  "api.coingecko.com",    // Token data
];

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_LENGTH = 8_000;

/**
 * Validate URL against the domain allowlist.
 * Returns null if valid, error string if invalid.
 */
function validateUrl(urlStr: string): { url: URL; error: null } | { url: null; error: string } {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return { url: null, error: `Invalid URL: "${urlStr}"` };
  }

  if (url.protocol !== "https:") {
    return { url: null, error: `Only HTTPS URLs are allowed (got ${url.protocol})` };
  }

  const hostname = url.hostname.toLowerCase();
  if (!ALLOWED_DOMAINS.includes(hostname)) {
    return {
      url: null,
      error: `Domain "${hostname}" is not in the allowed list.\n\nAllowed domains:\n${ALLOWED_DOMAINS.map((d) => `- ${d}`).join("\n")}`,
    };
  }

  return { url, error: null };
}

/**
 * Main handler for web_fetch
 */
export async function handleWebFetch(args: { url: string }): Promise<string> {
  const validation = validateUrl(args.url);
  if (validation.error) {
    return `Error: ${validation.error}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(validation.url!.toString(), {
      signal: controller.signal,
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "tokamak-dao-agent/1.0",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return `Error: HTTP ${response.status} ${response.statusText}\nURL: ${args.url}`;
    }

    let body = await response.text();

    if (body.length > MAX_RESPONSE_LENGTH) {
      body = body.slice(0, MAX_RESPONSE_LENGTH) + `\n\n... (truncated, ${body.length} total chars)`;
    }

    return body;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return `Error: Request timed out after ${FETCH_TIMEOUT_MS / 1000}s\nURL: ${args.url}`;
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export function registerWebFetchTool(server: McpServer) {
  server.tool(
    "web_fetch",
    "Fetch data from trusted DeFi APIs. Use this to look up DEX router addresses, protocol info, or token data when not available in the local registry. Allowed domains: api.llama.fi, api.etherscan.io, api.dexscreener.com, api.coingecko.com.",
    {
      url: z
        .string()
        .describe("HTTPS URL to fetch. Must be from an allowed domain (api.llama.fi, api.etherscan.io, api.dexscreener.com, api.coingecko.com)."),
    },
    async ({ url }) => {
      try {
        const text = await handleWebFetch({ url });
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
