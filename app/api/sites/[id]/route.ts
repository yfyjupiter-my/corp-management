import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteSchema } from "@/lib/validation/site";
import { dbErrorResponse } from "@/lib/api/db-error";
import { classifyGuardedUpdate } from "@/lib/api/optimistic";
import { getDictionary } from "@/lib/i18n/server";
import { validationMessage } from "@/lib/i18n/validation";
import type { Database } from "@/lib/types/database";

/**
 * Edit or archive/restore a single site (PRD Story 1). RLS scopes which rows the
 * caller may touch. Archiving is a soft delete (`archived_at`) — there are no
 * hard deletes of referenced records; child rows inherit visibility via the site.
 *
 * BUS-6: a field edit may carry `expected_updated_at` (the value the client last
 * read). When present the update is guarded with optimistic concurrency so a
 * concurrent change is reported as `409` instead of being silently clobbered.
 * Archive/restore omits it on purpose — an idempotent toggle can't lose data.
 */
const patchSchema = siteSchema.partial().extend({
  archived: z.boolean().optional(),
  expected_updated_at: z.string().min(1).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const t = await getDictionary();
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: t.errors.invalidSiteId }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: t.errors.unauthorized }, { status: 401 });

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: validationMessage(t, parsed.error.issues[0]?.message) ?? t.errors.invalidPayload },
        { status: 400 },
      );
    }

    const { archived, expected_updated_at, ...fields } = parsed.data;
    const patch: Database["public"]["Tables"]["sites"]["Update"] = { ...fields };
    if (archived !== undefined) {
      patch.archived_at = archived ? new Date().toISOString() : null;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: t.errors.nothingToUpdate }, { status: 400 });
    }

    // BUS-6: guard on the last-read updated_at when the client supplied it.
    let update = supabase.from("sites").update(patch).eq("id", id);
    if (expected_updated_at) update = update.eq("updated_at", expected_updated_at);
    const { data: updated, error } = await update.select("id");
    if (error) return dbErrorResponse(error, `PATCH /sites/${id}`, t);

    // A guarded update touching 0 rows is ambiguous: concurrent change vs. the
    // row being gone / invisible under RLS. Re-read visibility to tell them apart.
    const updatedCount = updated?.length ?? 0;
    let rowVisible = true;
    if (expected_updated_at && updatedCount === 0) {
      const { data: current } = await supabase
        .from("sites")
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
      return NextResponse.json({ error: t.errors.conflict }, { status: 409 });
    }
    if (outcome === "not_found") {
      return NextResponse.json({ error: t.errors.siteNotFound }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[route-error] PATCH /sites/[id]:", err);
    return NextResponse.json({ error: t.errors.serverError }, { status: 500 });
  }
}
