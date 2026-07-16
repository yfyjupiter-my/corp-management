import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { networkDeviceSchema } from "@/lib/validation/network";
import { dbErrorResponse } from "@/lib/api/db-error";
import { classifyGuardedUpdate, CONFLICT_MESSAGE } from "@/lib/api/optimistic";
import { writeLimiter, rateLimitResponse } from "@/lib/api/rate-limit";
import type { Database } from "@/lib/types/database";

/**
 * Edit a single network device (PRD Story 2, TASKS 4.3). RLS scopes which rows
 * the caller may touch; moving a device to another country's site is likewise
 * gated by the sites WITH CHECK policy.
 *
 * BUS-6: the edit carries `expected_updated_at` (the value the client last read)
 * so a concurrent change is reported as `409` instead of being silently
 * clobbered — mirrors the site edit route.
 */
const patchSchema = networkDeviceSchema.partial().extend({
  expected_updated_at: z.string().min(1).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid device id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // SEC-5: cap writes per user (shares the write budget, namespaced by action).
    const rl = writeLimiter.check(`edit:network_devices:${user.id}`);
    if (!rl.ok) return rateLimitResponse(rl);

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    const { expected_updated_at, ...fields } = parsed.data;
    const patch: Database["public"]["Tables"]["network_devices"]["Update"] = { ...fields };
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // BUS-6: guard on the last-read updated_at when the client supplied it.
    let update = supabase.from("network_devices").update(patch).eq("id", id);
    if (expected_updated_at) update = update.eq("updated_at", expected_updated_at);
    const { data: updated, error } = await update.select("id");
    if (error) return dbErrorResponse(error, `PATCH /devices/${id}`);

    // A guarded 0-row update is ambiguous: concurrent change vs. gone/invisible
    // under RLS. Re-read visibility to tell them apart.
    const updatedCount = updated?.length ?? 0;
    let rowVisible = true;
    if (expected_updated_at && updatedCount === 0) {
      const { data: current } = await supabase
        .from("network_devices")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      rowVisible = Boolean(current);
    }

    const outcome = classifyGuardedUpdate({
      guarded: Boolean(expected_updated_at),
      updatedCount,
      rowVisible,
    });
    if (outcome === "conflict") {
      return NextResponse.json({ error: CONFLICT_MESSAGE }, { status: 409 });
    }
    if (outcome === "not_found") {
      return NextResponse.json({ error: "Device not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[route-error] PATCH /devices/[id]:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
