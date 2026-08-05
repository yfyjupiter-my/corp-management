import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbErrorResponse } from "@/lib/api/db-error";
import { createUserLimiter, rateLimitResponse } from "@/lib/api/rate-limit";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Delete a user account (PRD Story 4, revised).
 *
 * Deletes the **auth** user; `profiles.user_id references auth.users on delete
 * cascade` (0001_init.sql) removes the profile row with it. Doing it the other
 * way round — deleting the profile — would leave an auth user that can still
 * sign in but lands on `/no-access`, which is exactly the orphan shape found and
 * closed on 2026-07-28.
 *
 * Like `POST`, this needs the service-role client: the anon key cannot touch
 * `auth.users`. Roles were removed in 0006_drop_roles.sql, so the only
 * authorization check is "is the caller signed in" — plus one extra guard below.
 *
 * ⚠️ A user's authored rows are NOT removed. `created_by` on the inventory
 * tables and `actor` on `audit_log` are plain uuid columns with no FK, so the
 * registry survives intact and the audit trail keeps pointing at the deleted
 * account. That is deliberate: an immutable log must not be editable by removing
 * the person who wrote it.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const t = await getDictionary();
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: t.errors.invalidUserId }, { status: 400 });
    }

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ error: t.errors.forbidden }, { status: 403 });
    }

    // 🔴 Self-deletion is refused, and this is a safety guard, not a courtesy:
    // with roles gone every account is a full-access account, so the only thing
    // keeping the app reachable is that at least one user exists. Because a
    // caller can never remove itself, the last account standing cannot be
    // deleted from inside the app — public sign-up is disabled (2.7), so an
    // empty `profiles` table would mean nobody could ever sign in again.
    if (id === actor.id) {
      return NextResponse.json({ error: t.errors.cannotDeleteSelf }, { status: 400 });
    }

    // SEC-5: shares the account-mutation budget with POST, keyed by the acting
    // user. Every authenticated user can now delete accounts, so this throttle
    // bounds how fast one session can empty the auth table.
    const rl = createUserLimiter.check(`delete-user:${actor.id}`);
    if (!rl.ok) return rateLimitResponse(rl, t);

    const admin = createAdminClient();

    // Read the profile first: it supplies the name for the audit diff, and its
    // absence is the 404 signal. `deleteUser` on an unknown id errors, but with
    // a shape we would then have to classify — this is the clearer path.
    const { data: profile, error: readError } = await admin
      .from("profiles")
      .select("user_id, full_name")
      .eq("user_id", id)
      .maybeSingle();
    if (readError) return dbErrorResponse(readError, `DELETE /users/${id}`, t);
    if (!profile) {
      return NextResponse.json({ error: t.errors.userNotFound }, { status: 404 });
    }

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      console.error(`[users] deleteUser ${id} failed:`, error);
      return NextResponse.json({ error: t.errors.deleteUserFailed }, { status: 400 });
    }

    // BUS-2: `profiles` has no audit trigger, and the cascade runs as the
    // service role (actor = NULL), so record the acting user explicitly — the
    // same reason POST /api/users does. Written after the delete succeeds, so
    // the log never claims a removal that did not happen.
    const { error: auditError } = await admin.from("audit_log").insert({
      actor: actor.id,
      action: "delete",
      table_name: "profiles",
      record_id: id,
      diff: { full_name: profile.full_name },
    });
    if (auditError) {
      // Non-fatal: the account is gone either way; just flag the gap.
      console.error("[users] failed to write audit entry for deleted profile:", auditError);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[route-error] DELETE /users/[id]:", err);
    return NextResponse.json({ error: t.errors.serverError }, { status: 500 });
  }
}
