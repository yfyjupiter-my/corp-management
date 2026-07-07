import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { networkDeviceSchema } from "@/lib/validation/network";

/**
 * Create a network device. Uses the RLS-scoped server client (user JWT), so a
 * country manager can only insert against their own country's sites — the
 * WITH CHECK policy enforces this even if the client is bypassed. The shared
 * Zod schema also runs the secrets guard before the write.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = networkDeviceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const { error, data } = await supabase
    .from("network_devices")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
