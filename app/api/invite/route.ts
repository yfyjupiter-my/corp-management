import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteUserSchema } from "@/lib/validation/user";

/**
 * Invite a user (PRD Story 4). HQ admin only.
 *
 * This is the ONLY route that uses the service-role admin client: it creates the
 * auth user (sending an invite email) and their profile row (role + country).
 * Authorization is double-checked here because the admin client bypasses RLS.
 */
export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (actor?.role !== "hq_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = inviteUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }
  const { email, full_name, role, country_code } = parsed.data;

  const admin = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name },
  });
  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create user" },
      { status: 400 },
    );
  }

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: data.user.id,
    full_name,
    role,
    country_code: role === "hq_admin" ? null : country_code!,
  });
  if (profileError) {
    // Roll back the auth user so a failed profile insert doesn't strand it.
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId: data.user.id });
}
