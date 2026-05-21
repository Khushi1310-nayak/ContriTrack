import { NextResponse } from "next/server";

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

// In-memory token bucket registry for keys (resets hourly or per minute)
const rateLimitRegistry = new Map<string, RateLimitTracker>();

const LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute per key for playground/academic environments

/**
 * Validates request rates against dynamic API keys.
 * Returns null if request is allowed, or a NextResponse containing HTTP 429 error if limit exceeded.
 */
export function rateLimiter(keyId: string): NextResponse | null {
  const now = Date.now();
  const clientLog = rateLimitRegistry.get(keyId);

  if (!clientLog) {
    rateLimitRegistry.set(keyId, {
      count: 1,
      resetAt: now + LIMIT_WINDOW_MS,
    });
    return null;
  }

  // If window expired, reset client tracking stats
  if (now > clientLog.resetAt) {
    clientLog.count = 1;
    clientLog.resetAt = now + LIMIT_WINDOW_MS;
    return null;
  }

  // Increment and assert within bounds
  clientLog.count += 1;
  if (clientLog.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((clientLog.resetAt - now) / 1000);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Too Many Requests",
        message: `API rate limit exceeded. Please lower your request frequency.`,
        quotaLimit: MAX_REQUESTS_PER_WINDOW,
        retryAfterSeconds: retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
