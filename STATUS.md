# STATUS — Corp Management Platform (MVP v1.0)

| Field | Value |
|---|---|
| **Last updated** | 2026-08-05 (**Users page gained an Edit action** — `PATCH /api/users/[id]`. Same day: Delete action; Phase 12 broken into 29 subtasks; audit log page removed. **Phase 12 is all that remains**) |
| **Source of truth** | `TASKS.md` (phase-by-phase subtasks) |
| **Build health** | `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ (clean `.next`) · tests **82 passed / 30 skipped** without `TEST_*` (was 75; +7 `updateUserSchema`) · **112 total** against a live project |

> High-level rollup of `TASKS.md`. When a phase's status changes, update both files.

---

## Latest change (2026-08-05) — Users can now be edited from the Users page

The Users page was create-list-delete; there was no way to fix a typo'd name, change a sign-in
address, or reset a forgotten password without the Supabase dashboard. New **`PATCH
/api/users/[id]`** plus an **Edit** button per row and a `/users/[id]/edit` page.

- **Three fields: name, email, password.** Name lives in `profiles`, email and password in
  `auth.users` — so the route uses `createAdminClient` for the same reason `POST`/`DELETE` do.
  **No migration, no RLS change.**
- **A blank password box keeps the current password**, it does not clear it. `updateUserSchema`
  normalises `""` → `undefined`; the union is safe here because the `min(8)` branch *rejects* `""`
  and falls through (the trap documented in `lib/validation/common.ts`). Same 72-char bcrypt cap as
  creation.
- **Email changes are applied with `email_confirm: true`** so the account stays usable immediately —
  without it a changed address would wait on a confirmation mail, and SMTP is still unconfigured
  (12.2). Comparison is case-insensitive, so a cosmetic re-casing is not treated as a change.
- **Editing yourself is allowed** — unlike Delete, there is nothing unsafe about it, so the Edit
  button shows on every row including the "You" one.
- **Authorization is "is the caller signed in"**, matching `POST`/`DELETE` — there is no admin tier
  left to gate on. Every user can rename, re-email and **reset the password of** every other user,
  which is a real consequence of Phase 14 and is stated here rather than discovered later.
- ⚠️ **No optimistic concurrency.** `profiles` has no `updated_at`, so there is no BUS-6 token to
  echo: two simultaneous edits are last-write-wins. Accepted for a 3-field record.
- **BUS-2 audit write carried over**, with the diff recording `full_name`/`email` from→to and a bare
  `password_reset: true` — 🔴 **the new password is never written to the log**. Rate-limited on the
  shared `createUserLimiter` (10/min, keyed `update-user:<uid>`), since this route can set another
  account's password.
- **The edit page reads through the service role** (the email is not visible to the anon key), which
  makes its `getCurrentUser()` check load-bearing rather than decorative — middleware gates `(app)`,
  and this is the second lock on the same door. A non-uuid segment, a missing profile, and an auth
  user with no profile all 404, matching the route and 10.7.
- **7 new dictionary keys in both locales** (`users.editTitle`/`editSubtitle`/`fieldNewPassword`/
  `newPasswordHelp`/`saveFailed`, `errors.updateUserFailed`). Key-parity test green.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ (clean `.next`;
  `/users/[id]/edit` present in the route list) · tests **82 passed / 30 skipped** (+7 new
  `updateUserSchema` tests covering the blank-password normalisation and the length bounds).
- ⚠️ **Not driven live.** No account has actually been edited against the database. Worth folding
  into the same staging check as delete (12.4.6): rename a user, change their email, sign in with
  the new address, reset their password and sign in with the new one.

---

## Latest change (2026-08-05) — Users can now be deleted from the Users page

The Users page was create-and-list only; there was no way to remove an account short of the Supabase
dashboard. New **`DELETE /api/users/[id]`** plus a Delete button in a new actions column, reusing the
shared `DeleteButton` the Sites/Network/CCTV tables already use.

- **It deletes the *auth* user, not the profile.** `profiles.user_id references auth.users on delete
  cascade` (`0001_init.sql:21`) removes the profile row with it. Deleting the profile instead would
  leave an auth user that still authenticates and lands on `/no-access` — the exact orphan shape
  found and closed on 2026-07-28. Uses `createAdminClient` for the same reason `POST` does: the anon
  key cannot touch `auth.users`. **No migration, no RLS change.**
- 🔴 **Self-deletion is refused (`400`), and that guard is what keeps the app reachable.** With roles
  gone every account is full-access, and public sign-up is disabled (2.7) — so an empty `profiles`
  table means *nobody can ever sign in again*. Because a caller can never remove itself, the last
  account standing cannot be deleted from inside the app. The page reflects this: the caller's own
  row shows a **"You" chip** where the button would be, so the refusal is never reachable by
  clicking. ⚠️ It is still reachable by hand — the route owns the guarantee, not the UI.
- **Authorization is "is the caller signed in", matching `POST /api/users`** — there is no admin tier
  left to gate on. Every user can delete every other user, including the account that created them.
  This follows from Phase 14 and is stated here rather than discovered later.
- ⚠️ **A deleted user's data stays.** `created_by` on the inventory tables and `actor` on `audit_log`
  are plain `uuid` columns with **no FK**, so nothing cascades: the registry survives intact and the
  audit trail keeps pointing at the removed account (`audit_log` already holds such rows from the
  deleted RLS test users). Deliberate — an immutable log must not become editable by deleting whoever
  wrote it.
- **BUS-2 audit write carried over from `POST`:** `profiles` has no audit trigger and the cascade runs
  as the service role (`actor` = NULL), so the acting user is logged explicitly, **after** the delete
  succeeds so the log never claims a removal that did not happen. Rate-limited on the shared
  `createUserLimiter` (10/min, keyed `delete-user:<uid>`) — the same budget as creation, since both
  mutate the auth table.
- **404 comes from a profile pre-read**, not from classifying `deleteUser`'s error; that read also
  supplies the name for the audit diff.
- **7 new dictionary keys in both locales** (`users.you`, `users.deleteConfirm`, `errors.deleteUserFailed`,
  `cannotDeleteSelf`, `invalidUserId`, `userNotFound`). The confirm sentence spells out that access is
  lost immediately, that it cannot be undone, and that their records remain. Key-parity test green.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ (clean `.next`;
  `/api/users/[id]` present in the route list) · tests **75 passed / 30 skipped** (unchanged — no new
  unit test; the logic is route-level and needs a live env).
- ⚠️ **Not driven live.** No account has actually been deleted against the database. Worth a check on
  staging (12.4.6): delete a second user, confirm they can no longer sign in, confirm **0 orphans in
  both directions**, and confirm the self-delete refusal.

---

## Earlier change (2026-08-05) — Phase 12 broken down into 29 subtasks

**Planning only — no source, schema or test changed.** `TASKS.md` Phase 12 was four one-line items,
each blocked on infrastructure and each too coarse to start. Now split so a partial session leaves a
precise resume point: **12.1 ×6 · 12.2 ×10 · 12.3 ×6 · 12.4 ×7**. The originals stay as rollup
parents, ticked only when their subtasks are.

- **Order is forced, not preference:** `12.2 (staging) → 12.3 (secrets) → 12.4 (pen-test)`. The
  pen-test needs a deployed staging; CI's RLS job needs a test user that only staging should hold.
  **12.1 is independent of all three** — it needs a machine with Docker and nothing else, which makes
  it the only item startable right now, offline, alone.
- **Production is deliberately last (12.2.9)** and is *not* a copy of staging: it omits `seed.sql`
  (which has no conflict guard) and omits the test user. ⚠️ With roles gone, any account is a
  full-access account, so a file-stored test password belongs on staging only.
- **Two traps promoted from prose into their own checkbox**, because both produce a *green* result
  while being broken:
  - **12.1.5** — a Docker build with the `NEXT_PUBLIC_*` build args omitted **exits 0** and ships a
    browser Supabase client wired to `undefined`. A successful build is explicitly *not* a pass;
    the subtask requires seeing the key inlined in the client chunks. 12.1.6 reproduces the failure
    once on purpose, so nobody later tries to repair it with runtime env.
  - **12.4.3** — a blocked `audit_log` write returns 0 rows and **no error**, so every attempt must
    be re-read (the 13.34 gotcha). "No error" is not a pass.
- **12.3.1 states the thing that was easy to miss:** `ci.yml` has **never executed** — it is absent
  from `origin/main`, there is no `staging` branch, and every push has been direct with no PR. So CI
  is unvalidated *in practice*, not merely unsecreted; secrets (12.3.3) are the second problem.
- **Two orphaned `[~]` items folded in** rather than left floating: **7.3** (search `<500ms` budget,
  never measured — 12.4.5, since staging is the first realistic dataset) and the **14.6 residual**
  (the flat-CRUD flow has never been clicked through in a browser — 12.4.6).
- **12.1.3 calls out BusyBox by name** — `addgroup/adduser --system --gid` are GNU-style flags on
  Alpine applets and the single likeliest line to fail; verified via `id`, not by the build passing.
- Build health unchanged (no code touched): last verified `tsc --noEmit` ✅ · `next lint` ✅ ·
  `npm run build` ✅ · tests **105/0** live, **75/30** without `TEST_*`.

---

## Earlier change (2026-07-28) — Audit log removed from the Administration module

The **Administration group is now Users only**. Deleted `app/(app)/audit/page.tsx` and
`audit/DiffCell.tsx`, the `/audit` sidebar item, and `AuditIcon` (zero callers left).

- ✅ **Nothing in the database changed.** `audit_log`, the `SECURITY DEFINER` trigger in
  `0003_audit.sql`, its select-only RLS policy and the explicit BUS-2 audit write in
  `POST /api/users` are all untouched. **The log still records every insert/update/delete and is
  still immutable** — only the in-app way to *read* it is gone. Anyone who needs it now goes to the
  Supabase dashboard or queries directly. Reinstating is two files, not a migration.
- **Dictionary trimmed in both locales, parity kept:** `nav.audit`, the whole `audit` namespace
  (21 keys incl. the `showFields`/`hideFields` functions) and `enums.auditAction` — all had the
  deleted page as their only caller. `tests/i18n.test.ts` still green, which is the check that a
  one-sided removal would have failed.
- ⚠️ **This removes the only visibility anyone had into who changed what.** With roles gone (Phase
  14) every user can already CRUD all four countries and mint accounts, so the audit view was the
  one thing that made those actions attributable in-app. The trail itself survives; noticing an
  unexpected change now takes a deliberate look at the DB, not a page visit. Say the word if it
  should come back as a read-only page.
- ℹ️ **12.4 unaffected** — the pen-test item "`audit_log` cannot be written or altered through
  PostgREST" tests the API/RLS boundary, not the page.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ (clean `.next`;
  **`/audit` gone from the route list**, shared chunk unchanged at 102 kB) · tests **75 passed /
  30 skipped** (unchanged — no test covered the page).

---

## ✅ `0006_drop_roles.sql` applied and verified live (2026-07-28)

`supabase db push` applied migration `0006` to the linked project, and the result was **verified
rather than assumed** — 22 schema/boundary assertions plus the full test suite at **105/105, 0
skipped** (the RLS suites had never run against this schema before).

**Verified after the push:**
- `profiles` is now `user_id, full_name, created_at, locale` — `role` and `country_code` gone, and
  the one existing row (Chris Goh) **survived** the column drop with its `locale` intact.
- `current_role_is_hq()` and `current_country()` no longer exist.
- **`sites.country_code` untouched** — all 5 sites keep their country (MY/TH/VN/ID).
- **`anon` reads 0 rows from all 12 tables**, cannot insert a site (`new row violates row-level
  security policy`), and gets nothing from `search_registry`. This is the only boundary RLS still
  enforces, so it was checked table by table.
- A throwaway user with **no role and no country** created a site in **all four countries**, read
  `audit_log`, and **could not alter it** — the update was a no-op and the row re-read unchanged.
- **The blocker is genuinely cleared:** a `profiles` insert carrying no `role` now succeeds. That is
  the exact write `POST /api/users` performs, and it would have failed against the old `not null` column.

**Teardown clean:** probe user deleted (0 orphan profiles), sites back to the original 5, **0**
`__RLS11_` / `__RLS_ACCESS_` / `__P14_` fixture rows left.

- ⚠️ **Residue: `audit_log` grew 64 → 99** (+35) from the probe's and the suites' inserts/deletes.
  Immutable by design (no delete policy), so those rows stay. Every future RLS run adds ~16 more.
- ✅ **CLOSED — the orphaned auth user was deleted (2026-07-28).** `tkgoh228@gmail.com`
  (`3797a32f…`) existed in `auth.users` with **no `profiles` row**, so it could authenticate but
  landed on `/no-access`. Pre-existing, not caused by this change. Deleted via the service role after
  confirming it held nothing: **0 profile rows, 0 inventory rows authored (`created_by`), 0
  `audit_log` rows as `actor`** — and no FK to cascade, since `created_by`/`actor` are plain `uuid`
  columns (only `profiles.user_id` references `auth.users`). Verified after: **1 auth user, 1 profile,
  matched**, and **0 orphans in *both* directions**. `sites` (5) and `audit_log` (99) unchanged.
  - ℹ️ **Why it was missed before:** the earlier "0 orphans" checks only looked for orphan *profiles*
    (a `profiles` row with no auth user). This was the opposite direction — an auth user with no
    profile — which nothing had ever checked. Worth checking both ways from now on.
  - ⚠️ **It was a real Gmail address**, created 03:28 and signed in once 23 seconds later — almost
    certainly a half-finished onboarding via the dashboard's "Add user" without the `profiles`
    insert. Deletion was confirmed as the intent over granting it a profile. If that person does need
    access, creating them is now a one-step job from the Users page.
- ⚠️ **Not yet driven in a browser.** The DB-level contract is proven; the in-app flow (a second user
  signing in, seeing all four countries, and creating a third from the Users page) has not been
  clicked through. That is all that is left of 14.6.

---

## Latest change (2026-07-28) — **Phase 14: the role system is gone**

Requested: remove "invite a user" from Users & roles, let an admin create a user directly with no
role/permission to assign, and let **all users CRUD**. Chosen shape: tear the roles out entirely
rather than mint everyone as `hq_admin`.

🔴 **Security consequence, stated plainly and accepted.** Cross-country isolation no longer exists.
Every authenticated user reads and writes all four countries, reads the audit log, and can create
further users. RLS is still enabled on all 12 tables but now only separates *signed in* from *anon* —
an **authentication** boundary, not an authorization one. This contradicts the PRD's country-scoping
story; it was requested, re-confirmed and built as asked.

- **`0006_drop_roles.sql`** — drops all 25 role policies, `current_role_is_hq()`, `current_country()`
  and `can_access_maintenance_target()`; recreates flat `auth.uid() is not null` policies on the 11
  mutable tables; then `drop column role, country_code` on `profiles` and `drop type user_role`.
  - ✅ **`audit_log` stays immutable** — select-only policy, still no insert/update/delete policy, so
    the log cannot be altered from the app. It is the one guarantee that survived intact.
  - ✅ **`sites.country_code` untouched.** That column is *data* (where a site is), not
    authorization. Only the **profile's** country — which existed solely to scope RLS — was dropped.
  - ⚠️ **`anon` denial is now the only thing RLS enforces**, and it rests entirely on
    `auth.uid() is not null` inside every policy. The anon key ships in the browser bundle, so a
    single mis-written policy would expose the whole registry publicly. Treat any future policy edit
    as security-critical; `tests/rls.test.ts` now sweeps all 12 tables as anon for exactly this reason.
- **Invite → direct create.** Deleted `app/api/invite/route.ts` and `users/InviteForm.tsx`. New
  `POST /api/users` calls `admin.auth.admin.createUser({ email_confirm: true })`, so the account is
  usable immediately and **no SMTP is needed** — which matters, since SMTP is still unconfigured
  (12.2). New `CreateUserForm` takes name / email / password only; no role or country picker.
  Carried over unchanged from 9.2/9.3: the service-role client, the auth-user rollback on a failed
  profile insert, and the BUS-2 explicit audit write (more important now that everyone can mint
  accounts, not less). `inviteLimiter` → `createUserLimiter` — same 10/min, different rationale:
  it used to bound email sending, now it bounds account creation by any user.
  - ⚠️ **Password capped at 72 characters on purpose** — bcrypt truncates past 72 bytes, so a longer
    value would have its tail silently ignored and the user could not reproduce it from what they typed.
- **UI de-roled.** Sidebar shows all four countries and the Administration group to everyone. The
  **Topbar lost its role pill entirely** (and its `user` prop with it) — it had nothing left to
  report; `UserMenu` shows the email where the role line was. Role branches removed from `dashboard`,
  `sites`, `renewals`, `audit` (redirect gate) and `countries/[code]` — that last one **reverses
  10.7's foreign-country `notFound()`**, which is now the intended behaviour rather than a leak.
- **Dictionary:** `nav.users` "Users & roles" → "Users"; the `users` namespace rebuilt around
  create-not-invite; **8 dead keys removed from both locales** (`topbar.hqAdmin`/`manager`/
  `allCountries`, `dashboard.subtitleCountry`, `validation.countryRequired`/`countryForbidden`,
  `errors.inviteFailed`) plus new `validation.passwordMin` / `errors.createUserFailed`. Key parity
  test still green.
- **Tests rewritten, not deleted** (30 RLS tests, was 20). `validation.test.ts` swaps the role/country
  coherence block for 6 `createUserSchema` tests — including one asserting Zod **strips** a
  `role`/`country_code` sent by a stale client. `rls.test.ts` now proves a signed-in user can create
  a site in **all four** countries, then sweeps **all 12 tables as anon**. `rls-integration.test.ts`
  keeps its VN fixture but asserts child-table **CRUD** through both parent paths, and retains the
  audit-immutability checks with their re-reads (a missing UPDATE/DELETE policy returns 0 rows and
  *no error* — the 13.34 gotcha).
- ⚠️ **Two earlier verifications are now void, not merely stale:**
  - **Phase 11's 89/89 live pass** exercised the cross-country isolation this removes. It is **not**
    evidence for the current suites — 11.1/11.2/11.3/11.5 need re-running (14.6).
  - **13.34 assertion 4** ("a direct `update profiles set locale` is a no-op, so `set_my_locale()` is
    the only write path") is reversed: `profiles` now has an authenticated write policy. The
    escalation that justified the RPC is also gone — there is no `role` column to escalate into. The
    RPC still works and is still what the app calls. `0005_locale.sql` is left unedited as an applied
    historical migration; `0006` records the reversal in a comment.
- **12.3 CI secrets: six → four.** `TEST_USER_EMAIL`/`_PASSWORD` replace the HQ/manager pair;
  `ci.yml` and `LIVE-ENV.md` updated. **12.4 rescoped** — cross-country probing is void; the
  pen-test is now about unauthenticated rejection, the `/api/users` throttle, audit immutability and
  the anon sweep (`LIVE-ENV.md` §12.4).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ (clean `.next`; shared
  chunk unchanged at 102 kB; `/api/invite` gone, `/api/users` present) · tests **75 passed / 30
  skipped** without env, and **105 passed / 0 skipped** against the migrated live project.
  Migration applied and verified the same day — see the section above.

---

## Phase 12 — deployment readiness: the only phase still open

Phase 12 is the **only phase with unstarted work**, and **all of it is infrastructure** — each item below is blocked on something only you can provision, not on code. `LIVE-ENV.md` holds the operational detail; this is the standing summary.

> Five `[~]` (scaffolded / partial) items survive outside Phase 12 and are **not** tracked here. Four are bookkeeping — **5.4** is descoped-with-strikethrough, and **7.1** / **10.1** / **10.4** were each superseded by later subtasks that finished the work (10.2, 10.5, 10.6). The one with real substance left is **7.3**: the search page works, but its **`<500ms` on a <10k-row dataset budget has never been measured**. Worth folding into 12.4, since that is the first time there will be a realistic dataset to measure against.

| # | Item | State | Blocked on |
|---|---|---|---|
| **12.1** | Docker image | 🚫 **never built** | A machine with Docker |
| **12.2** | Staging + prod Supabase | 🚫 not started | Two SEA-region projects |
| **12.3** | CI on PR | ⚠️ written, dormant | Six repo secrets |
| **12.4** | Pen-test | 🚫 not started | A live staging deploy |

**12.1 — the build has never run.** Docker is not installed in this environment. The Dockerfile was audited against a real local `npm run build` on 2026-07-28 and one blocker was fixed (`COPY … /app/public` against a `public/` that did not exist — now held open by `public/.gitkeep`). Confirmed present for the runner stage: `.next/standalone/server.js`, `.next/static`, `output: "standalone"`. ⚠️ **Still entirely unproven:** that the image builds end to end, that BusyBox accepts `addgroup/adduser --system --gid`, that the container boots on `PORT=3000`, and that it runs as non-root. Remember the build args — omitting `NEXT_PUBLIC_*` yields a *successful* build and a broken image.

**12.2 — nothing exists yet.** Two projects (SEA/Singapore), then per project: `supabase link` + `db push` (migrations `0001`–`0005`), `seed.sql` on **staging only**, signups disabled, SMTP + redirect URLs, and the first `hq_admin` invited via the service role. **Now also carries the `rls-test-*` users:** they were deleted from the linked dev project on 2026-07-28 and should be recreated **on staging**, which is where a test `hq_admin` with a file-stored password belongs.

**12.3 — still the cheapest thing left, but the credentials no longer exist.** `.github/workflows/ci.yml` is written and safe to run today: the `checks` job (typecheck → lint → build → tests) needs no secrets, and the RLS suite auto-skips without them. ⚠️ **The six `TEST_*` values are gone** — `.env.test` was deleted with the test users, so lighting up the 20 RLS tests on PRs now depends on 12.2 first (recreate the users on staging, then add the secrets). The `migrations` job additionally needs `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`, `SUPABASE_STAGING_DB_PASSWORD`; it is gated to the `staging` branch / manual dispatch and never runs on a PR.

> ⚠️ **CI cannot have run yet — the workflow does not exist on any branch that triggers it.** `ci.yml` fires on `pull_request` and on pushes to `main` / `staging`; but the file is **absent from `origin/main`**, there is **no `staging` branch**, and all work has been direct pushes to `cctv-camera-site-field` with no PR (branch is **15 commits ahead of main**). So the workflow is **unvalidated in practice**, not merely missing secrets — its first real execution will be whenever this branch reaches `main`. *(Checked structurally via git; `gh` is not installed here, so the run history itself was not queried.)*
>
> ℹ️ Note for 12.1: the CI `Build` step deliberately uses **dummy** `NEXT_PUBLIC_*` values. That proves the build compiles; it does **not** produce a deployable artifact, for exactly the inlining reason recorded in the Dockerfile.

**12.4 — pen-test**, once staging is up: both roles against every API route and `[id]` PATCH/DELETE, confirming a `country_manager` can neither read nor write another country's data. Largely a live re-run of the 13.34 checks extended to the mutation routes. The 2026-07-28 Phase 10 run already covers the *page* side of this (cross-country dashboard 404s, uuid guards, no `22P02` leakage).

---

## Latest change (2026-07-28) — Supabase env guard: a missing key now names itself

A browser-console `{"message":"No API key found in request"}` on the login page cost a debugging session. That message is what Supabase returns when a request arrives with **no `apikey` header at all** — and it names neither the app nor the variable. New **`lib/supabase/env.ts`** (`supabaseUrl()` / `supabaseAnonKey()`) throws `NEXT_PUBLIC_SUPABASE_ANON_KEY is not set …` instead.

- **The `!` was the bug.** All four factories read `process.env.NEXT_PUBLIC_SUPABASE_*!`. The non-null assertion is erased at compile time, so a missing value sailed through to `createBrowserClient(undefined, undefined)`, threw nothing, and surfaced only as Supabase's opaque reply. Now guarded in `client.ts`, `server.ts` and `middleware.ts`; `admin.ts` (which already guarded its service-role key — the pattern this follows) picked up the URL guard too.
- ⚠️ **The refactor's real risk was breaking the inlining, and it was checked, not assumed.** `NEXT_PUBLIC_*` are substituted **textually at build time**, so moving the reads behind a helper could have silently left them `undefined` in the browser. Verified both ways: the dev chunk still carries the key, and a clean `npm run build` inlines it into exactly the **3** client chunks whose pages use the browser client (`login`, `forgot-password`, `reset-password`). The helper's doc comment records why the reads must stay full literal `process.env.NEXT_PUBLIC_X` expressions.
- **Corollary worth keeping:** in the browser a throw here means the **build** had no value — setting the variable on the running server cannot repair it, only a rebuild can. Same failure mode the `Dockerfile` already documents for its build args.
- **`tests/supabase-env.test.ts`** (new, 3 tests) — value passes through; unset throws naming the variable; **empty string counts as unset**, since an empty var and a missing one both send no header.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ (clean `.next`, shared chunk unchanged at 102 kB) · tests **72 passed** (was 69), 20 RLS skipped.
- ℹ️ **Dev-environment trap re-confirmed twice today:** `next start` is unsupported under `output: "standalone"` and reads its manifests once at boot, so a rebuild under a running server leaves it serving chunk names that no longer exist (`ChunkLoadError`). Two servers against one `.next` do the same to each other. One server at a time; restart after any build.

## Earlier change (2026-07-28) — **RLS test users removed** from the linked project

Both accounts created for the Phase 11 run were deleted via the service role, closing the standing warning that a test `hq_admin` with a file-stored password was live on the real project.

- **Deleted:** `rls-test-hq@corp-management.test` (`hq_admin`) and `rls-test-my@corp-management.test` (`country_manager` / MY). Verified after: **1 auth user, 1 profile** (the real `chris.goh@` `hq_admin`), **0 orphan profiles** — the `profiles` FK cascade did its job, so no manual cleanup was needed.
- **`.env.test` deleted too.** It held nothing but the passwords for those two accounts. `.gitignore` keeps its entry, so recreating the file later is still safe.
- ⚠️ **The RLS suite auto-skips again — this is the intended trade, not a regression.** `npm test` is back to **69 passed / 20 skipped**. Phase 11 stays closed on the strength of the 2026-07-28 live run (audit-trail evidence below); re-running it means recreating both users first, per `LIVE-ENV.md` §11.
- ⚠️ **Knock-on for 12.3:** the six `TEST_*` secrets can no longer be copied out of a local file, so enabling the RLS job in CI is now downstream of 12.2 (recreate the users on **staging**). `LIVE-ENV.md` and `TASKS.md` 11.1 updated to match.
- ℹ️ **The audit rows from that run stay.** `audit_log` has no delete policy by design, so its ~16 rows keep actor ids pointing at now-deleted auth users. Harmless, but worth knowing before anyone reads the log and wonders who those users were.
- **No source changed** — docs only. Build health above verified: tests **69 passed, 20 skipped**.

## Earlier change (2026-07-28) — **Phase 11 is complete**: the RLS suite runs live, 89/89 passing

The 20 RLS tests written on 2026-07-24 had never been executed. They now run against the linked Supabase project and **all pass** — **11.1, 11.2, 11.3 and 11.5 are closed**, and with 11.4/11.6 already done, **Phase 11 is finished**.

- **Two persistent test users created** via the service role, as `LIVE-ENV.md` specifies: `rls-test-hq@corp-management.test` (`hq_admin`, no country) and `rls-test-my@corp-management.test` (`country_manager`, MY). Unlike the Phase 10 throwaways these are **meant to persist** — CI reuses the same credentials. The seeding script upserts the `profiles` row, so re-running repairs a drifted role/country rather than failing.
- **`.env.test` holds the six `TEST_*` values** — and 🐛 **`.gitignore` did not cover it.** `LIVE-ENV.md` calls the file "git-ignored", but the patterns were only `.env` and `.env*.local`, neither of which matches `.env.test`; the file holds two **real passwords for the real project**, so it was one `git add -A` from being committed. `.gitignore` now lists it explicitly, verified with `git check-ignore`.
- **The results are not vacuous** — worth stating, because a cross-country test against a project with no foreign rows passes trivially. The audit trail proves the suite did real work: **8 inserts at 02:34:38** (sites, circuits, devices, ip_schemes, vlans, vpn_links, recorders, cameras) and **8 cascade deletes at 02:34:39**, matching the `audit_log` delta of **47 → 63**. The suite's own design backs this up: every "manager sees none" assertion is paired with an HQ read of the same id.
- **Teardown verified clean**: 0 leftover `__RLS11_` fixtures, sites back to the original 5, all child-table counts back to baseline.
- ⚠️ **Residue, unavoidable:** +16 immutable `audit_log` rows per run (the audit log has no delete policy). Every future CI run adds another ~16. If that becomes noise, point `TEST_*` at a throwaway project — no code change, just different env values.
- ⚠️ **`rls-test-hq` is a real `hq_admin` on the real project**, with its password in a local file. Fine for the linked dev project; when 12.2 stands up production, that account should exist on **staging only**.
- Verified: tests **89 passed, 0 skipped** with the env; still **69 passed, 20 skipped** without it, so `.github/workflows/ci.yml` stays green before the secrets are added.

## Earlier change (2026-07-28) — 12.1: **`docker build` could not have succeeded**; blocker fixed, build still unrun

🚫 **Docker is not installed in this environment** (same as the 2026-07-23 note about `supabase db reset`), so `docker build` was **not run** and **12.1 stays open**. Instead every assumption the `Dockerfile` makes was verified against a real local `npm run build`, which turned up a blocking defect:

- 🐛 **`COPY --from=builder /app/public ./public` would have failed the build.** There is no `public/` directory — nothing tracked in git, nothing on disk — and Docker fails a `COPY` whose source does not exist. Next does not create it, so this was never going to work; the line is inherited from the standard Next.js template, which assumes `create-next-app`'s `public/`. Fixed by adding **`public/.gitkeep`** (with the reason in the file) rather than dropping the `COPY`, so real static assets can be added later without re-learning this.
- ⚠️ **A missing build arg produces a silently broken image, not a failed build.** Confirmed empirically: the Supabase URL from `.env.local` is **inlined into the client chunks** (found in 3 `page-*.js` files). Every route is dynamic (`ƒ`) and each read is a deferred `process.env.X!`, so a build with **no** `--build-arg` still *succeeds* — and ships a browser-side Supabase client wired to `undefined`. **Runtime env cannot repair it; it needs a rebuild.** The `Dockerfile` comment now says so explicitly, because "provide them in CI" understated the failure mode.
- ✅ **Everything else the runner stage copies is real**, checked against a clean `rm -rf .next && npm run build`: `.next/standalone/server.js` exists (so `CMD ["node","server.js"]` is right), `.next/static` exists, and `output: "standalone"` is correctly enabled in `next.config.ts` (gated off under `VERCEL`).
- ✅ `.dockerignore` already excludes `node_modules`, `.next` and `.env*.local` — so the stale-`.next` trap below cannot ride into an image.
- **Still unverified, and only Docker can settle it:** that the image actually builds end-to-end, that `addgroup/adduser --system --gid` behave on BusyBox, that the container boots on `PORT=3000`, and that it runs as non-root.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ (clean `.next`) · tests **69 passed**, 20 RLS skipped.

## Earlier change (2026-07-28) — **Phase 10 driven live: 3/3 checks passed**

The three checks Phase 10 left outstanding ("none of Phase 10 has been driven live") were run against the linked Supabase project in a real browser. **All three passed; no defect found in the Phase 10 work.** Run as a throwaway `country_manager` seeded via the service role, deleted afterwards.

- ✅ **10.7 cross-country dashboard** — `/countries/TH` as a **MY** manager returns **HTTP 404 + "Page not found"**, not the empty Thailand dashboard that used to read as "Thailand has no assets". Control passed too: `/countries/MY` renders the full dashboard for the same user, and the sidebar lists Malaysia only.
- ✅ **10.7 uuid guards** — a non-uuid path segment 404s on **all seven** dynamic edit routes, not just the two CCTV ones the task named: `cctv/recorders`, `cctv/cameras`, `network`, `sites`, `network/circuits`, tried with `not-a-uuid`, `123` and `%20`. A **well-formed but nonexistent** uuid returns the *same* 404, so the two cases stay indistinguishable to a prober. **No `22P02` / `invalid input syntax` / 500 reached the server log** — the guard really is running before the query.
- ✅ **10.5 money** — a VND site with circuits at `1200.50`, `1200` and `999999.99` renders **`₫1,200.50` · `₫1,200.00` · `₫999,999.99`** — exactly two decimals, no ragged column. The 10.5 fix is confirmed in the place it mattered: pre-fix, those first two rows rendered `₫1,200.5` and `₫1,200`. Swept the same rows through **IDR** (the other zero-fraction currency), **MYR**, **THB** and **USD** — all two decimals.
  - ℹ️ Cosmetic, **not** a Phase 10 defect: Intl under `en-US` gives VND and USD a symbol (`₫`, `$`) but renders MYR/THB/IDR as the ISO code (`MYR 1,200.50`). Consistent, just not the local symbol. Say the word if you want `currencyDisplay: "narrowSymbol"`.

🐛 **One real bug found — but in the dev environment, not the app.** The login page silently refused to hydrate: `_next/static/chunks/app/(auth)/layout.js` and `.../login/page.js` both **404'd**, so "Sign in" fell through to a native form GET (`/login?`) with **no console error at all**. Two things worth keeping:
  - The tell was **not** in the console — it was the network log plus the fact that no DOM node carried a `__reactFiber$` key. A filled controlled input *keeping* its value proves nothing when the page never hydrated.
  - Cause was a **stale `.next` cache**, the same failure mode recorded on 2026-07-23 (`PageNotFoundError: /search`) and after the `/api/verify` deletion. `rm -rf .next` fixed it. ⚠️ Note the trap: `.next` was deleted **while the old dev server was still running** — `TaskStop` killed the npm wrapper but not the `next dev` child, which kept port 3000 and then threw `ENOENT … app/(auth)/login/page.js` on every request while the new server quietly moved to **3002**. Kill the node process, not just the wrapper.

- ⚠️ **Residue: `audit_log` grew 35 → 47** (+12) from the fixture's inserts and deletes. Immutable by design, so those rows were left in place. Everything else cleaned up: fixture site + its 3 circuits deleted (FK cascade), throwaway user deleted (profile cascaded). Verified after teardown — 5 sites, 1 circuit, 1 profile, **0** `__P10` rows.
- **No source changed** — this run touched `STATUS.md` / `TASKS.md` only. Verification, not a code change, so the build-health line above still stands from 2026-07-24.

## Earlier change (2026-07-24) — Phase 11/12 test scaffolding written; live-env runbook

Wrote the code for everything in Phases 11 & 12 that *can* be written without a live database, and a runbook (`LIVE-ENV.md`) for the parts that can't. Decision on record: the RLS suite runs against the **existing linked project**, self-seeding a disposable fixture rather than needing a permanent cross-country seed.

- **`tests/rls-integration.test.ts`** (new) — 11.2 (child-table isolation), 11.3 (audit immutability), 11.5 (search scoping) in one file sharing a single VN fixture. `beforeAll` has HQ create a `__RLS11_…` VN site + one row in every child table; `afterAll` cascade-deletes it and sweeps orphans. **16 tests, auto-skip without the `TEST_*` env** (same contract as the existing `rls.test.ts`). Two design points worth keeping:
  - Every "manager sees none" assertion is **paired with an HQ read of the same id** — otherwise, against a project with no VN data, the test passes vacuously.
  - The immutability checks **re-read through HQ** after each blocked update/delete. A missing UPDATE/DELETE policy makes PostgREST return 0 rows and *no error* (the 13.34 gotcha), so "no error" proves nothing on its own.
  - ⚠️ Running it adds ~a dozen immutable `audit_log` rows to the linked project (fixture insert/delete). Unavoidable — the audit log has no delete policy. Point `TEST_*` at a throwaway project if that matters; no code change.
- **`.github/workflows/ci.yml`** (new, 12.3) — `checks` job (typecheck/lint/build/unit) on every PR, **no secrets required**; the RLS suite runs when the six `TEST_*` secrets are set. Migrations apply in a **separate job gated to `staging`/manual dispatch**, never on a PR — auto-pushing migrations to the shared project on every PR would be destructive.
- **`LIVE-ENV.md`** (new) — the checklist answering "what do Phases 11 & 12 need from a live env": the six `TEST_*` vars + two pre-created test users for Phase 11; two SEA-region Supabase projects + Auth/SMTP config + CI secrets for Phase 12; and the 12.4 pen-test scope.
- **Still genuinely blocked on infra** (nothing more to code): running the RLS suite, standing up staging/prod projects (12.2), adding CI secrets, the Docker image build (12.1), and the pen-test (12.4).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **69 passed, 20 skipped** (16 new + 4 existing RLS).

## Latest change (2026-07-24) — **Phase 10 is complete**: row caps, money, and access handling

Three items closed in one pass. Each one turned up a real defect underneath the task as written.

**10.6 — every table read is now bounded.** New `lib/constants/limits.ts`. ⚠️ **Deliberately not a blanket 50**, because the queries fail differently under truncation:
- `LIST_PAGE_SIZE` (50) — rendered lists. Truncation is visible to the reader.
- `AGGREGATE_CAP` (1000) — rows **counted or filtered**, not rendered (dashboard KPIs, renewals windows, sidebar counts). A 50-cap here would report "12 devices" when there are 400 — *silently wrong, worse than the unbounded fetch it replaces*. Dashboard and renewals `console.warn` via `isTruncated()` when a cap is genuinely hit.
- `OPTIONS_CAP` (500) — `<select>` option lists. A truncated site picker makes a site **unfileable**.
- Newly capped: dashboard ×5, renewals ×3, users, site-detail ×5 child panels, site-network ×2, app layout, and 11 option lists across 9 form pages. Three reads left uncapped **on purpose** and commented in place: `country_settings` ×2 (bounded by the 4-value country enum) and the audit actor lookup (`.in()` over one 50-row page). `search_registry` was already `limit 100` in SQL.

**10.5 — money.** The per-site part was already right: `formatMoney(c.monthly_cost, site.currency)` on the site-detail circuits table is the app's **only** money render. 🐛 The formatting was not — `maximumFractionDigits: 2` with no minimum let Intl's per-currency convention through, and **VND/IDR default to zero fraction digits**, so the column came out ragged: `₫1,200` on one row, `₫1,200.5` on the next (a one-decimal money value). Now pinned to **exactly two digits for every currency**, mirroring `numeric(12,2)`. ⚠️ This knowingly overrides currency convention for VND/IDR — the alternative rounds a stored `1200.50` to `₫1,201`, and a registry must not misreport a figure someone reconciles against a contract.

**10.7 — access handling.** Audited all 8 dynamic pages and all 13 API routes.
- 🐛 `cctv/recorders/[id]/edit` and `cctv/cameras/[id]/edit` had `notFound()` on a missing row but **no uuid guard before the query** — a non-uuid path segment reached Postgres and failed the uuid cast (`22P02`), a server error where a 404 was wanted. Exactly the defect fixed for the network device edit page on 2026-07-23; the `[id]` API routes already guarded correctly.
- 🐛 **`/countries/[code]` now scopes by role.** RLS already stopped the leak, but a country manager typing `/countries/TH` got a fully-drawn **empty** Thailand dashboard — which reads as "Thailand has no assets", not "not your country". Now `hq_admin` → any country, anyone else → their own or `notFound()`, mirroring the Sidebar and `/sites`.
- Cross-country **record** access was already correct everywhere: RLS returns 0 rows → `notFound()`, indistinguishable from a missing id, so a probe cannot confirm a record exists.

- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ (clean `.next`) · tests **69 passed** (was 61 at the start of the day), 4 RLS skipped.
- ~~⚠️ **None of Phase 10 has been driven live.** Worth a real check: `/countries/TH` as a MY manager (should 404), a bad uuid on a CCTV edit URL (should 404), and the money column on a VND site.~~ **All three run 2026-07-28 — 3/3 passed, see the top entry.**
- **Next up:** Phase 11 (11.2 RLS tests on child tables, 11.3 audit immutability, 11.5 search RLS) and Phase 12 (deployment). Both need a live Supabase env.

## Latest change (2026-07-24) — 10.2 secrets guard, and the empty-string bug's root cause

- **10.2 closed.** The guard already ran on every `notes`, plus `address`/`contact_name`/`location_desc`/`credential_ref`. The two genuinely uncovered **prose** fields now run it too: **`cctv_recorders.location`** (160) and **`vlans.purpose`** (200).
- ⚠️ **Not a blanket application, on purpose.** `serial`, `hostname`, `brand`, `model`, `firmware`, `circuit_id`, `bandwidth`, `resolution` and the phone fields are **identifiers, not prose**, and `looksLikeHighEntropyToken()` fires on any 20+ character run mixing lower/upper/digit — which is precisely the shape of a device serial (`FGT60FTK20001234…`). Guarding them would reject legitimate hardware data. The rule the code now follows: **guard prose, not identifiers.**
- 🐛 **Found the root cause of the empty-string display bug** that needed `orDash()` on 2026-07-23. Five fields in `lib/validation/cctv.ts` — recorder `brand`/`model`/`firmware`/`location` and camera `resolution` — used `.optional().or(z.literal("").transform())` on an **unconstrained** `z.string()`. `common.ts` documents exactly why that fails: an unconstrained string *accepts* `""`, so the first branch of the union wins and the empty value is written as `""` instead of NULL. Switched to `optionalString`/`optionalSafeText`, whose trailing `.transform` runs unconditionally. `mgmt_ip` keeps the idiom correctly — `ipString` has a regex, so `""` is rejected by the first branch and falls through as intended.
  - ⚠️ **This fixes new writes only.** Rows already holding `""` are untouched; `orDash()` still carries the display side. A backfill (`update … set brand = null where brand = ''`) would clean them up but has not been run.
- 🐛 **`sites.timezone` was the only unbounded string in any schema** — `z.string().min(1)` with no `.max()`. Now capped at 64.
- 5 new tests (all blank recorder strings → `undefined`, blank camera resolution, the guard on recorder location, and the vlan-purpose guard accept/reject pair). Suite **66 passed** (was 61), 4 RLS skipped.
- Also removed a **duplicate `13.35` checkbox** in `TASKS.md` (it was listed twice, once ticked and once not).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **66 passed**. ⚠️ **Not driven live** — no recorder or VLAN has been saved through the changed schemas against the database.

## Latest change (2026-07-23) — ISP circuits get an edit form (and a row action)

- **Circuits were create-only**: `CircuitForm` had no edit mode, there was no `/api/circuits/[id]` route, and the circuits table was the one list in the app with no actions column. All four gaps closed, following the same pattern as sites/devices.
- **`app/api/circuits/[id]/route.ts`** (new) — `PATCH` + `DELETE`, a line-for-line mirror of `/api/devices/[id]`: uuid check → `auth.getUser()` → `writeLimiter.check("edit|delete:isp_circuits:<uid>")` → `ispCircuitSchema.partial()` parse → BUS-6 guarded update (`expected_updated_at` → `409`, re-read visibility to separate conflict from not-found) → `dbErrorResponse`. **No migration**: `0002_rls.sql` policies are `for all`, `0003_audit.sql` already logs the table, and the `set_updated_at` trigger loop at `0001_init.sql:240` already covers `isp_circuits`. Unlike a site or recorder, **nothing FK-references a circuit, so delete does not cascade.**
- **`app/(app)/network/circuits/[id]/edit/page.tsx`** (new) — uuid guard → `notFound()`, RLS-scoped row + site list in one `Promise.all`, explicit null→`undefined` mapping into a typed `IspCircuitInput & { id, updated_at }`, heading `Edit · <provider · circuit id>` (falls back to provider alone, since `circuit_id` is nullable).
- **`CircuitForm` now does create *and* edit** — new `circuit?` prop, `isEdit` switches endpoint/method and appends `expected_updated_at`, submit label becomes "Save changes". `static_ips` (a `text[]`) still lives outside RHF as a textarea: it is **seeded from the row** and, on edit, **always sent — empty array included**, because the PATCH is partial and an omitted key would leave a cleared box's old IPs in the row.
- **`network/page.tsx`** — circuits table gains the same trailing actions cell the devices table has (Edit link + `DeleteButton`), plus an empty 6th header. New key in both locales: `network.deleteCircuitConfirm`; also `forms.pages.editCircuitTitle`/`editCircuitSubtitle` and `errors.invalidCircuitId`/`circuitNotFound`.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ · tests **61 passed**, 4 RLS skipped (the i18n parity test covers the new keys). ⚠️ **Not driven live** — no circuit has been edited or deleted against the database; the 409 conflict path and the `static_ips` clear-to-empty behaviour are worth a live check.
- ℹ️ The first `npm run build` failed with `PageNotFoundError: /search` from a **stale `.next` cache**, not from these changes — it passes after `rm -rf .next`.

## Earlier change (2026-07-23) — Network device edit page follows the Sites edit pattern

- `app/(app)/network/[id]/edit/page.tsx` was the odd one out. The two forms themselves were already twins (`PageHead` inside `<form>`, Cancel/Save in the actions row, `Panel` + 3-col grid, local `Field`); the divergence was entirely in the server component. Now aligned to `sites/[id]/edit/page.tsx`:
  - **UUID guard before the query** — `z.string().uuid()` → `notFound()`. Previously a non-uuid path segment reached Postgres and failed the `uuid` cast (`22P02`) instead of rendering a 404. `PATCH`/`DELETE /api/devices/[id]` already did this check; the page now matches.
  - **Null-mapping moved out of the form and into the page** — the page builds a typed `initial: NetworkDeviceInput & { id, updated_at }` mapping DB nulls to `undefined`, exactly like `SiteForm`'s caller. `DeviceForm`'s `device` prop takes that shape, its `DeviceEditValues` interface (14 nullable fields) is deleted, and `defaultValues` collapses to `{ ...device, device_type: fixedType ?? device.device_type }`. BUS-6 unchanged — `updated_at` still rides along and is echoed back as `expected_updated_at`.
  - **Heading matches** — title is now `Edit · <device>` (`editDeviceTitle` became a `(name) => …` function in both locales, mirroring `editSiteTitle`) with `editDeviceSubtitle` back in the subtitle slot. The device label falls back `hostname → "brand model" → device type`, since unlike a site a device has no required name.
  - **Dropped `panelClassName="max-w-3xl"`** so edit fills the section width like the sites edit page and `network/new`.
- No API, schema or RLS change. `create` and the Firewall entry point (`fixedType`) are untouched — `fixedType` still wins over the row's type.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings). ⚠️ Not driven live — the edit page has not been opened against the database.

## Earlier change (2026-07-23) — Delete action beside Edit on Sites, Network and CCTV

- **There was no delete path in the app at all** — only `PATCH` handlers existed. Added `DELETE` to the four `[id]` routes: `/api/sites/[id]`, `/api/devices/[id]`, `/api/recorders/[id]`, `/api/cameras/[id]`. Each mirrors its PATCH sibling: uuid check → `auth.getUser()` → `writeLimiter.check("delete:<table>:<uid>")` → delete filtered **by id alone** → `dbErrorResponse` on failure, **404 when 0 rows**. Filtering by id only is deliberate: a row outside the caller's country matches nothing under RLS, so a cross-country probe is indistinguishable from a missing row.
- **No migration needed.** The `0002_rls.sql` policies are `for all`, so DELETE is already scoped to `current_role_is_hq() or country_code = current_country()`; `0003_audit.sql` already logs `tg_op = 'DELETE'` with the old row's values, including cascaded children.
- **`components/ui/DeleteButton.tsx`** (client) — `window.confirm` → `fetch(endpoint, { method: "DELETE" })` → `router.refresh()`. The confirm sentence is a **prop**, built server-side from the dictionary, so each table names its own record and cascade. Unlike `ArchiveButton`, a failure is not swallowed: the server's (already safe) message renders in a truncated `role="alert"` span beside the button.
- ⚠️ **Site delete is a hard delete and cascades.** Every child FK in `0001_init.sql` is `on delete cascade`, so removing a site also removes its circuits, devices, IP schemes, VLANs, VPN links, recorders and cameras. This runs against the PRD's "no hard deletes of referenced records" line, where **Archive** (`archived_at`, on the site detail page) is the reversible option. Kept as asked; the confirm text spells out the cascade and points at Archive. Same story for a recorder → its cameras. Say the word if Sites should archive rather than delete.
- **ISP circuits were left alone** — that table has no Edit action and no `/api/circuits/[id]` route, so there was no "beside Edit" to add to.
- `sites` column widths rebalanced `34/22/16/16/12` → `30/20/15/15/20`; the 12% actions cell could not hold two buttons.
- New keys in **both** locales: `common.delete` / `common.deleting`, `errors.deleteFailed`, and four confirm functions (`sites.deleteConfirm`, `network.deleteConfirm`, `cctv.deleteRecorderConfirm`, `cctv.deleteCameraConfirm`).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ · tests **61 passed**, 4 RLS skipped. ⚠️ **Not driven live** — no delete has actually been issued against the database, and the RLS-scoped 404 path in particular is worth a check as a country manager.

## Earlier change (2026-07-23) — CCTV module drops its 4 KPI cards

- `app/(app)/cctv/page.tsx`: removed the `grid-cols-2 md:grid-cols-4` KPI row — **Recorders · Cameras active · Faulty / offline · Below retention**. The page now goes straight from `PageHead` to the Recorders/Cameras panels. `Kpi` import dropped.
- Dead derivations removed with them: `active`, `faulty`, `belowRetention`. **`retentionMin()`, the `country_settings` query and `isBelowRetention` all stay** — the per-row Retention cell still renders a `danger` chip when a recorder is under its country's minimum, so the below-retention signal is not lost, only the roll-up count.
- The four `cctv.kpi*` keys had no other caller and were **removed from both locales** (`en.ts`, `zh-TW.ts`), keeping key parity — same treatment as `sites.view`.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **61 passed**, 4 RLS skipped. Not driven live in-app.

## Earlier change (2026-07-23) — Sites list row action is now **Edit**, matching Network

- `app/(app)/sites/page.tsx`: the last column's `View →` accent link is replaced by the network module's row action — `<Link href={`/sites/${id}/edit`}><Button sm variant="ghost">Edit</Button></Link>` inside a `flex items-center justify-end` cell, identical to `network/page.tsx:90`. Uses the existing `common.edit` key, so no dictionary parity change.
- **The detail page is still reachable** — the site **name** in the first column has always linked to `/sites/{id}`; only the trailing column changed target (detail → edit). `/sites/[id]/edit` already exists.
- `sites.view` had exactly one caller, so the key was **removed from both locales** (`en.ts`, `zh-TW.ts`) to keep key parity and avoid dead entries.
- Column widths unchanged (`34/22/16/16/12%`); the button is right-aligned in the 12% cell.
- Verified: `tsc --noEmit` ✅. Not driven live in-app.

## Earlier change (2026-07-23) — `/sites` shows all four country panels

- **Vietnam and Indonesia now render too.** They were never missing by design — `app/(app)/sites/page.tsx` ended its grouping with `.filter((g) => g.sites.length > 0)`, and both countries have **0 rows**, so their panels were dropped. Filter removed: every visible country gets the same panel, same title format (`Vietnam · 0 sites`), same fixed column widths.
- **Empty country → `PanelEmpty` inside its own panel**, reusing `t.country.noSites(country)` ("No sites registered yet for Vietnam.") + the existing `sites.addFirst` link. No new dictionary keys, so key parity is untouched. The column headers are **not** drawn for an empty country — a header row over nothing reads as a failed load; this matches the country dashboard's convention.
- ⚠️ **Role scoping was required, not optional.** Rendering `COUNTRY_LIST` unconditionally would have shown a `country_manager` four panels including three countries they have no business seeing. The page now calls `getCurrentUser()` and mirrors the **Sidebar** rule: `hq_admin` → all four, anyone else → their own `countryCode` only. RLS is still the boundary — a country that slipped through would render an *empty* panel, never another country's rows.
- The page-level "no sites at all" empty state is kept as the fallback for a user with **no visible country** (no role match / null `countryCode`); it is otherwise unreachable now.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **61 passed**, 4 RLS skipped. ⚠️ **Not driven live** — the role-scoping branch in particular is worth a smoke test as HQ *and* as a country manager.

## Earlier change (2026-07-23) — Thailand's sites table now matches Malaysia's

Screenshot showed the two country panels on `/sites` drawing different layouts. **Two independent causes, both fixed:**

- 🐛 **Blank cells, not missing data.** Chonburi (TH) stores `""` for `address` / `contact_name` / `contact_phone`; Johor Bharu (MY) stores `null`. Both tables rendered `?? "—"`, which **only catches `null`** — so the MY row showed a dash and the TH row showed nothing, and the TH row drew shorter. New **`orDash()`** in `lib/utils/format.ts` treats empty and whitespace-only strings as absent; applied to the sites table on `/sites` **and** on the country dashboard (same data, same bug). Covered by 3 new tests (**61 passed**, was 58).
- 🐛 **Column widths didn't line up between panels.** Each country group renders **its own `<table>`**, and the default auto layout sizes columns to that table's own rows — Thailand's one short site produced narrower SITE/CONTACT columns than Malaysia's long KL address. `components/ui/Table.tsx` gained an opt-in **`Table fixed`** (`table-fixed`) + **`Thead widths`**; `/sites` passes `SITE_COL_WIDTHS = 34/22/16/16/12%`. **Opt-in on purpose** — `Table` is shared by network, CCTV, audit, renewals and search, and forcing fixed layout on all of them was not asked for and would reflow every module.
- ⚠️ The empty-string data itself is untouched — the forms still submit `""` for a blank optional input. `orDash` fixes the *display* everywhere it is used; other modules' tables still use `?? "—"` and would show the same blank cell for an empty-string value. Worth a sweep if it shows up again.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **61 passed**, 4 RLS skipped. Layout not re-driven live — worth a refresh of `/sites` to confirm.

## Earlier change (2026-07-23) — Sites panel titles normalised

- **`/sites` renders one title template for every country** — `${country} · ${siteCount(n)}` (`app/(app)/sites/page.tsx:63`), and always has. Checked against live data: only **TH (1 site)** and **MY (3 sites)** have rows, so those are the only two panels that render — the other two countries are absent because they are empty, not because of a title bug. Column headers come from a single `Thead` call, identical for all countries.
- **Fixed the one real defect in that title:** `country.siteCount` emitted `"1 site(s)"`. EN is now plural-aware — **"Thailand · 1 site" / "Malaysia · 3 sites"**. zh-TW (`${n} 個據點`) is unchanged; Chinese has no plural form.
- **Aligned the odd panel header out:** the country dashboard's Sites panel (`countries/[code]/page.tsx:476`) read just `"3 site(s)"` while its four siblings on the same page read `Devices · 6`, `ISP circuits · 2`, … It is now **`Sites · 3`**, same `label · count` shape, and the failed-query case degrades to `Sites · —` instead of a bare `—`.
- ⚠️ **Panel order on `/sites` is `COUNTRY_LIST` order (VN, TH, ID, MY), not alphabetical** — so Thailand sorts above Malaysia. Left as-is: it mirrors the `country_code` enum and the sidebar. Say the word if you want the list alphabetised by localised name instead.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `tests/i18n.test.ts` **9 passed** (the function-leaf rule still holds — `siteCount` uses `n` in both branches). Not driven live in-app.

## Earlier change (2026-07-23) — Verify feature deleted (component + API route)

- **Deleted `components/ui/VerifyButton.tsx` and `app/api/verify/` (`route.ts`).** Both had zero callers after the three button removals below. `/api/verify` no longer exists as a route, and with it the 8-table `VERIFIABLE` allow-list.
- ⚠️ **`last_verified_at` is now permanently read-only from the app** on all 8 tables (`sites`, `isp_circuits`, `network_devices`, `ip_schemes`, `vlans`, `vpn_links`, `cctv_recorders`, `cctv_cameras`). Nothing writes it. The column, its RLS/audit policies and the `database.ts` types are untouched, so values persist and keep ageing — every row will eventually read **Stale** with no in-app way to refresh it. Reinstating means restoring the route, not a migration.
- **Deliberately left in place:** the `common.verify` / `common.verifying` dictionary entries in **both** locales (unused now, but key parity is what `tests/i18n.test.ts` enforces — dropping them from one side only would fail) and the Fresh/Stale chips + the dashboard "stale records" KPI, which are reads.
- ⚠️ **`tsc` failed once on a stale artifact, not on the source:** Next's generated `.next/types/app/api/verify/route.ts` still referenced the deleted handler (`TS2307`). Removing that directory cleared it — worth knowing after any route deletion in this repo.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **58 passed**, 4 RLS skipped.

## Earlier change (2026-07-23) — Site detail drops the Verify button: **no Verify action left in the app**

- `app/(app)/sites/[id]/page.tsx`: removed `<VerifyButton table="sites" …/>` from the `PageHead` actions; the row is now **Archive/Restore + Edit**. Import dropped.
- ⚠️ **`components/ui/VerifyButton.tsx` now has zero callers** — with the network and CCTV trims below, nothing in the UI can stamp `last_verified_at` on any table any more. The component, `POST /api/verify` and its 6-table allow-list were **left in place** (deleting them wasn't asked for) — they are dead code pending a decision, alongside `vpnLinkSchema`.
- **Reads are unaffected**: every Fresh/Stale chip, the dashboard "stale records" KPI and `reviewMonthsFor()` still read `last_verified_at`, so existing values keep ageing and rows will drift to **Stale** with no way to clear them.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings). Not driven live in-app.

## Earlier change (2026-07-23) — CCTV module drops the Verify button

- `app/(app)/cctv/page.tsx`: removed **both** per-row `VerifyButton`s — recorders (`cctv_recorders`) and cameras (`cctv_cameras`). Both action cells are now **Edit** only; import dropped.
- Follows the same trim on the network module (below). `VerifyButton` now has **one remaining caller**: the site detail page (`app/(app)/sites/[id]/page.tsx`). The component, `POST /api/verify` and its allow-list are still untouched.
- The recorder Fresh/Stale chip still reads `last_verified_at`; it can no longer be stamped from this page.
- Verified: `tsc --noEmit` ✅. Not driven live in-app.

## Earlier change (2026-07-23) — Network module drops the Verify button

- `app/(app)/network/page.tsx`: removed the per-row **`VerifyButton`** ("Verify — still accurate") from the devices table; the row actions cell is now **Edit** only. Import dropped.
- Scope is the network module only — `VerifyButton` still ships on the **CCTV** module and the **site detail** page, so the component, `POST /api/verify` and its server-side table allow-list are all untouched. `network_devices.last_verified_at` still drives the Fresh/Stale chip on this page; it just can't be stamped from here anymore.
- Verified: `tsc --noEmit` ✅. Not driven live in-app.

## Earlier change (2026-07-23) — Dashboard back in the sidebar (top item)

- `components/layout/Sidebar.tsx`: added a **Dashboard** `NavItem` (`/dashboard`, `DashboardIcon`, active on `pathname.startsWith("/dashboard")`) as the **first item in the rail**, directly under the logo and above the Countries group — outside any group heading, since it isn't a country or a module. No count badge.
- Nothing else was needed: `DashboardIcon` was already exported from `icons.tsx` and `t.nav.dashboard` already existed in **both** dictionaries (EN "Dashboard" / 繁中 "儀表板") — both were left in place when the entry was trimmed on 2026-07-22. No dictionary or i18n change, so the key-parity test is unaffected.
- Reverses the "Dashboard stays out of the rail" decision from the 2026-07-22 nav trim; `/dashboard` was reachable only via post-login redirect until now.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings). Not driven live in-app.

## Earlier change (2026-07-23) — 13.33 live smoke passed: **Phase 13 is complete**

- ✅ **The EN / 繁體中文 switch works end to end in a real browser.** Driven as a throwaway `hq_admin` (created + deleted via the service role) so the smoke test never touched the real account's preference.
- **Every module page flips and URLs never change** — `/dashboard`, `/sites`, `/network`, `/cctv`, `/renewals`, `/users`, `/audit`, `/countries/MY`, `/search`, site detail. Chrome, page heads, table headers, empty states, KPI labels and enum values all render Chinese; `<html lang>` = `zh-Hant-TW` and `generateMetadata()` gives the tab `Corp Management — 東南亞 IT 資產登錄`. The only English left is **data** (site names, hostnames, `Fortinet`) and the audit log's DB identifiers — both correct.
- ⚠️ **CJK glyphs: `document.fonts.check()` is not a valid tofu test.** It returns `true` for *any* family name, because the browser answers about the font it would fall back to — it reported all four CJK families "installed" and would have passed on a broken stack. Proved instead by **advance width**: `據` measures 32px (a full em) against 22.5px for a guaranteed-missing codepoint, so the glyph is not `.notdef`. The 13.16 `--font-cjk` composite is present in the computed stack and a screenshot confirms it visually.
- **Chinese validation message** (blank required field → 請填寫據點名稱, no leaked `v.*` token) · **save → redirect** works · **log out → login page stays Chinese** and its switch works signed-out.
- **The no-cookie case is the one that proves the precedence chain:** a fresh browser started with 0 locale cookies and an English login page; after sign-in the 13.11 middleware seeded `locale=zh-TW` from `profiles.locale` and the dashboard came up Chinese. Round trip back to EN clean.
- **Bonus confirmation of the 13.10 design:** switching while *signed out* set only the cookie — `profiles.locale` stayed `zh-TW` while the UI went EN, exactly as intended (the RPC is skipped with no session).
- ⚠️ **`audit_log` grew 22 → 24** — the insert and delete of one test site. Immutable by design, so those rows were **left in place** rather than tampered with. No other residue: temp user deleted (profile cascaded), sites back to 4.
- **Tooling note:** the `agent-browser` CLI was not installed; it was run via `npx -y agent-browser@0.32.4`, which pulled a Chromium build into the Playwright cache. Nothing was added to the repo or to `package.json`.

## Earlier change (2026-07-23) — 13.34 security checks run live: 9/9 passed

- ✅ **The locale write path holds under a real `country_manager` session.** A throwaway MY manager was created via the service role, driven through the anon key, and deleted afterwards; the profile row cascaded and `audit_log` was identical before and after (22 → 22).
- **What the run proves:** `set_my_locale('en')` succeeds and persists · `set_my_locale('xx')` and `(null)` raise `22023` and write nothing · `update profiles set role='hq_admin' where user_id = auth.uid()` leaves `role` untouched · a direct `update … set locale` is equally a no-op, so the RPC really is the only write path · the manager reads 0 other profiles and 0 `audit_log` rows · **anon** gets `42501 permission denied for function set_my_locale`.
- ⚠️ **Method note worth keeping:** PostgREST reports a missing UPDATE policy as **0 rows with no error**, not a `42501`. A test that only asserts `error !== null` would have *failed* here while the system was secure — and one that asserts "no error" would have *passed* on a real escalation. Every assertion re-reads the row through the service role instead.
- The 13B design decision is now empirically confirmed: **no self-update policy on `profiles`** + a column-scoped `security definer` RPC closes the column-level escalation that RLS cannot express.
- ~~**Still open in Phase 13:** 13.33 and 13.35.~~ **Both closed** — see the entry above.

## Earlier change (2026-07-23) — first live run: RSC boundary fix + VPN orphan deleted

- 🟢 **The app boots and is reachable again** — confirmed in-browser. This was the first time Phase 13 had been driven live at all; every entry below said "not yet driven live", and the run surfaced a real defect immediately.
- 🚫→✅ **"Functions cannot be passed directly to Client Components."** `app/layout.tsx` passed the *resolved dictionary* into the client `I18nProvider`, but interpolating entries are **functions** (`country.title(name)`, `audit.showFields(n)`, `forms.pages.editSiteTitle(name)`) and a function cannot be serialized across the RSC boundary. `I18nProvider` now takes the **locale string** and resolves the dictionary client-side, so only a string is in the payload.
  - **Not a 13F regression** — the provider has been passing functions since 13.15/13.22, when 13E gave the `dashboard`/`country` namespaces their first function entries. 13F merely added the `forms.pages` object that React named in the error.
  - **Second instance, same cause:** `audit/page.tsx` passed `showLabel`/`hideLabel` functions to the client `DiffCell`. `DiffCell` now calls `useT()` itself — cleaner regardless, since the field count is only known inside it.
  - **Tradeoff, measured not assumed:** both dictionaries now ship client-side. Routes with client components went ~130kB → ~140kB First Load JS; the shared chunk is unchanged at 102kB and server-only pages (`/renewals`, `/search`, `/sites`) are untouched at ~103–106kB. This reverses the 13.5 note about keeping `en` out of client bundles; the reasoning is recorded in the provider's doc comment. Shipping only the active locale would need a per-locale dynamic import + Suspense.
  - ⚠️ **The local helpers that take strings as props** (`ModuleHead`, `MoreRows`, `ChildPanel`) are plain functions in server files, not client components — passing `t.country.showing` to them crosses no boundary and is fine. The rule to remember: **only `"use client"` components constrain what a dictionary entry may be.**
- **`InviteForm` rendered raw `v.*` keys** — a genuine 13.29 defect: it showed `errors.*.message` without `validationMessage()`, so its four validation messages would have read `v.fullName` / `v.email`. Fixed; a sweep confirmed no other form was missing the call.
- **The orphaned VPN form is gone** — `app/(app)/network/vpn/` (page + `VpnForm`) and the empty `app/api/vpn-links/` directory deleted; `/network/vpn/new` no longer exists in the route types. VPN link **reads** are untouched as designed (table, RLS/audit policies, site-detail panel, country stat, verify allowlist). `vpnLinkSchema` now has no caller — harmless, but a candidate for the next dead-code sweep. There is now **no English UI left in the app**.
- Verified: `npm run build` ✅ · `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **58 passed**, 4 RLS skipped.
- **Still open in Phase 13:** 13.33 (the rest of the smoke test — actually switching to 繁中, CJK glyph check, a validation message in Chinese, the no-cookie second-browser case). *(13.34 has since been run — see the entry above.)*

