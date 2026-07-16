import { describe, it, expect } from "vitest";
import { RateLimiter } from "@/lib/api/rate-limit";

/** A controllable clock so window behaviour is deterministic. */
function fakeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("RateLimiter", () => {
  it("allows up to the limit within the window, then blocks", () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ limit: 3, windowMs: 60_000 }, clock.now);

    expect(rl.check("u1").ok).toBe(true);
    expect(rl.check("u1").ok).toBe(true);
    const third = rl.check("u1");
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);

    const blocked = rl.check("u1");
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks each key independently", () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ limit: 1, windowMs: 60_000 }, clock.now);

    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(false);
    // A different key is unaffected.
    expect(rl.check("b").ok).toBe(true);
  });

  it("frees capacity as hits age out of the window (sliding)", () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ limit: 2, windowMs: 60_000 }, clock.now);

    rl.check("u1"); // t=0
    clock.advance(30_000);
    rl.check("u1"); // t=30s
    expect(rl.check("u1").ok).toBe(false); // 2 in window → blocked

    // Advance past the first hit's window; one slot frees up.
    clock.advance(31_000); // t=61s, first hit (t=0) now outside window
    expect(rl.check("u1").ok).toBe(true);
  });

  it("reports retryAfterSeconds until the oldest hit expires", () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ limit: 1, windowMs: 60_000 }, clock.now);

    rl.check("u1"); // t=0
    clock.advance(10_000); // t=10s
    const blocked = rl.check("u1");
    expect(blocked.ok).toBe(false);
    // Oldest hit (t=0) leaves the window at t=60s → ~50s from now.
    expect(blocked.retryAfterSeconds).toBe(50);
  });

  it("never reports a retryAfter below 1s while blocked", () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ limit: 1, windowMs: 60_000 }, clock.now);
    rl.check("u1"); // t=0
    clock.advance(59_999); // a hair before expiry
    const blocked = rl.check("u1");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
  });

  it("sweep() drops keys with no hits left in the window", () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ limit: 5, windowMs: 60_000 }, clock.now);
    rl.check("u1");
    clock.advance(61_000);
    rl.sweep();
    // After sweep the stale key is gone, so full capacity is available again.
    for (let i = 0; i < 5; i++) expect(rl.check("u1").ok).toBe(true);
    expect(rl.check("u1").ok).toBe(false);
  });
});
