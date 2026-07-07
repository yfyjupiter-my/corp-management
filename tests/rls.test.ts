import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS isolation tests (finalize.md — Testing).
 *
 * Seeds two users — one hq_admin, one Malaysia country_manager — and asserts the
 * country manager can never read or write another country's rows, via the DB
 * (not just the UI). Requires a local Supabase (`supabase start`) and these env
 * vars for two pre-created test users:
 *
 *   TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY
 *   TEST_HQ_EMAIL, TEST_HQ_PASSWORD
 *   TEST_MY_MANAGER_EMAIL, TEST_MY_MANAGER_PASSWORD
 *
 * These are integration tests; skipped automatically when env is absent so the
 * default `npm test` stays green in CI without a database.
 */
const url = process.env.TEST_SUPABASE_URL;
const anon = process.env.TEST_SUPABASE_ANON_KEY;
const hasEnv =
  !!url &&
  !!anon &&
  !!process.env.TEST_HQ_EMAIL &&
  !!process.env.TEST_MY_MANAGER_EMAIL;

async function signedInClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(url!, anon!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

describe.skipIf(!hasEnv)("RLS cross-country isolation", () => {
  let hq: SupabaseClient;
  let myManager: SupabaseClient;

  beforeAll(async () => {
    hq = await signedInClient(
      process.env.TEST_HQ_EMAIL!,
      process.env.TEST_HQ_PASSWORD!,
    );
    myManager = await signedInClient(
      process.env.TEST_MY_MANAGER_EMAIL!,
      process.env.TEST_MY_MANAGER_PASSWORD!,
    );
  });

  it("HQ admin can read sites in every country", async () => {
    const { data, error } = await hq.from("sites").select("country_code");
    expect(error).toBeNull();
    const countries = new Set((data ?? []).map((r) => r.country_code));
    expect(countries.size).toBeGreaterThan(0);
  });

  it("MY manager only sees Malaysia sites", async () => {
    const { data, error } = await myManager.from("sites").select("country_code");
    expect(error).toBeNull();
    expect((data ?? []).every((r) => r.country_code === "MY")).toBe(true);
  });

  it("MY manager cannot insert a site in another country", async () => {
    const { error } = await myManager.from("sites").insert({
      country_code: "VN",
      name: "Illegal Hanoi site",
      timezone: "Asia/Ho_Chi_Minh",
      currency: "VND",
    });
    // Blocked by the WITH CHECK clause → RLS violation.
    expect(error).not.toBeNull();
  });

  it("MY manager cannot read the audit log", async () => {
    const { data, error } = await myManager.from("audit_log").select("id");
    // No select policy for non-HQ → empty result (or error), never rows.
    expect(error ? true : (data ?? []).length === 0).toBe(true);
  });
});
