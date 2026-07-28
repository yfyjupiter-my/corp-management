import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS access-model tests.
 *
 * ⚠️ **This file used to assert cross-country isolation.** It no longer does,
 * because 0006_drop_roles.sql removed the role system: RLS is now only an
 * AUTHENTICATION boundary. What is left to verify is exactly that —
 *
 *   1. a signed-in user reads and writes **every** country, and
 *   2. the **anon** key still reads and writes **nothing**.
 *
 * (2) is the assertion that actually earns its keep now. Deny-by-default is the
 * only remaining guarantee, and it rests entirely on `auth.uid() is not null`
 * inside every policy — a single mis-written policy would open the whole
 * registry to the public anon key, which ships in the browser bundle.
 *
 * Requires a live Supabase project and these env vars for one test user
 * (skipped automatically when absent, so `npm test` stays green without a DB):
 *
 *   TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY
 *   TEST_USER_EMAIL, TEST_USER_PASSWORD
 */
const url = process.env.TEST_SUPABASE_URL;
const anon = process.env.TEST_SUPABASE_ANON_KEY;
const hasEnv = !!url && !!anon && !!process.env.TEST_USER_EMAIL;

const TAG = `__RLS_ACCESS_${Date.now()}`;

async function signedInClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(url!, anon!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

function anonClient(): SupabaseClient {
  return createClient(url!, anon!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe.skipIf(!hasEnv)("RLS access model (flat: authenticated = full CRUD)", () => {
  let user: SupabaseClient;
  let guest: SupabaseClient;

  beforeAll(async () => {
    user = await signedInClient(
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!,
    );
    guest = anonClient();
  });

  afterAll(async () => {
    // Sweep this run's fixtures plus any orphans from an interrupted run.
    if (user) await user.from("sites").delete().like("name", "__RLS\\_ACCESS\\_%");
  });

  it("an authenticated user can read sites", async () => {
    const { error } = await user.from("sites").select("country_code");
    expect(error).toBeNull();
  });

  // The inverse of the old "MY manager cannot insert a VN site" test: a user
  // with no country of their own may now write into any of the four.
  it("an authenticated user can create a site in every country", async () => {
    for (const country of ["VN", "TH", "ID", "MY"] as const) {
      const { data, error } = await user
        .from("sites")
        .insert({
          country_code: country,
          name: `${TAG} ${country}`,
          timezone: "Asia/Singapore",
          currency: "USD",
        })
        .select("id, country_code")
        .single();
      expect(error, `insert into ${country}`).toBeNull();
      expect(data?.country_code).toBe(country);
    }
  });

  it("an authenticated user can read the audit log", async () => {
    const { error } = await user.from("audit_log").select("id").limit(1);
    expect(error).toBeNull();
  });

  // ── deny-by-default: the anon key is the only boundary left ────────────────
  describe("anon is denied", () => {
    const tables = [
      "profiles",
      "sites",
      "isp_circuits",
      "network_devices",
      "ip_schemes",
      "vlans",
      "vpn_links",
      "cctv_recorders",
      "cctv_cameras",
      "maintenance_logs",
      "audit_log",
      "country_settings",
    ];

    for (const table of tables) {
      it(`anon reads no rows from ${table}`, async () => {
        const { data, error } = await guest.from(table).select("*").limit(1);
        // A policy that never matches yields 0 rows and no error; an outright
        // denial yields an error. Either is a pass — rows are not.
        expect(error ? true : (data ?? []).length === 0).toBe(true);
      });
    }

    it("anon cannot insert a site", async () => {
      const { error } = await guest.from("sites").insert({
        country_code: "VN",
        name: `${TAG} anon`,
        timezone: "Asia/Ho_Chi_Minh",
        currency: "VND",
      });
      expect(error).not.toBeNull();
    });

    it("anon search returns nothing", async () => {
      const { data, error } = await guest.rpc("search_registry", { q: TAG });
      expect(error ? true : (data ?? []).length === 0).toBe(true);
    });
  });
});