## Earlier change (2026-07-23) — Phase 13: 13F forms, validation & API complete (13.28–13.31)

- **String extraction is done.** Every form field, Zod message and API error now comes from the dictionary; the only English left in the app is the orphaned `network/vpn/new/VpnForm.tsx` (see the 13C entry — untracked, its POST target no longer exists, deletion is still your call).
- **Zod messages became keys, not text** (13.29). A schema is built at module scope where there is no request and therefore no locale, so `lib/validation/*` now emits `v.*` tokens (`lib/i18n/validation.ts`) that `validationMessage(t, msg)` resolves at render time — in the form's `Field`, and in the route handler before it responds. Built-in Zod messages carry no `v.` prefix and **pass through untouched**; translating Zod's own catalogue is out of scope, and collapsing them to one generic string would lose detail the English UI has today. `SECRET_GUARD_MESSAGE` was deleted from `lib/utils/secrets.ts` — its text is now `validation.secret`.
- **API errors localise in place** (13.30). All 13 route handlers call `getDictionary()`. The three shared helpers stayed **pure** and take the dictionary as an argument (`dbErrorResponse(error, context, t)`, `rateLimitResponse(rl, t)`) instead of importing `next/headers` themselves — that would have made `lib/api/rate-limit.ts` unusable from its unit test. `CONFLICT_MESSAGE` moved to `errors.conflict`; the 5 SQLSTATE messages in `db-error.ts` became keys into `errors.db`, so the ROB-3 "never leak Postgres internals" guarantee is unchanged — only the lookup target moved.
- **The 10 create/edit page wrappers had to come too** (not in the plan's 13.28 list): they own the `title`/`subtitle`/`eyebrow` props, so leaving them would have left every form heading English. `sites/new/page.tsx` became `async`; the three eyebrows now reuse `nav.sites`/`nav.network`/`nav.cctv`.
- **`forms` grew 6 sub-namespaces** — `labels` (47), `ph` (39), `help`, `select`, `actions`, `saveFailed`, `pages`. **All placeholders went into the dictionary**, including technical examples (`Fortinet`, `10.10.0.1`, `FG60F-…`) whose zh values are identical — a half-in/half-out split would have been arbitrary and re-litigated. The camera page's no-recorder empty state was split into a sentence + a link label; "No recorders yet — {link} first." does not survive translation.
- **Two new tests beyond the plan:** every `V.*` key must resolve to real text in both locales — an unresolved key would silently render the `v.foo` token, which neither `tsc` nor the key-parity test can see — and built-in Zod messages must pass through unchanged.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ · tests **58 passed**, 4 RLS skipped. **Not yet driven live** — 13.33 (smoke) and 13.34 (security checks) are all that remain in Phase 13.

## Earlier change (2026-07-23) — Phase 13: 13E page strings complete (13.22–13.27)

- **Every list, detail, dashboard and auth page now renders from the dictionary.** What is still English: the 6 create/edit **forms** and their page wrappers (13.28), Zod messages (13.29) and API route errors (13.30) — i.e. all of 13F.
- Pages done: dashboard + country dashboard (13.22) · sites list / site detail / site network (13.23) · network + CCTV modules (13.24) · renewals + search (13.25) · audit + `DiffCell` + users + `InviteForm` (13.26) · login / forgot-password / reset-password + their 3 forms, `no-access`, `not-found` (13.27).
- **Dictionary grew to ~260 keys** across 18 namespaces; two new shared ones: **`columns`** (21 table headers reused across modules) and **`countries`** (display names, so `COUNTRIES[code].name` is no longer rendered anywhere).
- **Interpolating entries are functions**, e.g. `country.title(name)`, `audit.pageOf(page, total)`, `renewals.resultCount(n, days)`. Composing them from JSX fragments does not survive translation — Chinese puts the count and the noun in a different order. `tests/i18n.test.ts` was extended to match: a function leaf must take at least one argument and **must include every argument in its output**, so a translation that silently drops an interpolated value fails the suite.
- **Four structural changes the string swap forced**, each a latent bug if left alone:
  - `renewals`: `Renewal.kind` was the union `"ISP contract" | "Device warranty"` and was compared by value to pick the chip tone. Now `"contract" | "warranty"` — a translated label cannot double as a comparison key.
  - `DiffCell`: assembled "Show N field(s)" from `{open ? "Hide" : "Show"}` + a pluralising ternary. Now takes `showLabel`/`hideLabel` functions.
  - `search`: `typeLabel` was a module-level `Record`; now a `(t) => Record<…>` factory, since module scope has no dictionary.
  - Local helpers (`ModuleHead`, `MoreRows`, `ChildPanel`, `PageLink`) take their strings as props — they are declared outside the component that holds `t`.
- **`app/layout.tsx`: static `metadata` → `generateMetadata()`** — a static export cannot read the locale cookie, so the browser-tab title would have been stuck in English.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ · tests **56 passed**, 4 RLS skipped. **Not yet driven live.**

## Earlier change (2026-07-23) — Phase 13: 13D chrome & shared strings complete (13.18–13.21)

- **`0005_locale.sql` has been applied** to the linked Supabase project (`supabase db push`, 2026-07-23) — 13.32 done, and the app is runnable again.
- **The switch now visibly changes the UI.** Everything outside the page bodies flips language: sidebar groups + nav + brand tagline, the user menu, the Topbar search placeholder and role pill, every Verify button, and all enum values in tables and selects. Page titles/subtitles and form fields are still English — that's 13E/13F.
- **`Sidebar.tsx`** (13.18) — group labels and all nav items via `useT()`. Added a **`countries` namespace** (VN/TH/ID/MY) so the 國家 group doesn't list "Vietnam"; `lib/constants/countries.ts` stays untouched, same rule the plan set for `enums.ts`.
- **`UserMenu.tsx`** (13.19) — role line hoisted to a single `roleLine` const (it was duplicated in the panel and the button), plus Log out / Signing out…. **`Topbar.tsx`** went with it (chrome, not a separate task): it is now `async` and uses `getDictionary()` for the search placeholder and role pill.
- **`components/ui/*`** (13.20) — audited all 9. Only `VerifyButton` owns literals; the other eight (`Panel`/`PanelEmpty`/`Chip`/`CredentialRef`/`DropdownMenu`/`PageHead`/`Table`/`Kpi`/`Button`) are purely structural, every string caller-supplied. Nothing to translate there, now or later.
- **Enum labels** (13.21) — `enums.{deviceType,circuitType,cameraType,cameraStatus,vpnStatus,auditAction}` added to both dictionaries and **16 of the 17 `capitalize` spans replaced** across `network/page.tsx`, `cctv/page.tsx`, `countries/[code]/page.tsx`, `sites/[id]/page.tsx`, `audit/page.tsx`, `DeviceForm`, `CameraForm`, `CircuitForm`. The `capitalize` class is gone with them — labels now carry their own casing. **Two cases the plan missed:** the audit `action` chip (needed `auditAction`, from `lower(tg_op)`) and the site-detail VPN status chip (needed `vpnStatus`). `ap` reads "Access point" rather than "AP".
- ⚠️ **The 17th `capitalize` is in `app/(app)/network/vpn/new/VpnForm.tsx`** — the untracked orphan flagged below. Left untranslated deliberately: touching it would muddy the decision to delete it. It is the only English enum rendering left in the app.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ · tests **56 passed**, 4 RLS skipped. **Not yet driven live** — the smoke test in 13.33 is worth running now that the switch does something visible.

## Earlier change (2026-07-23) — Phase 13: 13C switch UI & shell complete (13.13–13.17)

- **The switch is now live in the UI** — first visible change of Phase 13. It flips `<html lang>`, the cookie and `profiles.locale`; the strings themselves are still English everywhere because extraction (13D–13F) hasn't run. Expect only the switch pill itself to react so far.
- **`components/layout/LocaleSwitch.tsx`** (13.13) — client segmented control, two buttons in one pill, existing DESIGN.md tokens only. `useTransition` + the `setLocale` server action, mirroring the logout pattern in `UserMenu.tsx`; disabled while pending and on the active option. A11y: `role="group"` + `aria-label` (translated), `aria-pressed`, and `lang={l}` per button so each label renders in its own language.
- **`components/layout/Topbar.tsx`** (13.14) — mounted between the search link and the role pill, with `ml-auto` so the pair stays right-aligned.
- **`app/layout.tsx`** (13.15) — now `async`: emits `lang={HTML_LANG[locale]}` and wraps `children` in `I18nProvider`. **Build cost confirmed, not assumed:** `npm run build` passes and `/_not-found` flipped from static to `ƒ` (dynamic); every other route was already dynamic, so that is the entire cost.
- **`app/globals.css` + `tailwind.config.ts`** (13.16) — `--font-cjk` (`PingFang TC`, `Microsoft JhengHei`, `Noto Sans TC`, `Heiti TC`) plus `--font-{head,body,mono}-stack` composites; the four `font-family` declarations now use the stacks. **`tailwind.config.ts` also had to change** (not in the plan): its `fontFamily` mapped `font-head`/`font-body`/`font-mono` directly to the bare next/font vars, so utility-class text — sidebar, chips, KPI labels — would still have rendered tofu.
- **`app/(auth)/layout.tsx`** (13.17) — new shell putting the switch top-right on login / forgot-password / reset-password, so someone who cannot read English can switch before signing in. One layout instead of three page edits.
- ⚠️ **Unrelated pre-existing discrepancy found:** `app/(app)/network/vpn/new/{page.tsx,VpnForm.tsx}` still exist **untracked** on disk and still build as a live route, even though commit `b44897f` retired VPN link creation and this file records them as deleted. Their POST target `app/api/vpn-links/` is an empty directory, so **submitting that form would 404**. Left alone — deleting is your call.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ · tests **56 passed**, 4 RLS skipped. **Not driven live** — and it cannot be until `0005_locale.sql` is applied (see below).

## Earlier change (2026-07-23) — Phase 13: 13B persistence complete (13.7–13.12)

- 🚫 **`0005_locale.sql` must be applied to the linked Supabase project before the app will run.** `getCurrentUser()` now selects `profiles.locale`; against a DB without the column that select errors, `profile` comes back null, and **every request looks signed-out**. Migration written but **not applied** (13.32 still open — no Docker in this env for a local `db reset`).
- **`supabase/migrations/0005_locale.sql`** (13.7/13.8) — `profiles.locale text check (locale is null or locale in ('en','zh-TW'))` + `set_my_locale(p_locale text)`: `security definer`, `set search_path = public`, `plpgsql`, re-validates the argument and raises `22023` on anything else, raises `28000` when `auth.uid()` is null, updates **only** `locale` for the calling user; `revoke all from public, anon` + `grant execute to authenticated`. **No self-update RLS policy was added** — RLS cannot restrict columns, so any policy permissive enough for locale would let a `country_manager` set `role='hq_admin'`, which is what `current_role_is_hq()` reads. The function is the sole write path; the reasoning is recorded in the migration header.
- **`lib/actions/locale.ts`** (13.10) — `"use server"` `setLocale(next)`: `isLocale()` guard **before any write**, then the cookie (`httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` in prod, 1-year `maxAge`), then the RPC only when signed in (the login page is translated too, so a signed-out switch still works via cookie), then `revalidatePath("/", "layout")`.
- **`lib/supabase/middleware.ts`** (13.11) — when the locale cookie is absent and a session exists, reads `profiles.locale` and sets the cookie on the response. Placed after the redirect branches so redirects don't pay for the query; precedence is **cookie → `profiles.locale` → `en`**, and it costs one query per new browser only. Root `middleware.ts` unchanged (pure delegation).
- **Types** (13.9/13.12) — `locale` added to the `profiles` `Row`/`Insert` and `set_my_locale` to the `Functions` block in `lib/types/database.ts`; `CurrentUser.locale` + the `profiles` select in `lib/auth.ts`. Both typed `Locale | null` off `lib/i18n/config`, so the DB check constraint and the TS union can't drift apart silently.
- Still no visible UI change — the switch itself is 13C. Next: 13.13–13.17 (`LocaleSwitch`, Topbar mount, `app/layout.tsx` `lang` + provider, the `--font-cjk` fallback, and the switch on the auth pages).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **56 passed**, 4 RLS skipped. **Not exercised against a live DB.**

## Earlier change (2026-07-23) — Phase 13: 13A locale core complete (13.1–13.6)

- **`lib/i18n/server.ts`** (13.4) — `getLocale()` (cookie → `en`) and `getDictionary()` for the 38 server components. Importing `next/headers` makes it server-only, so the lookup table itself was split into **`lib/i18n/dictionaries/index.ts`** (`DICTIONARIES: Record<Locale, Dictionary>`, `dictionaryFor()`) — a pure function usable from middleware (13.11 needs it) and tests.
- **`lib/i18n/client.tsx`** (13.5) — `I18nProvider({ dict, locale })` + `useT()` / `useLocale()` for the 17 client components, same `t.common.save` shape as the server side. **No fallback dictionary:** the context defaults to `null` and the hooks throw outside the provider — defaulting to `en` would ship the whole English object into every client bundle and hide a missing provider behind silently-English UI.
- **`tests/i18n.test.ts`** (13.6) — 7 tests: recursive dotted-path key parity `en` ↔ `zh-TW`, parity for every locale in `LOCALES` via `dictionaryFor`, no empty/non-string values, a copy-paste guard (zh values actually differ), plus `LOCALE_LABELS`/`HTML_LANG` coverage and `isLocale` accept/reject.
- Suite is now **56 passed** (was 49), 4 RLS integration skipped. Still nothing consumes i18n — no behaviour change.
- Next: **13B persistence** — `0005_locale.sql` (`profiles.locale` + the `set_my_locale` security-definer RPC), `lib/actions/locale.ts`, the middleware cookie seed, and the `CurrentUser`/`Database` type updates.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **56 passed**, 4 RLS skipped.

## Earlier change (2026-07-23) — Phase 13: 13.1–13.3 (locale config + both dictionaries)

- **`lib/i18n/config.ts`** (13.1): `LOCALES = ["en","zh-TW"]` + `Locale` type, `DEFAULT_LOCALE` (`en`), `LOCALE_COOKIE` (`"locale"`), `LOCALE_LABELS` (`EN` / `繁中`), `HTML_LANG` (`en` / `zh-Hant-TW`), `isLocale(value: unknown)` guard. Zero imports, so it is usable from server components, client components and middleware alike.
- **`lib/i18n/dictionaries/en.ts`** (13.2) — 16 namespaces (`common`, `nav`, `topbar`, `dashboard`, `country`, `sites`, `network`, `cctv`, `renewals`, `audit`, `users`, `search`, `auth`, `forms`, `enums`, `errors`) + `export type Dictionary = typeof en`. Seeded with the shared chrome only: Save / Save changes / Saving… / Cancel / Edit / New / Verify / Fresh / Stale, the sidebar groups + nav labels, the Topbar search placeholder and role pill, and each module's real `PageHead` title/subtitle. `forms` and `enums` are intentionally empty — 13.28 and 13.21 fill them.
- **`lib/i18n/dictionaries/zh-TW.ts`** (13.3) — full 繁體中文 mirror annotated `: Dictionary`.
- **Deviation from the plan:** `en` is **not** `as const`. Literal value types would have forced `zh-TW` to repeat the English strings verbatim; widened `string` values still enforce the exact key shape. **Guard proven**, not assumed: adding a probe key to `en` alone failed `tsc` with `TS2741 … missing in type` at `zh-TW.ts`; removed and re-verified clean.
- Nothing consumes any of this yet — no behaviour change. Next: 13.4/13.5 (`getDictionary()` for the 38 server components, `I18nProvider`/`useT()` for the 17 client ones), then 13.6 (runtime key-parity test).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — Phase 13 (i18n) planned, not yet started

- **`TASKS.md` gains Phase 13 — EN / 繁體中文 language switch**: 35 subtasks in 7 groups (13A locale core · 13B persistence · 13C switch UI & shell · 13D chrome & shared · 13E pages · 13F forms/validation/API · 13G verification). **No code written yet.**
- Approach: cookie + `profiles.locale`, hand-rolled typed dictionary in `lib/i18n/` (`zh-TW.ts` annotated `: Dictionary`, so a missing key is a `tsc` error). A `[locale]` URL segment is ruled out — `typedRoutes: true` would mean rewriting every route and `Link href`.
- Two findings that shape the work: (1) `profiles` has **no self-UPDATE policy**, and adding one would be a privilege-escalation hole (RLS can't restrict columns → a `country_manager` could set `role='hq_admin'`), so the locale write goes through a column-scoped `security definer` RPC; (2) all three `next/font` families load `subsets: ["latin"]` and have **no CJK glyphs** — needs a `--font-cjk` fallback in `globals.css`.
- Scope reality: **55 `.tsx` files / ~5,000 lines**, 38 server + 17 client components, 16 `capitalize` enum renders, 13 API routes, 8 Zod messages. Dates/money stay `en-GB`/`en-US` in both locales (reversible).
- Plan file: `~/.claude/plans/adding-dual-switches-languages-cryptic-jellyfish.md`.

## Earlier change (2026-07-22) — Sites list drops the archived toggle

- Removed the **Show archived / Hide archived** button from the Sites module header (`app/(app)/sites/page.tsx`); the header action is now a single **+ New** button (relabelled from "+ New site", matching the country dashboards). The page no longer reads `searchParams`, so `?archived=1` does nothing — archived sites are always filtered out (`.is("archived_at", null)` is now unconditional).
- `archived_at` dropped from the select and the now-unreachable **Archived** chip removed from the Status cell; the chip is Stale/Fresh only.
- `SiteForm`'s create submit label is now **Save** (was "Save site"); edit mode still reads "Save changes". All six forms now submit with the same **Save** label.
- **Caveat:** archived sites are no longer reachable from the list, so restoring one needs its detail URL directly. Archive/restore itself is untouched.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — Network New dropdown + a dedicated Firewall form

- Network `PageHead` actions are now one ghost **New** `DropdownMenu` (same component as CCTV) with **New circuit** → `/network/circuits/new` and **New Firewall** → `/network/firewalls/new`; the two separate `+ Circuit` / `+ VPN link` buttons are gone.
- New route `app/(app)/network/firewalls/new/page.tsx` renders the shared `DeviceForm` with a new `fixedType="firewall"` prop — a firewall is a `network_devices` row with `device_type='firewall'`, so it reuses the same columns, RLS-scoped site list and `POST /api/devices`. No schema change. With `fixedType` the Type select renders disabled for context and the value submits from a hidden registered input.
- Submit labels normalised to **Save** on `CircuitForm`, `VpnForm` and `DeviceForm` (create); edit mode still reads "Save changes".
- VPN link **creation is retired**: `app/(app)/network/vpn/` (page + `VpnForm`) and `app/api/vpn-links/route.ts` are deleted. Existing rows still **read** fine — the site detail VPN links panel, the country dashboard "VPN links" stat, the `vpn_links` table, its RLS/audit policies, the `verify` allowlist and `vpnLinkSchema` all remain; nothing in the app can insert one now.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **49 passed**, 4 RLS skipped.

## Earlier change (2026-07-22) — Location column dropped from both camera tables

- Removed the **Location** column (header + `location_desc` cell) from the camera tables on `app/(app)/cctv/page.tsx` and `app/(app)/countries/[code]/page.tsx`, and dropped `location_desc` from both camera selects. No `colSpan` to adjust.
- `location_desc` now has no reader and no writer in the app; the column, its Zod field, and the `CameraForm` `defaultValues` passthrough remain so stored values survive edits.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — camera form: Site select replaces the Location field

- `CameraForm` now opens with the recorder form's **Site** select (`{country_code} · {name}`, `Select a site…`, required) in the old Recorder slot; **Recorder** moved into the slot the free-text **Location** field used to occupy, and that field is gone.
- Cameras have no `site_id` of their own (they inherit one via recorder), so Site is local `useState`, not a form value: it scopes the recorder options to that site and clears `recorder_id` on change. Recorder is disabled until a site is picked ("Select a site first…"), and shows "No recorders on this site yet." when the site has none. Edit mode seeds Site from the camera's current recorder.
- `location_desc` stays in the Zod schema, DB, edit values and the CCTV/country camera tables — it's just no longer editable; it's kept in `defaultValues` so an edit round-trip doesn't drop an existing value. **Nothing in the UI can set it now.**
- Both pages fetch sites and select `site_id` on recorders: `cctv/cameras/new/page.tsx` (now a `Promise.all`) and `cctv/cameras/[id]/edit/page.tsx`.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **49 passed**, 4 RLS skipped.

## Earlier change (2026-07-22) — country dashboards drop the New dropdown

- Removed the `+ New` `DropdownMenu` (New site / New network device / New CCTV recorder) from the `PageHead` actions in `app/(app)/countries/[code]/page.tsx` — one file, so all four country dashboards lose it. Unused `DropdownMenu` import dropped; the CCTV dashboard's own **New** dropdown is untouched.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — recorder form adopts the device-form pattern

- `RecorderForm` now matches the other forms: props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; own `PageHead` inside `<form>` with **Cancel / Save** (edit: **Save changes**) in the header actions; fields wrapped in `Panel`. Bottom action bar + audit-log hint gone; server error renders in the actions row. Grid → `gap-x-4 gap-y-0` + `px/pt-[18px] pb-[1px]`; `Field` uses the absolute `pb-[17px]` message strip (error wins over help).
- Both pages are now thin fetch-and-delegate wrappers: `cctv/recorders/new/page.tsx` and `cctv/recorders/[id]/edit/page.tsx` dropped `PageHead`/`Panel`/`PanelHeader` ("Recorder details") and `max-w-3xl`. Create dropped `eyebrow="CCTV"`; edit keeps it — same split as the camera pages.
- This was the last form still on the old layout; all six (device, site, circuit, VPN, camera, recorder) now share the pattern.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — maintenance log form removed from CCTV

- Deleted `app/(app)/cctv/maintenance/**` (`page.tsx` + `MaintenanceLogForm.tsx`) and dropped the **+ Maintenance** action from the CCTV dashboard `PageHead`; subtitle is now "Recorders, cameras, and retention." No other UI linked to the route.
- The CCTV header action is now a `DropdownMenu` (`label="New"`, `sm`, `variant="ghost"`) with **New recorder** → `/cctv/recorders/new` and **New camera** → `/cctv/cameras/new` — same reusable component as the country dashboard, so it also restores the only UI entry point to the recorder create page. `CameraForm`'s create submit label is now **Save** (was "Save camera"; edit still reads "Save changes").
- Also deleted `app/api/maintenance-logs/route.ts` and `maintenanceLogSchema`/`MaintenanceLogInput` from `lib/validation/cctv.ts` (plus the now-unused `optionalDate` import).
- Left in place: the `maintenance_logs` table + RLS/audit migrations and `MAINTENANCE_TARGETS` in `lib/constants/enums.ts` (still used by `Database` types). No app code writes maintenance logs now.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **49 passed**, 4 RLS skipped.

## Earlier change (2026-07-22) — camera form adopts the device-form pattern

- `CameraForm` now matches the other forms: props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; own `PageHead` inside `<form>` with **Cancel / Save camera** (edit: **Save changes**) in the header actions; fields wrapped in `Panel`. Bottom action bar + audit-log hint gone; server error renders in the actions row. Grid → `gap-x-4 gap-y-0` + `px/pt-[18px] pb-[1px]`; `Field` uses the absolute `pb-[17px]` message strip (error wins over help).
- `cctv/cameras/new/page.tsx`: the **no-recorders empty state** (with its "add a recorder" link) keeps its own `PageHead` + `Panel`/`PanelEmpty`; otherwise the page just renders `<CameraForm …/>`. `cctv/cameras/[id]/edit/page.tsx` is thin and keeps `eyebrow="CCTV"`. Both dropped the "Camera details" `PanelHeader` and `max-w-3xl`; create also dropped its eyebrow.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — maintenance form adopts the device-form pattern

- `MaintenanceLogForm` now matches the other forms: props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; own `PageHead` inside `<form>` with **Cancel / Log maintenance** in the header actions; fields wrapped in `Panel`. Bottom action bar + audit-log hint gone; server error renders in the actions row. Grid → `gap-x-4 gap-y-0` + `px/pt-[18px] pb-[1px]`; local `Field` gains the absolute `pb-[17px]` message strip (and a `help` slot, unused so far).
- `cctv/maintenance/new/page.tsx`: the **no-assets empty state** keeps its own `PageHead` + `Panel`/`PanelEmpty` (nothing to submit, so no form/actions); otherwise the page just renders `<MaintenanceLogForm …/>`. Dropped `PanelHeader` ("Maintenance event"), `max-w-3xl`, and `eyebrow="CCTV"`. The `preset` prop is unchanged (still no caller).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — VPN form adopts the device-form pattern

- `VpnForm` now matches `DeviceForm`/`SiteForm`/`CircuitForm`: props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; own `PageHead` inside `<form>` with **Cancel / Save** in the header actions; fields wrapped in `Panel`. Bottom action bar + audit-log hint gone; server error renders in the actions row.
- Grid → `gap-x-4 gap-y-0` + `px/pt-[18px] pb-[1px]`; `Field` uses the absolute `pb-[17px]` help/error strip (error wins). The long **Peer (free-text)** help was split: it now reads "HQ or an external endpoint.", and the pointer to the registry moved onto **Peer site** as its own help ("Use this when the peer is a registered site.") — the strip truncates, so one sentence per field.
- `network/vpn/new/page.tsx` is thin (fetch → `<VpnForm …/>`); dropped `PageHead`/`Panel`/`PanelHeader`, the "Link details" header, `max-w-3xl`, and `eyebrow="Network"` — full width, title only, like the other create pages.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — circuit form adopts the device-form pattern

- `CircuitForm` now matches `DeviceForm`/`SiteForm`: props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; it renders its own `PageHead` inside `<form>` with **Cancel / Save** in the header actions, and wraps the fields in `Panel`. Bottom action bar + the audit-log hint removed; the inline server error moved into the actions row.
- Grid switched to `gap-x-4 gap-y-0` + `px/pt-[18px] pb-[1px]`, and the local `Field` uses the absolutely-positioned `pb-[17px]` help/error strip (error wins over help) so all rows are equal height. The Static IPs help text was shortened to "Comma or space separated." since the strip truncates; the example lives in the placeholder.
- `network/circuits/new/page.tsx` is thin (fetch → `<CircuitForm …/>`), dropped `PageHead`/`Panel`/`PanelHeader` and the "Circuit details" header. It also **lost `max-w-3xl` and the `eyebrow="Network"`**, matching the other create pages (full width, title only).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — site form adopts the device-form pattern

- `SiteForm` now mirrors `DeviceForm`: new props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; it renders its own `PageHead` **inside** `<form>` with **Cancel / Save site** in the header actions (title line), and wraps the fields in `Panel` itself. The bottom action bar and its "Saving writes an entry to the audit log." note are gone (audit logging itself unchanged).
- Field layout matched too: single `md:grid-cols-3` grid (was `md:grid-cols-2 xl:grid-cols-3`), `gap-x-4 gap-y-0`, `px/pt-[18px] pb-[1px]`, and the local `Field` renders help/error absolutely inside a fixed `pb-[17px]` strip (error wins over help) so every grid row is equal height. `spanAll` dropped — Notes now uses `span2`, textarea `min-h-[64px]`.
- `sites/new/page.tsx` and `sites/[id]/edit/page.tsx` are thin: they render `<SiteForm …/>` only, no `PageHead`/`Panel`/`PanelHeader` imports. Edit keeps `eyebrow="Sites"`; create has none. Both stay full width. The "Site details" panel header is gone from both.
- The inline server error renders in the actions row. Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — new-site page drops its eyebrow

- `app/(app)/sites/new/page.tsx`: removed `eyebrow="Sites"` from `PageHead`; the page now shows just the "New site" title + subtitle. The site **edit** page (`sites/[id]/edit`) keeps its eyebrow. Same trim previously applied to the new-device page.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — Sites back in the sidebar (MODULES)

- `components/layout/Sidebar.tsx`: added a **Sites** entry as the first item of the **MODULES** group (`/sites`, `SitesIcon`, active on `pathname.startsWith("/sites")`). It carries a count badge — the sum of `siteCounts` over the countries the user can see, so HQ gets the group total and a country manager gets only their own country's count.
- No new data fetching: reuses the `siteCounts` prop the layout already passes for the Countries group. Reverses the earlier nav trim for Sites only; **Dashboard stays out** of the rail.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings). Not driven live in-app.

## Earlier change (2026-07-22) — device form actions sit on the title line

- **Cancel / Save device now render in `PageHead` actions**, i.e. the same line as the "New device" title (top-right of the section). To keep them inside `<form>` (so `type="submit"` submits with no `form=` reference and no lifted state), `DeviceForm` now renders the heading itself: new props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`, and it wraps its fields in the `Panel`.
- `network/new/page.tsx` and `network/[id]/edit/page.tsx` are now thin — they fetch, then render `<DeviceForm …/>` and no longer import `PageHead`/`Panel`/`PanelHeader`. Edit keeps its `eyebrow="Network"` + `panelClassName="max-w-3xl"`; create stays full width with no eyebrow.
- The inline server-error message moved into the actions row. The old bottom action bar and its "Saving writes an entry to the audit log." note are both gone — the panel now ends at the field grid (18px bottom padding via `pb-[1px]` + each field's `pb-[17px]`). Audit logging itself is unchanged; only the UI hint was removed.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — new-device page header trims

- `app/(app)/network/new/page.tsx`: removed the `<PanelHeader title="Device details" />` bar (and its now-unused import); the form starts straight at the top of the panel. Also dropped the `eyebrow="Network"` from `PageHead` — the page now shows just the "New device" title + subtitle. The **edit** page (`network/[id]/edit`) still has both the eyebrow and the panel header.

## Earlier change (2026-07-22) — device form vertical rhythm

- `network/new/DeviceForm.tsx`: the **Notes** row sat ~19px lower than every other row because the help line under *Credential reference* made that grid row taller. The local `Field` now renders its help/error line **absolutely positioned inside a fixed `pb-[17px]` strip**, so a field with a message is exactly as tall as one without — all grid rows are equal height and the row-to-row spacing is a uniform 17px. Notes moves up by that difference.
- Grid changed `gap-4` → `gap-x-4 gap-y-0` (the reserved strip is now the row gap); container padding `p-[18px]` → `px/pt-[18px] pb-[1px]` so bottom padding still totals 18px. Help/error is `truncate` with a `title` tooltip, and only one of the two shows (error wins) since they now share one slot; the credential help text was shortened to fit a narrow column.
- Applies to the device **edit** page too (same component).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — new-device form is full width

- `app/(app)/network/new/page.tsx`: dropped `max-w-3xl` from the `Panel`, so the **New device** form now fills the full content section width. `DeviceForm` is untouched (its `md:grid-cols-3` layout just gets wider), so the shared **edit** page (`network/[id]/edit`) keeps its `max-w-3xl` framing. Every other create/edit form still caps at `max-w-3xl`.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — country header "+ New" is now a dropdown

- Added `components/ui/DropdownMenu.tsx` (client) — a reusable menu button reusing the `UserMenu` open/close pattern (outside-click + Escape), `aria-haspopup="menu"` / `aria-expanded`, `role="menu"`/`menuitem`, chevron rotates when open. Takes plain serializable `items: { label, href: Route, hint? }[]`, so server components can render it and **adding another action is one line**.
- `app/(app)/countries/[code]/page.tsx` header CTA switched from a `<Link><Button>+ New</Button></Link>` to `<DropdownMenu label="+ New" sm />`; the now-unused `Button` import was dropped. Items: **New site** → `/sites/new`, **New network device** → `/network/new`, **New CCTV recorder** → `/cctv/recorders/new`. This restores the only UI entry point to `/network/new` and `/cctv/recorders/new` (both were left URL-only when the Topbar "New record" action was removed).
- Added `ChevronDownIcon` to `components/layout/icons.tsx`.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings). Not driven live in-app.

## Earlier change (2026-07-22) — country header button label

- Renamed the country dashboard header CTA from **+ New site** to **+ New** (`app/(app)/countries/[code]/page.tsx`); one shared route, so it applies to all 4 country pages. Link target `/sites/new` unchanged. The Sites module list keeps its **+ New site** label.

## Earlier change (2026-07-22) — module header trims

- Removed the **+ New device** button from the Network module page header (`app/(app)/network/page.tsx`); `+ Circuit` and `+ VPN link` remain. Route `/network/new` is untouched and still reachable from the Topbar "New record" action.
- Removed the **+ New recorder** button from the CCTV module page header (`app/(app)/cctv/page.tsx`); `+ Maintenance` and `+ Camera` remain. Route `/cctv/recorders/new` is untouched (per-row Edit and deep links unaffected).
- Removed the **New record** CTA from the Topbar (`components/layout/Topbar.tsx`); it now holds search + the role pill only. `Button`/`PlusIcon` imports dropped. **No UI entry point to `/network/new` or `/cctv/recorders/new` remains** — both routes still work by direct URL.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — nav trim + per-country dashboards

- **Nav trim** — removed the **Dashboard** and **Sites** entries from the sidebar (`components/layout/Sidebar.tsx`); the rail now starts at the Countries group. Routes `/dashboard` and `/sites/**` are untouched and still reachable (post-login redirect, country cards, search deep links). Icon components remain exported in `icons.tsx`.
- **Country pages are now dashboards** — `countries/[code]/page.tsx` replaced the plain site list with a country-scoped dashboard organised by the sidebar **MODULES** sections: KPI row (sites / devices / cameras online / stale) → **Network** (devices, circuits, VPN, circuits ≤90d + preview tables) → **CCTV** (recorders, cameras, faulty, below-retention + preview tables) → **Renewals** (circuit `contract_end` + device `warranty_end` ≤90d) → **Sites** registry table.
- Scoping: sites are filtered by `country_code`, every child query is `.in("site_id", siteIds)` (cameras via recorder ids), so each country shows only its own records; RLS remains the boundary. Retention minimum + review cycle read from that country's `country_settings` row (constants as fallback). Tables preview 8 rows with a "view all" link to the module; fetches capped at 50 (10.6). Per-query `.error` flags degrade stats to `—` (ROB-5).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · unit tests **49 passed**, 4 RLS integration skipped. Not driven live in-app.

## Phase rollup

| Phase | Area | Status | Notes |
|---|---|---|---|
| 0 | Foundation & tooling | ✅ **Done** | Verified vs. code + hosted Supabase boot/login (0.7b). |
| 1 | Data layer (migrations & seed) | ✅ **Done** | 0001–0004 applied to linked project; local `db reset` (CLI+Docker) not re-run in this env. |
| 2 | Auth, RLS & audit | ✅ **Done** | Public sign-up disabled in dashboard; RLS deny-by-default on all 12 tables. |
| 3 | Sites registry (Story 1) | ✅ **Done** | List, create, edit, archive/restore, detail, country view. |
| 4 | Network module (Story 2) | ✅ **Done** | Devices (create+edit), ISP circuits (create), VPN links (create), IP/VLAN editor, per-row Verify, `CredentialRef`. Circuit/VPN **edit** deferred. |
| 5 | CCTV module (Story 3) | ✅ **Done** | Recorders (create+edit), cameras (create+edit, recorder-scoped), polymorphic maintenance log, per-row Verify/Edit, per-country retention-below-minimum flag. |
| 6 | Dashboard & country cards | ✅ **Done** | Global KPIs + per-country cards (sites/devices/camera health/circuits ≤90d/stale), retention chips, renewals panel; staleness driven by per-country `review_cycle_months`. |
| 7 | Global search (Story 5) | 🚧 Partial | RLS-scoped `search_registry` RPC + page done; perf budget unmeasured. |
| 8 | Renewals view (Story 6) | ✅ **Done** | 30/60/90 window + country filter wired; country resolved via site; RLS-scoped with ROB-5 error guard. |
| 9 | Roles, audit view & users | ✅ **Done** | Users page + invite (HQ-only, audited); paginated audit view with expandable diff + actor names; nav/page gating (9.6). |
| 10 | Cross-cutting concerns | 🚧 Ongoing | Secrets guard, verify, formatters in place; money/currency display, 50-row caps, 403/not-found sweep pending. |
| 11 | Testing & QA | 🚧 Partial | Unit + secrets/format/validation green; RLS integration + audit-immutability tests pending live env. |
| 12 | Deployment readiness | ◻ Todo | Docker image build, staging/prod projects, CI, pen-test pending. |
| 13 | i18n — EN / 繁體中文 switch | ✅ **Done** | All 35 subtasks. Live smoke (13.33) + security checks (13.34) both passed 2026-07-23. |

Legend: ✅ done · 🚧 partial/in-progress · ◻ scaffold/todo

## What shipped in the last pass (2026-07-16) — Phase 9 (Roles, audit & users)

- **Audit view (9.5)** — `audit/page.tsx` is now paginated (50/page via `?page=N`, exact count, Newer/Older links) and shows the **diff** column. `audit/DiffCell.tsx` (client) renders changed-field names inline and expands to the raw JSON. Actor UUIDs are resolved to profile names for the rows on the visible page (best-effort). A `.error` guard degrades to "temporarily unavailable".
- **Users & invite (9.1–9.3)** — confirmed complete: HQ-only redirect-gated users list + `InviteForm`; hardened `POST /api/invite` (service-role, 403 for non-HQ, Zod validation, auth-user rollback, explicit BUS-2 audit entry).
- **UI action gating (9.6)** — sidebar hides the Administration group for non-HQ; both admin pages redirect non-HQ to `/dashboard`; Countries nav scoped to the manager's own country. RLS remains the security boundary; UI gating is convenience only.

**Verification:** static only — `tsc` ✅, `next lint` ✅ (0). Not yet driven live in-app (recommended smoke: log in as HQ, page through the audit log + expand a diff; log in as a country manager, confirm Users/Audit nav and pages are inaccessible).

## Earlier pass (2026-07-16) — Phase 8 (Renewals)

- **Renewals view (8.2/8.3)** — `renewals/page.tsx` lists ISP `contract_end` + device `warranty_end` within a 30/60/90-day window, soonest-first. Country is resolved through the parent site (circuit/device → `site_id` → `country_code`) and shown as a new table column.
- **Filters** — window pills (30/60/90) + country pills; HQ sees "All countries" + the four codes, a country manager sees only their own (RLS already scopes the data). Each pill preserves the other filter via `withCountry()`.
- **Resilience** — a single `failed` flag (any of sites/circuits/devices `.error`, ROB-5) degrades the panel to "temporarily unavailable" instead of an empty "nothing due" list.

**Verification:** static only — `tsc` ✅, `next lint` ✅ (0). Not yet driven live in-app (recommended smoke: log in as HQ, toggle window + country pills; log in as a country manager, confirm only their country shows and other-country renewals never appear).

## Earlier pass (2026-07-16) — Phase 6 (Dashboard)

- **Per-country cards** — each office card now shows Sites, Devices, Cameras (active/total), Faulty cams, Circuits ≤90d, and Stale records; title deep-links to `countries/[code]`. Camera health is attributed to a country via camera→recorder→site.
- **Retention & CCTV totals (6.3)** — per-country recorder/camera counts; a per-country `N low retention` danger chip plus the existing global "below retention minimum" attention panel.
- **Staleness (6.4)** — `reviewMonthsFor(country)` reads `country_settings.review_cycle_months` per country (fallback 6); no hardcoded cycle. Sites, devices, recorders, and cameras all counted toward each country's stale tally.
- **Resilience** — per-query `.error` flags (ROB-5) degrade individual stats to `—` (e.g. `camerasByCountry` needs cameras+recorders+sites) instead of showing 0.

**Verification:** static only — `tsc` ✅, `next lint` ✅ (0), unit tests **49 passed**. Not yet driven live in-app (recommended smoke: log in as HQ vs. a country manager, confirm cards scope correctly and a low-retention recorder shows the country chip).

## Earlier pass (2026-07-16) — Phase 5 (CCTV)

- **Recorders (create+edit)** — `RecorderForm`, `POST /api/recorders` + `PATCH /api/recorders/[id]` (BUS-6 optimistic concurrency, 409 on conflict, not-found handling); pages `cctv/recorders/new` + `cctv/recorders/[id]/edit`.
- **Cameras (create+edit)** — `CameraForm` scoped to a recorder (recorder picker), `POST /api/cameras` + `PATCH /api/cameras/[id]` (BUS-6); pages `cctv/cameras/new` + `cctv/cameras/[id]/edit`.
- ~~**Maintenance logs** — `MaintenanceLogForm` + `POST /api/maintenance-logs`~~ **removed 2026-07-22** (form, route, and schema deleted; table/RLS retained).
- **CCTV list** — per-row **Edit** + **Verify** on both tables, KPI row, **New** dropdown (recorder / camera).
- **Retention flag (5.5)** — `lib/utils/cctv.ts:isBelowRetention` compares `retention_days` to per-country `country_settings.min_retention_days` (joined recorder→site), default 30; danger chip + KPI. Unit-tested (`tests/cctv.test.ts`).

**Verification:** static only — `tsc` + `lint` + unit tests (49 passed) + code review. Not yet driven live in the running app (recommended smoke test: create/edit/verify a recorder + camera, log a maintenance event, confirm a low-retention recorder is flagged against the hosted project).

## Next up — Phase 10 (cross-cutting) + Phase 7 tail

1. Phase 10: apply secrets guard across all mutation schemas (10.2), per-site currency display (10.5), 50-row caps sweep (10.6), 403/not-found sweep (10.7).
2. Phase 7: measure search perf budget (<500ms on <10k) — 7.1/7.3 remain `~`.
3. Phase 11/12: RLS integration tests on live env, Docker image build, CI.

## Known deferrals / caveats

- **Circuit & VPN edit** forms not built (only create) — device-edit pattern is ready to replicate.
- **Live in-app verification** of Phase 4 flows still pending (no Supabase creds in the build env).
- **Local `supabase db reset`** (CLI + Docker) not runnable in this env — migrations confirmed via hosted apply instead.
- **Runtime + Compliance/a11y audits** not yet run (only SEC/CODE/BUS/ROB filed).
