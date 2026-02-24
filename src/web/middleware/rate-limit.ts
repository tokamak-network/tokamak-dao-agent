/**
 * IP-based sliding window rate limiter middleware for Hono.
 *
 * Uses an in-memory Map with automatic cleanup — no external dependencies.
 */

import type { Context, Next, MiddlewareHandler } from "hono";

interface WindowEntry {
  timestamps: number[];
}

const stores = new Map<string, Map<string, WindowEntry>>();

/** Periodic cleanup interval (60s) to evict expired entries. */
const CLEANUP_INTERVAL_MS = 60_000;
let cleanupStarted = false;

function startCleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        // Remove timestamps older than 2 minutes (covers the largest window)
        entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000);
        if (entry.timestamps.length === 0) store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS).unref();
}

function getClientIp(c: Context): string {
  return (
    c.req.header("fly-client-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

/**
 * Create a rate limiter middleware.
 *
 * @param limit   Max requests per window
 * @param windowMs  Window size in milliseconds
 * @param keyPrefix Optional prefix to isolate stores for different endpoints
 */
export function rateLimit(opts: {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
}): MiddlewareHandler {
  const { limit, windowMs, keyPrefix = "default" } = opts;

  if (!stores.has(keyPrefix)) {
    stores.set(keyPrefix, new Map());
  }
  const store = stores.get(keyPrefix)!;

  startCleanup();

  return async (c: Context, next: Next) => {
    const ip = getClientIp(c);
    const now = Date.now();

    let entry = store.get(ip);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(ip, entry);
    }

    // Sliding window: keep only timestamps within the current window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

    if (entry.timestamps.length >= limit) {
      const retryAfter = Math.ceil(
        (entry.timestamps[0]! + windowMs - now) / 1000,
      );
      c.header("Retry-After", String(retryAfter));
      c.header("X-RateLimit-Limit", String(limit));
      c.header("X-RateLimit-Remaining", "0");
      return c.json(
        { error: "Too many requests. Please try again later." },
        429,
      );
    }

    entry.timestamps.push(now);

    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(limit - entry.timestamps.length));

    return next();
  };
}
