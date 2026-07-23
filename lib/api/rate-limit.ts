import { NextResponse } from "next/server";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * SEC-5 — in-memory rate limiting for authenticated API routes.
 *
 * Per-process sliding-window limiter. This matches the single-container Docker
 * deployment target (prd.md): one long-lived Node process, so a plain in-memory
 * map is correct and adds no infra dependency. Two caveats, by design:
 *
 *  - Limits are PER INSTANCE. If the app is ever scaled to multiple containers
 *    or moved to serverless (Vercel), swap these instances for a shared store
 *    (Upstash/Redis/Postgres) — the route call sites won't need to change.
 *  - Login and forgot-password are client-side (they call Supabase Auth directly
 *    from the browser, never our server), so they are NOT covered here; they rely
 *    on Supabase Auth's built-in per-IP throttling.
 *
 * Keys are the authenticated user id, so there is no spoofable-header trust: an
 * unauthenticated request is rejected (401) before it reaches the limiter.
 */

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the caller may retry; 0 when `ok`. */
  retryAfterSeconds: number;
};

type Options = { limit: number; windowMs: number };

/** Sweep idle keys after this many checks so the map can't grow unbounded. */
const SWEEP_EVERY = 500;

export class RateLimiter {
  private hits = new Map<string, number[]>();
  private sinceSweep = 0;

  constructor(
    private readonly opts: Options,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records an attempt for `key` and reports whether it is within the limit. */
  check(key: string): RateLimitResult {
    const now = this.now();
    const windowStart = now - this.opts.windowMs;

    if (++this.sinceSweep >= SWEEP_EVERY) this.sweep();

    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= this.opts.limit) {
      // Blocked: keep the pruned list (do not record this attempt) and report
      // when the oldest in-window hit falls off.
      this.hits.set(key, recent);
      const retryAfterMs = recent[0] + this.opts.windowMs - now;
      return {
        ok: false,
        limit: this.opts.limit,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return {
      ok: true,
      limit: this.opts.limit,
      remaining: this.opts.limit - recent.length,
      retryAfterSeconds: 0,
    };
  }

  /** Drops keys with no hits left in the window; bounds memory over time. */
  sweep(): void {
    this.sinceSweep = 0;
    const windowStart = this.now() - this.opts.windowMs;
    for (const [key, ts] of this.hits) {
      const live = ts.filter((t) => t > windowStart);
      if (live.length === 0) this.hits.delete(key);
      else this.hits.set(key, live);
    }
  }

  /** Test helper — clears all recorded state. */
  reset(): void {
    this.hits.clear();
    this.sinceSweep = 0;
  }
}

/**
 * Shared per-process limiters. `write` covers the create + verify mutations a
 * human drives from forms (generous); `invite` is tighter because each call
 * sends an email (abuse = email bombing / user enumeration).
 */
export const writeLimiter = new RateLimiter({ limit: 60, windowMs: 60_000 });
export const inviteLimiter = new RateLimiter({ limit: 10, windowMs: 60_000 });

/** 429 response carrying a safe message and a `Retry-After` header. */
export function rateLimitResponse(
  result: RateLimitResult,
  t: Dictionary,
): NextResponse {
  return NextResponse.json(
    { error: t.errors.tooManyRequests },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
