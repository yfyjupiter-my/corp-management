/**
 * `lib/supabase/env.ts` — the guard that turns a missing Supabase variable into
 * an error naming it, instead of Supabase's opaque "No API key found in request".
 *
 * The reads are module-scope-free (inside functions), so `vi.resetModules()` plus
 * a fresh dynamic import is enough to re-evaluate them per case.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL };
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("supabase env guard", () => {
  it("returns the value when set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "abc";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    const { supabaseAnonKey, supabaseUrl } = await import("@/lib/supabase/env");
    expect(supabaseAnonKey()).toBe("abc");
    expect(supabaseUrl()).toBe("https://x.supabase.co");
  });

  it("throws naming the variable when unset", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { supabaseAnonKey } = await import("@/lib/supabase/env");
    expect(() => supabaseAnonKey()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY is not set/);
  });

  // An unset var and an empty one fail identically at Supabase — both send no
  // apikey header — so the guard must not distinguish them either.
  it("treats an empty string as unset", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    const { supabaseUrl } = await import("@/lib/supabase/env");
    expect(() => supabaseUrl()).toThrow(/NEXT_PUBLIC_SUPABASE_URL is not set/);
  });
});
