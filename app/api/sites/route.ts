import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteSchema } from "@/lib/validation/site";

/**
 * Create a site (PRD Story 1). Uses the RLS-scoped server client (user JWT), so
 * a country manager can only create sites for their own country — the WITH CHECK
 * policy enforces this even if the payload is tampered with. The shared Zod
 * schema also runs the secrets guard on free-text fields before the write.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = siteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const { error, data } = await supabase
    .from("sites")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
