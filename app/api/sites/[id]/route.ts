import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteSchema } from "@/lib/validation/site";
import type { Database } from "@/lib/types/database";

/**
 * Edit or archive/restore a single site (PRD Story 1). RLS scopes which rows the
 * caller may touch. Archiving is a soft delete (`archived_at`) — there are no
 * hard deletes of referenced records; child rows inherit visibility via the site.
 */
const patchSchema = siteSchema
  .partial()
  .extend({ archived: z.boolean().optional() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid site id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const { archived, ...fields } = parsed.data;
  const patch: Database["public"]["Tables"]["sites"]["Update"] = { ...fields };
  if (archived !== undefined) {
    patch.archived_at = archived ? new Date().toISOString() : null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase.from("sites").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
