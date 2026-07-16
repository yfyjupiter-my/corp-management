import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteUserSchema } from "@/lib/validation/user";
import { dbErrorResponse } from "@/lib/api/db-error";
import { inviteLimiter, rateLimitResponse } from "@/lib/api/rate-limit";

/**
 * Invite a user (PRD Story 4). HQ admin only.
 *
 * This is the ONLY route that uses the service-role admin client: it creates the
 * auth user (sending an invite email) and their profile row (role + country).
 * Authorization is double-checked here because the admin client bypasses RLS.
 */
export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (actor?.role !== "hq_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // SEC-5: tighter limit — each invite sends an email, so unthrottled calls
    // enable email bombing / user enumeration. Keyed by the acting admin.
    const rl = inviteLimiter.check(`invite:${actor.id}`);
    if (!rl.ok) return rateLimitResponse(rl);

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
      console.error("[invite] inviteUserByEmail failed:", error);
      return NextResponse.json(
        { error: "Could not send the invite. Please try again." },
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
      // If the rollback itself fails the auth user is orphaned (can sign in but
      // has no profile → lands on /no-access); log loudly for manual cleanup
      // rather than letting the rejection surface as an unhandled 500 (ROB-1).
      try {
        const { error: delError } = await admin.auth.admin.deleteUser(data.user.id);
        if (delError) {
          console.error(
            `[invite] rollback deleteUser failed — orphaned auth user ${data.user.id} needs manual cleanup:`,
            delError,
          );
        }
      } catch (delErr) {
        console.error(
          `[invite] rollback deleteUser threw — orphaned auth user ${data.user.id} needs manual cleanup:`,
          delErr,
        );
      }
      return dbErrorResponse(profileError, "POST /invite (profile insert)");
    }

    // BUS-2: `profiles` has no audit trigger, and service-role writes record
    // actor=NULL, so log the acting HQ admin explicitly. This is the
    // accountability record for an hq_admin minting another hq_admin (an
    // accepted capability in the trust model, but one that must be traceable).
    const { error: auditError } = await admin.from("audit_log").insert({
      actor: actor.id,
      action: "insert",
      table_name: "profiles",
      record_id: data.user.id,
      diff: { role, country_code: role === "hq_admin" ? null : country_code, full_name },
    });
    if (auditError) {
      // Non-fatal: the user was created successfully; just flag the gap.
      console.error("[invite] failed to write audit entry for new profile:", auditError);
    }

    return NextResponse.json({ ok: true, userId: data.user.id });
  } catch (err) {
    console.error("[route-error] POST /invite:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
