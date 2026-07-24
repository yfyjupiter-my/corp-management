import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS integration — child tables, audit immutability, and search scoping
 * (TASKS 11.2 / 11.3 / 11.5). Companion to `tests/rls.test.ts` (11.1), which
 * covers the `sites` root; this file covers everything hanging off it.
 *
 * Requires the same env as 11.1 (skipped automatically when absent):
 *
 *   TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY
 *   TEST_HQ_EMAIL, TEST_HQ_PASSWORD
 *   TEST_MY_MANAGER_EMAIL, TEST_MY_MANAGER_PASSWORD
 *
 * ── Self-seeding ────────────────────────────────────────────────────────────
 * The linked project seeds Malaysia only, so a naive "the MY manager sees no
 * Vietnam rows" assertion would pass vacuously — there are no VN rows to miss.
 * Instead the suite has the **HQ admin** create a distinctive VN site plus one
 * child in every table in `beforeAll`, and deletes it in `afterAll` (the FK
 * cascade removes the children). Every isolation assertion is therefore paired
 * with an HQ read proving the row genuinely exists but is invisible to the
 * manager — real isolation, not an empty table.
 *
 * ⚠️ Residue: creating and deleting the fixture writes immutable `audit_log`
 * rows (insert + delete per audited table). This is by design — the audit log
 * has no delete policy — so those rows persist. `afterAll` also sweeps any
 * orphaned `__RLS11_` sites from a previously-interrupted run.
 */

const url = process.env.TEST_SUPABASE_URL;
const anon = process.env.TEST_SUPABASE_ANON_KEY;
const hasEnv =
  !!url &&
  !!anon &&
  !!process.env.TEST_HQ_EMAIL &&
  !!process.env.TEST_MY_MANAGER_EMAIL;

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

/** Insert a row as HQ and return its id, throwing loudly on any failure. */
async function insert(
  hq: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await hq.from(table).insert(row).select("id").single();
  if (error) throw new Error(`seed ${table}: ${error.message}`);
  return (data as { id: string }).id;
}

