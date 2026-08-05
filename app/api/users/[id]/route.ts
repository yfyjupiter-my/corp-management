import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbErrorResponse } from "@/lib/api/db-error";
import { createUserLimiter, rateLimitResponse } from "@/lib/api/rate-limit";
import { updateUserSchema } from "@/lib/validation/user";
import { getDictionary } from "@/lib/i18n/server";
import { validationMessage } from "@/lib/i18n/validation";

/**
 * Edit a user account (PRD Story 4, revised).
 *
 * Name lives in `profiles`, email and password live in `auth.users` — so this
 * needs the service-role client for the same reason POST/DELETE do. Roles were
 * removed in 0006_drop_roles.sql, so the only authorization check is "is the
 * caller signed in"; editing yourself is allowed (unlike deleting yourself).
 *
 * ⚠️ No optimistic concurrency here: `profiles` has no `updated_at` column, so
 * there is no BUS-6 token to echo. Two people editing the same account is a
 * last-write-wins race — acceptable for a 3-field record, and stated rather than
 * silently assumed.
 */
export async function PATCH(
  request: Request,
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

    // SEC-5: shares the account-mutation budget with POST/DELETE — this route
    // can set another user's password, so it belongs on the same throttle.
    const rl = createUserLimiter.check(`update-user:${actor.id}`);
    if (!rl.ok) return rateLimitResponse(rl, t);

    const parsed = updateUserSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: validationMessage(t, parsed.error.issues[0]?.message) ?? t.errors.invalidPayload },
        { status: 400 },
      );
    }
    const { email, full_name, password } = parsed.data;

    const admin = createAdminClient();

    // Both reads are 404 signals: an auth user with no profile is the orphan
    // shape the app treats as non-existent (it lands on /no-access), so it must
    // not be editable here either.
    const { data: authUser, error: authReadError } = await admin.auth.admin.getUserById(id);
    if (authReadError || !authUser?.user) {
      return NextResponse.json({ error: t.errors.userNotFound }, { status: 404 });
    }
    const { data: profile, error: readError } = await admin
      .from("profiles")
      .select("user_id, full_name")
      .eq("user_id", id)
      .maybeSingle();
    if (readError) return dbErrorResponse(readError, `PATCH /users/${id}`, t);
    if (!profile) {
      return NextResponse.json({ error: t.errors.userNotFound }, { status: 404 });
    }

    // Postgres stores the email lowercased; compare case-insensitively so a
    // cosmetic re-casing doesn't trigger an email change.
    const emailChanged = email.toLowerCase() !== (authUser.user.email ?? "").toLowerCase();
    const nameChanged = full_name !== profile.full_name;
    if (!emailChanged && !nameChanged && !password) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    // Auth side first. `email_confirm: true` keeps the account usable straight
    // away — without it a changed address would wait on a confirmation mail, and
    // SMTP is still unconfigured (12.2).
    if (emailChanged || password || nameChanged) {
      const { error } = await admin.auth.admin.updateUserById(id, {
        ...(emailChanged ? { email, email_confirm: true } : {}),
        ...(password ? { password } : {}),
        // Mirrors what POST writes; `profiles` below stays the display source.
        ...(nameChanged ? { user_metadata: { ...authUser.user.user_metadata, full_name } } : {}),
      });
      if (error) {
        console.error(`[users] updateUserById ${id} failed:`, error);
        return NextResponse.json({ error: t.errors.updateUserFailed }, { status: 400 });
      }
    }

    if (nameChanged) {
      const { error } = await admin
        .from("profiles")
        .update({ full_name })
        .eq("user_id", id);
      // The auth side already succeeded, so this leaves the account renamed in
      // `auth.users` but not in `profiles`. Surfaced rather than swallowed —
      // retrying the same save is safe (every step is idempotent).
      if (error) return dbErrorResponse(error, `PATCH /users/${id} (profile update)`, t);
    }

    // BUS-2: `profiles` has no audit trigger and the service role records
    // actor=NULL, so log the acting user explicitly — same reason as POST/DELETE.
    // 🔴 The new password is never written to the log; only the fact of a reset.
    const { error: auditError } = await admin.from("audit_log").insert({
      actor: actor.id,
      action: "update",
      table_name: "profiles",
      record_id: id,
      diff: {
        ...(nameChanged ? { full_name: { from: profile.full_name, to: full_name } } : {}),
        ...(emailChanged ? { email: { from: authUser.user.email ?? null, to: email } } : {}),
        ...(password ? { password_reset: true } : {}),
      },
    });
    if (auditError) {
      // Non-fatal: the change landed either way; just flag the gap.
      console.error("[users] failed to write audit entry for updated profile:", auditError);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[route-error] PATCH /users/[id]:", err);
    return NextResponse.json({ error: t.errors.serverError }, { status: 500 });
  }
}

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
