import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbErrorResponse } from "@/lib/api/db-error";
import { writeLimiter, rateLimitResponse } from "@/lib/api/rate-limit";
import { getDictionary } from "@/lib/i18n/server";

/**
 * "Verify — still accurate" action (PRD Story 2 / finalize.md — Common columns).
 * Stamps `last_verified_at = now()` on a single row. RLS scopes which rows the
 * caller may touch; the allow-list of tables prevents pointing this at anything
 * unexpected.
 */
const VERIFIABLE = [
  "sites",
  "isp_circuits",
  "network_devices",
  "ip_schemes",
  "vlans",
  "vpn_links",
  "cctv_recorders",
  "cctv_cameras",
] as const;

const bodySchema = z.object({
  table: z.enum(VERIFIABLE),
  id: z.string().uuid(),
});

export async function POST(request: Request) {
  const t = await getDictionary();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: t.errors.unauthorized }, { status: 401 });

    // SEC-5: rate-limit verify stamps per user (shares the write budget).
    const rl = writeLimiter.check(`verify:${user.id}`);
    if (!rl.ok) return rateLimitResponse(rl, t);

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: t.errors.invalidPayload }, { status: 400 });
    }
    const { table, id } = parsed.data;

    const { error } = await supabase
      .from(table)
      .update({ last_verified_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return dbErrorResponse(error, `POST /verify (${table})`, t);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[route-error] POST /verify:", err);
    return NextResponse.json({ error: t.errors.serverError }, { status: 500 });
  }
}