describe.skipIf(!hasEnv)("RLS integration (child tables / audit / search)", () => {
  let hq: SupabaseClient;
  let myManager: SupabaseClient;
  let fx: Fixture;

  beforeAll(async () => {
    hq = await signedInClient(process.env.TEST_HQ_EMAIL!, process.env.TEST_HQ_PASSWORD!);
    myManager = await signedInClient(
      process.env.TEST_MY_MANAGER_EMAIL!,
      process.env.TEST_MY_MANAGER_PASSWORD!,
    );

    const siteId = await insert(hq, "sites", {
      country_code: "VN",
      name: `${TAG} Hanoi fixture`,
      timezone: "Asia/Ho_Chi_Minh",
      currency: "VND",
    });
    const recorderId = await insert(hq, "cctv_recorders", {
      site_id: siteId,
      brand: `${TAG}-nvr`,
      channels: 8,
    });

    fx = {
      siteId,
      recorderId,
      circuitId: await insert(hq, "isp_circuits", {
        site_id: siteId,
        provider: `${TAG}-isp`,
        type: "fiber",
      }),
      deviceId: await insert(hq, "network_devices", {
        site_id: siteId,
        device_type: "router",
        hostname: `${TAG}-rtr`,
      }),
      ipSchemeId: await insert(hq, "ip_schemes", { site_id: siteId, subnet: "10.99.0.0/24" }),
      vlanId: await insert(hq, "vlans", { site_id: siteId, vlan_id: 999, name: `${TAG}-vlan` }),
      vpnLinkId: await insert(hq, "vpn_links", {
        site_id: siteId,
        peer: `${TAG}-peer`,
        status: "unknown",
      }),
      cameraId: await insert(hq, "cctv_cameras", {
        recorder_id: recorderId,
        label: `${TAG}-cam`,
      }),
    };
  }, 30_000);

  afterAll(async () => {
    // Cascade deletes every child. Also sweep orphans from earlier failed runs.
    if (hq) await hq.from("sites").delete().like("name", "__RLS11\\_%");
  });

  // ── 11.2 — child tables are scoped through the parent site ─────────────────
  describe("11.2 child-table isolation", () => {
    const cases: { table: string; key: keyof Fixture }[] = [
      { table: "isp_circuits", key: "circuitId" },
      { table: "network_devices", key: "deviceId" },
      { table: "ip_schemes", key: "ipSchemeId" },
      { table: "vlans", key: "vlanId" },
      { table: "vpn_links", key: "vpnLinkId" },
      { table: "cctv_recorders", key: "recorderId" },
    ];

    for (const { table, key } of cases) {
      it(`MY manager cannot see the VN ${table} row that HQ can`, async () => {
        const id = fx[key];
        // HQ sees it — proves the row exists, so the manager's miss is isolation.
        const asHq = await hq.from(table).select("id").eq("id", id);
        expect(asHq.error).toBeNull();
        expect((asHq.data ?? []).length).toBe(1);

        const asMgr = await myManager.from(table).select("id").eq("id", id);
        // No select policy match → empty result (never an error, never the row).
        expect((asMgr.data ?? []).length).toBe(0);
      });
    }

    it("MY manager cannot see the VN camera (scoped recorder→site)", async () => {
      const asHq = await hq.from("cctv_cameras").select("id").eq("id", fx.cameraId);
      expect((asHq.data ?? []).length).toBe(1);
      const asMgr = await myManager.from("cctv_cameras").select("id").eq("id", fx.cameraId);
      expect((asMgr.data ?? []).length).toBe(0);
    });

    it("MY manager cannot insert a child under a VN site", async () => {
      const { error } = await myManager.from("network_devices").insert({
        site_id: fx.siteId,
        device_type: "switch",
        hostname: `${TAG}-illegal`,
      });
      // WITH CHECK fails because the parent site is outside the manager's country.
      expect(error).not.toBeNull();
    });
  });

  // ── 11.3 — audit_log is immutable, even for HQ who can read it ──────────────
  describe("11.3 audit immutability", () => {
    let auditId: string;
    let before: unknown;

    beforeAll(async () => {
      // The VN site insert above wrote an audit row; grab it as HQ.
      const { data } = await hq
        .from("audit_log")
        .select("id, diff, action, table_name, record_id")
        .eq("record_id", fx.siteId)
        .eq("action", "insert")
        .limit(1)
        .single();
      auditId = (data as { id: string }).id;
      before = data;
    });

    it("HQ actually captured the audit row (guards the assertions below)", () => {
      expect(auditId).toBeTruthy();
    });

    // A missing UPDATE/DELETE policy makes PostgREST return 0 rows and NO error
    // (the 13.34 gotcha). "No error" therefore proves nothing on its own — each
    // test re-reads through HQ to confirm the row is untouched and still present.
    for (const actor of ["HQ admin", "MY manager"] as const) {
      it(`${actor} cannot UPDATE an audit row`, async () => {
        const client = actor === "HQ admin" ? hq : myManager;
        await client.from("audit_log").update({ action: "delete" }).eq("id", auditId);
        const { data } = await hq
          .from("audit_log")
          .select("id, action")
          .eq("id", auditId)
          .single();
        expect(data).toBeTruthy();
        expect((data as { action: string }).action).toBe("insert"); // unchanged
      });

      it(`${actor} cannot DELETE an audit row`, async () => {
        const client = actor === "HQ admin" ? hq : myManager;
        await client.from("audit_log").delete().eq("id", auditId);
        const { data } = await hq.from("audit_log").select("id").eq("id", auditId).single();
        expect(data).toBeTruthy(); // still there
      });
    }

    it("MY manager cannot read any audit row", async () => {
      const { data, error } = await myManager.from("audit_log").select("id").limit(1);
      expect(error ? true : (data ?? []).length === 0).toBe(true);
      expect(before).toBeTruthy(); // sanity: HQ could read, manager cannot
    });
  });

  // ── 11.5 — search_registry runs as caller, so it is RLS-scoped ─────────────
  describe("11.5 search scoping", () => {
    it("HQ search finds the VN fixture site", async () => {
      const { data, error } = await hq.rpc("search_registry", { q: TAG });
      expect(error).toBeNull();
      const ids = (data ?? []).map((r: { id: string }) => r.id);
      expect(ids).toContain(fx.siteId);
    });

    it("MY manager search returns zero VN rows", async () => {
      const { data, error } = await myManager.rpc("search_registry", { q: TAG });
      expect(error).toBeNull();
      // Every fixture row is VN; none may surface for a MY manager.
      expect((data ?? []).length).toBe(0);
    });
  });
});
