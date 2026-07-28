import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS integration — child tables, audit immutability, and search
 * (TASKS 11.2 / 11.3 / 11.5). Companion to `tests/rls.test.ts`, which covers the
 * access model at the `sites` root; this file covers everything hanging off it.
 *
 * ⚠️ **Rewritten for the flat access model** (0006_drop_roles.sql). The old
 * version asserted a Malaysia manager could see none of a Vietnam fixture.
 * There are no roles any more, so the contract under test is now:
 *
 *   11.2 — a signed-in user can read AND write a child row under a site in any
 *          country, through every parent path (site_id, and recorder→site).
 *   11.3 — `audit_log` is still IMMUTABLE. It is now readable by everyone, but
 *          no one may update or delete a row. This is the one guarantee that
 *          survived the role removal intact, so it is worth more, not less.
 *   11.5 — `search_registry` still runs as the caller and returns rows from
 *          every country.
 *
 * Requires a live Supabase project and (skipped automatically when absent):
 *
 *   TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY
 *   TEST_USER_EMAIL, TEST_USER_PASSWORD
 *
 * ⚠️ Residue: creating and deleting the fixture writes immutable `audit_log`
 * rows (insert + delete per audited table). By design — the audit log has no
 * delete policy — so those rows persist. `afterAll` sweeps orphaned `__RLS11_`
 * sites from any previously-interrupted run.
 */

const url = process.env.TEST_SUPABASE_URL;
const anon = process.env.TEST_SUPABASE_ANON_KEY;
const hasEnv = !!url && !!anon && !!process.env.TEST_USER_EMAIL;

const TAG = `__RLS11_${Date.now()}`;

async function signedInClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(url!, anon!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

/** Ids of the VN fixture rows, one per child table. */
type Fixture = {
  siteId: string;
  circuitId: string;
  deviceId: string;
  ipSchemeId: string;
  vlanId: string;
  vpnLinkId: string;
  recorderId: string;
  cameraId: string;
};

/** Insert a row and return its id, throwing loudly on any failure. */
async function insert(
  client: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await client.from(table).insert(row).select("id").single();
  if (error) throw new Error(`seed ${table}: ${error.message}`);
  return (data as { id: string }).id;
}

describe.skipIf(!hasEnv)("RLS integration (child tables / audit / search)", () => {
  let user: SupabaseClient;
  let fx: Fixture;

  beforeAll(async () => {
    user = await signedInClient(
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!,
    );

    // Vietnam on purpose: the seeded data is Malaysia only, so writing here
    // proves the caller is not scoped to the country their own data sits in.
    const siteId = await insert(user, "sites", {
      country_code: "VN",
      name: `${TAG} Hanoi fixture`,
      timezone: "Asia/Ho_Chi_Minh",
      currency: "VND",
    });
    const recorderId = await insert(user, "cctv_recorders", {
      site_id: siteId,
      brand: `${TAG}-nvr`,
      channels: 8,
    });

    fx = {
      siteId,
      recorderId,
      circuitId: await insert(user, "isp_circuits", {
        site_id: siteId,
        provider: `${TAG}-isp`,
        type: "fiber",
      }),
      deviceId: await insert(user, "network_devices", {
        site_id: siteId,
        device_type: "router",
        hostname: `${TAG}-rtr`,
      }),
      ipSchemeId: await insert(user, "ip_schemes", { site_id: siteId, subnet: "10.99.0.0/24" }),
      vlanId: await insert(user, "vlans", { site_id: siteId, vlan_id: 999, name: `${TAG}-vlan` }),
      vpnLinkId: await insert(user, "vpn_links", {
        site_id: siteId,
        peer: `${TAG}-peer`,
        status: "unknown",
      }),
      cameraId: await insert(user, "cctv_cameras", {
        recorder_id: recorderId,
        label: `${TAG}-cam`,
      }),
    };
  }, 30_000);

  afterAll(async () => {
    // Cascade deletes every child. Also sweep orphans from earlier failed runs.
    if (user) await user.from("sites").delete().like("name", "__RLS11\\_%");
  });

  // ── 11.2 — child rows under any country are readable and writable ──────────
  describe("11.2 child-table access", () => {
    const cases: { table: string; key: keyof Fixture }[] = [
      { table: "isp_circuits", key: "circuitId" },
      { table: "network_devices", key: "deviceId" },
      { table: "ip_schemes", key: "ipSchemeId" },
      { table: "vlans", key: "vlanId" },
      { table: "vpn_links", key: "vpnLinkId" },
      { table: "cctv_recorders", key: "recorderId" },
    ];

    for (const { table, key } of cases) {
      it(`can read the VN ${table} row`, async () => {
        const { data, error } = await user.from(table).select("id").eq("id", fx[key]);
        expect(error).toBeNull();
        expect((data ?? []).length).toBe(1);
      });
    }

    it("can read the VN camera (scoped recorder→site)", async () => {
      const { data, error } = await user
        .from("cctv_cameras")
        .select("id")
        .eq("id", fx.cameraId);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("can insert and delete a child under the VN site", async () => {
      const { data, error } = await user
        .from("network_devices")
        .insert({ site_id: fx.siteId, device_type: "switch", hostname: `${TAG}-sw` })
        .select("id")
        .single();
      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();

      const del = await user.from("network_devices").delete().eq("id", data!.id).select("id");
      expect(del.error).toBeNull();
      expect((del.data ?? []).length).toBe(1); // full CRUD, not just create
    });

    it("can update a child under the VN site", async () => {
      const { data, error } = await user
        .from("vlans")
        .update({ name: `${TAG}-vlan-renamed` })
        .eq("id", fx.vlanId)
        .select("name");
      expect(error).toBeNull();
      expect(data?.[0]?.name).toBe(`${TAG}-vlan-renamed`);
    });
  });

  // ── 11.3 — audit_log stays immutable for everyone ──────────────────────────
  describe("11.3 audit immutability", () => {
    let auditId: string;

    beforeAll(async () => {
      // The VN site insert above wrote an audit row; grab it.
      const { data } = await user
        .from("audit_log")
        .select("id, action, table_name, record_id")
        .eq("record_id", fx.siteId)
        .eq("action", "insert")
        .limit(1)
        .single();
      auditId = (data as { id: string }).id;
    });

    it("the audit row was captured (guards the assertions below)", () => {
      expect(auditId).toBeTruthy();
    });

    // A missing UPDATE/DELETE policy makes PostgREST return 0 rows and NO error
    // (the 13.34 gotcha). "No error" therefore proves nothing on its own — each
    // test re-reads the row to confirm it is untouched and still present.
    it("cannot UPDATE an audit row", async () => {
      await user.from("audit_log").update({ action: "delete" }).eq("id", auditId);
      const { data } = await user
        .from("audit_log")
        .select("id, action")
        .eq("id", auditId)
        .single();
      expect(data).toBeTruthy();
      expect((data as { action: string }).action).toBe("insert"); // unchanged
    });

    it("cannot DELETE an audit row", async () => {
      await user.from("audit_log").delete().eq("id", auditId);
      const { data } = await user.from("audit_log").select("id").eq("id", auditId).single();
      expect(data).toBeTruthy(); // still there
    });
  });

  // ── 11.5 — search_registry runs as caller and spans every country ──────────
  describe("11.5 search", () => {
    it("search finds the VN fixture site", async () => {
      const { data, error } = await user.rpc("search_registry", { q: TAG });
      expect(error).toBeNull();
      const ids = (data ?? []).map((r: { id: string }) => r.id);
      expect(ids).toContain(fx.siteId);
    });
  });
});
