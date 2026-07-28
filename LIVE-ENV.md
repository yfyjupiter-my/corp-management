# LIVE-ENV — what Phases 11 & 12 need from a live Supabase environment

> The test/CI **code** is written and merged; it auto-skips until the environment below exists.
> This file is the checklist to make it run. Decision on record (2026-07-24): the RLS suite runs
> against the **existing linked project**, and the tests self-seed a disposable VN fixture rather
> than relying on a permanent cross-country seed.
>
> 🔴 **REWRITTEN 2026-07-28 for the flat access model.** `0006_drop_roles.sql` removed roles
> (`hq_admin` / `country_manager`), so the two-user cross-country contract this file described no
> longer exists. The suites were rewritten to assert what the schema now guarantees — a signed-in
> user CRUDs every country, the audit log is immutable, **`anon` gets nothing**. The env contract
> shrank from **six vars to four**.
>
> ✅ **Phase 11 re-closed 2026-07-28:** `0006` was applied to the linked project and the rewritten
> suites ran green against it — **105 passed, 0 skipped**. (The earlier 89/89 pass is void; it tested
> the isolation this removed.) The probe user was deleted afterwards, so the suites **auto-skip
> again** until a user is re-created per the prerequisites below.

---

## Phase 11 — integration tests (`tests/rls.test.ts`, `tests/rls-integration.test.ts`)

Everything is one env contract. Set these four and both suites run; leave them unset and both skip
(so `npm test` stays green locally and in CI).

| Var | What it is |
|---|---|
| `TEST_SUPABASE_URL` | The linked project's API URL (same value as `NEXT_PUBLIC_SUPABASE_URL`) |
| `TEST_SUPABASE_ANON_KEY` | The **anon** key — deliberately not the service role. The tests sign in as a real user so RLS applies, **and** they exercise this key unauthenticated to prove `anon` is denied. |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | One pre-created user: an auth user **plus** a `profiles` row. There is no role or country to set any more. |

### Prerequisites on the project

1. ✅ **Migrations `0001`–`0006` applied** to the linked project (`0006` pushed 2026-07-28).
   ⚠️ Note for 12.2: staging and production start empty and need **all six**.
2. **One test user exists.** Create it via the service role or the in-app Users page, then put its
   credentials in the env. It needs a `profiles` row, not just an auth user — no profile means
   `/no-access`. The row carries **no role and no country**; `full_name` is the only field to set.
   ⚠️ **None currently exists.** The old `rls-test-hq@` / `rls-test-my@` pair is gone (deleted
   2026-07-28) and was the wrong shape anyway; the `p14-probe@` account used for the 2026-07-28 run
   was deleted immediately after it. Create a single `rls-test@…` on **staging** as part of 12.2 —
   that is where a test account with a file-stored password belongs, and it matters more now: any
   account on this project is a full-access account.
3. **Auth "allow new users to sign up" stays off** (already set, 2.7).

### What runs, and the residue

- **`rls.test.ts`** — a signed-in user reads sites and **creates one in all four countries**; reads
  the audit log. Then the part that now carries the weight: **`anon` reads 0 rows from all 12
  tables**, cannot insert a site, and gets nothing from `search_registry`. With roles gone,
  deny-by-default for the anon key is the only boundary RLS still enforces, and the anon key ships
  in the browser bundle — so this block is the security regression test for the whole schema.
- **`rls-integration.test.ts`** (11.2 / 11.3 / 11.5) — child-table CRUD through both parent paths
  (`site_id`, and `recorder_id`→site), audit immutability, and search. `beforeAll` creates a
  `__RLS11_…` **VN** site + one row in every child table; `afterAll` deletes it (FK cascade) and
  sweeps orphans from any interrupted run. VN is deliberate: the seed is Malaysia-only, so writing
  to VN proves the caller is not scoped to the country their own data sits in.
- ⚠️ **Residue you can't avoid:** the fixture's insert/delete writes immutable `audit_log` rows — the
  audit log has no delete policy, by design. A run adds roughly a dozen audit rows and cleans up
  everything else. If that matters, point `TEST_*` at a throwaway project instead (no code change —
  just different env values).

### Run it

```bash
# .env.test (git-ignored) or exported in the shell, then:
npm test                                       # unit + integration
npx vitest run tests/rls-integration.test.ts   # just that suite
```

