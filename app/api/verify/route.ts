import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { table, id } = parsed.data;

  const { error } = await supabase
    .from(table)
    .update({ last_verified_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
