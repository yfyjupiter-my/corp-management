import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserSchema } from "@/lib/validation/user";
import { dbErrorResponse } from "@/lib/api/db-error";
import { createUserLimiter, rateLimitResponse } from "@/lib/api/rate-limit";
import { getDictionary } from "@/lib/i18n/server";
import { validationMessage } from "@/lib/i18n/validation";

/**
 * Create a user directly (PRD Story 4, revised).
 *
 * Replaces the invite-by-email flow: the account is created already-confirmed
 * with a password the caller sets, so it needs no SMTP and the user can sign in
 * immediately.
 *
 * This is the ONLY route that uses the service-role admin client, because
 * creating an auth user is not something the anon key can do. Roles were
 * removed in 0006_drop_roles.sql, so the only authorization check is "is the
 * caller signed in" — which is also all RLS enforces now.
 */
export async function POST(request: Request) {
  const t = await getDictionary();
  try {
    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ error: t.errors.forbidden }, { status: 403 });
    }

    // SEC-5: keyed by the acting user. Every authenticated user can reach this
    // route now, so the throttle is the only thing bounding account creation.
    const rl = createUserLimiter.check(`create-user:${actor.id}`);
    if (!rl.ok) return rateLimitResponse(rl, t);

    const parsed = createUserSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: validationMessage(t, parsed.error.issues[0]?.message) ?? t.errors.invalidPayload },
        { status: 400 },
      );
    }
    const { email, full_name, password } = parsed.data;

    const admin = createAdminClient();

    // email_confirm: true — no verification mail is sent, and the account is
    // usable straight away. This is the whole point of dropping the invite.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error || !data.user) {
      console.error("[users] createUser failed:", error);
      return NextResponse.json({ error: t.errors.createUserFailed }, { status: 400 });
    }

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: data.user.id,
      full_name,
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
            `[users] rollback deleteUser failed — orphaned auth user ${data.user.id} needs manual cleanup:`,
            delError,
          );
        }
      } catch (delErr) {
        console.error(
          `[users] rollback deleteUser threw — orphaned auth user ${data.user.id} needs manual cleanup:`,
          delErr,
        );
      }
      return dbErrorResponse(profileError, "POST /users (profile insert)", t);
    }

    // BUS-2: `profiles` has no audit trigger, and service-role writes record
    // actor=NULL, so log the acting user explicitly. Account creation is now
    // available to everyone, which makes the accountability record more
    // important than it was under the HQ-admin-only invite, not less.
    const { error: auditError } = await admin.from("audit_log").insert({
      actor: actor.id,
      action: "insert",
      table_name: "profiles",
      record_id: data.user.id,
      diff: { full_name },
    });
    if (auditError) {
      // Non-fatal: the user was created successfully; just flag the gap.
      console.error("[users] failed to write audit entry for new profile:", auditError);
    }

    return NextResponse.json({ ok: true, userId: data.user.id });
  } catch (err) {
    console.error("[route-error] POST /users:", err);
    return NextResponse.json({ error: t.errors.serverError }, { status: 500 });
  }
}