Loading the env for a local run (Vitest does not read `.env.test` on its own in this setup):

```bash
set -a && . ./.env.test && set +a && npm test
```

Without the env: **75 passed / 30 skipped**. With it: **105 passed / 0 skipped** — confirmed against
the migrated linked project on 2026-07-28.

⚠️ **Residue from that run: `audit_log` grew 64 → 99** (+35 immutable rows, from the probe's
four-country writes and both suites' fixtures). Teardown was otherwise clean — sites back to the
original 5, 0 `__RLS11_` / `__RLS_ACCESS_` / `__P14_` rows, probe user deleted with 0 orphan profiles.

> ℹ️ Historical note: the *previous* suites ran live earlier the same day and passed 89/89. That run
> is **not** evidence for the current ones — it exercised the cross-country isolation that
> `0006_drop_roles.sql` removed, and every one of those assertions has been rewritten.

---

## Phase 12 — deployment readiness

| Item | Needs a live env? | What to stand up |
|---|---|---|
| **12.1** Docker image | No | `docker build` + run locally; confirm it boots on `PORT=3000` as non-root. `Dockerfile` already exists (0.6). |
| **12.2** Staging + prod projects | **Yes — two new projects** | See below |
| **12.3** CI on PR | Yes (repo secrets) | `.github/workflows/ci.yml` is written; add the secrets |
| **12.4** Pre-launch pen-test | Yes (staging) | Manual — see the rescoped section below |

### 12.2 — the two Supabase projects

Create **staging** and **production** projects, both in the **SEA / Singapore** region. For each:

1. `supabase link --project-ref <ref>` then `supabase db push` (migrations `0001`–**`0006`**).
2. `seed.sql` on **staging only** — never seed production. (`seed.sql` has no conflict guard; run once.)
3. Auth: **disable** "allow new users to sign up".
4. Auth: configure **SMTP** + **redirect URLs** so password reset works (2.8). ⚠️ **No longer needed
   for provisioning users** — `POST /api/users` creates accounts already-confirmed with a password
   the creator sets, so SMTP is only about the "Forgot password?" flow now.
5. Create the **first user** via the service role: an auth user plus a `profiles` row
   (`insert into profiles (user_id, full_name) values (…)`). There is no other way in — signups are
   off — and an auth user without a profile lands on `/no-access`. Every user after that can be
   created in-app by any signed-in user.
6. App env per environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (server-only), `NEXT_PUBLIC_SITE_URL`.

### 12.3 — CI secrets to add in GitHub repo settings

The workflow runs typecheck/lint/build/unit on every PR with **no secrets**. To light up the rest:

- **RLS suite on PR** — the **four** `TEST_*` values above (point them at staging, or the linked
  project). Was six; the HQ/manager pair collapsed into one user.
- **Migration job** (runs only on push to `staging` or manual dispatch, never on a PR):
  `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`, `SUPABASE_STAGING_DB_PASSWORD`.

### 12.4 — pen-test (rescoped by the role removal)

The original scope — "confirm a `country_manager` cannot reach another country's data" — is **void**:
there are no roles, and cross-country access is now the intended behaviour. What must be proved
instead, against **staging**:

1. **Every route rejects the anon key / an unauthenticated request.** Each of `/api/sites`,
   `/api/devices`, `/api/circuits`, `/api/recorders`, `/api/cameras`, `/api/ip-schemes`,
   `/api/vlans`, `/api/users` and every `[id]` PATCH/DELETE, with no session and with a forged
   bearer token. This is the boundary that replaced role checks, and it is the whole boundary.
2. **`/api/users` cannot be reached without a session** (403), and its rate limit holds — every
   signed-in user can now mint accounts, so the throttle is the only thing bounding the auth table.
3. **`audit_log` still cannot be written or altered** through PostgREST by a signed-in user, only
   read. Re-read each attempt: a missing UPDATE/DELETE policy returns 0 rows and **no error**, so
   "no error" is not a pass (the 13.34 gotcha).
4. **`anon` reads 0 rows from all 12 tables** — the automated version of this is in `rls.test.ts`;
   confirm it live too, since a mis-scoped policy here exposes the entire registry publicly.

The `[id]` routes still filter by id alone. That was previously a probe-resistance property; with
RLS no longer scoping by country it simply means a missing id and an existing one both 404.
