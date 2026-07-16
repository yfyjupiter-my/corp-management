import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cameraSchema } from "@/lib/validation/cctv";
import { dbErrorResponse } from "@/lib/api/db-error";
import { classifyGuardedUpdate, CONFLICT_MESSAGE } from "@/lib/api/optimistic";
import { writeLimiter, rateLimitResponse } from "@/lib/api/rate-limit";
import type { Database } from "@/lib/types/database";

/**
 * Edit a single CCTV camera (PRD Story 3, TASKS 5.3). RLS scopes which rows the
 * caller may touch (via recorder → site); re-parenting to another country's
 * recorder is likewise gated by the WITH CHECK policy.
 *
 * BUS-6: the edit carries `expected_updated_at` (the value the client last read)
 * so a concurrent change is reported as `409` instead of being silently
 * clobbered — mirrors the device/site edit routes.
 */
const patchSchema = cameraSchema.partial().extend({
  expected_updated_at: z.string().min(1).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid camera id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // SEC-5: cap writes per user (shares the write budget, namespaced by action).
    const rl = writeLimiter.check(`edit:cctv_cameras:${user.id}`);
    if (!rl.ok) return rateLimitResponse(rl);

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    const { expected_updated_at, ...fields } = parsed.data;
    const patch: Database["public"]["Tables"]["cctv_cameras"]["Update"] = { ...fields };
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // BUS-6: guard on the last-read updated_at when the client supplied it.
    let update = supabase.from("cctv_cameras").update(patch).eq("id", id);
    if (expected_updated_at) update = update.eq("updated_at", expected_updated_at);
    const { data: updated, error } = await update.select("id");
    if (error) return dbErrorResponse(error, `PATCH /cameras/${id}`);

    // A guarded 0-row update is ambiguous: concurrent change vs. gone/invisible
    // under RLS. Re-read visibility to tell them apart.
    const updatedCount = updated?.length ?? 0;
    let rowVisible = true;
    if (expected_updated_at && updatedCount === 0) {
      const { data: current } = await supabase
        .from("cctv_cameras")
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
      return NextResponse.json({ error: "Camera not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[route-error] PATCH /cameras/[id]:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
