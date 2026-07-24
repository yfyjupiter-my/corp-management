# LIVE-ENV — what Phases 11 & 12 need from a live Supabase environment

> The test/CI **code** is written and merged; it auto-skips until the environment below exists.
> This file is the checklist to make it run. Decision on record (2026-07-24): the RLS suite runs
> against the **existing linked project**, and the tests self-seed a disposable VN fixture rather
> than relying on a permanent cross-country seed.

---

## Phase 11 — integration tests (`tests/rls.test.ts`, `tests/rls-integration.test.ts`)

Everything is one env contract. Set these six and both suites run; leave them unset and both skip
(so `npm test` stays green locally and in CI).

| Var | What it is |
|---|---|
| `TEST_SUPABASE_URL` | The linked project's API URL (same value as `NEXT_PUBLIC_SUPABASE_URL`) |
| `TEST_SUPABASE_ANON_KEY` | The **anon** key — deliberately not the service role; the tests sign in as real users so RLS actually applies |
| `TEST_HQ_EMAIL` / `TEST_HQ_PASSWORD` | A pre-created **`hq_admin`** profile (no `country_code`) |
| `TEST_MY_MANAGER_EMAIL` / `TEST_MY_MANAGER_PASSWORD` | A pre-created **`country_manager`** with `country_code = 'MY'` |

### Prerequisites on the project

1. **Migrations `0001`–`0005` applied** (already true on the linked project — `supabase db push` on 2026-07-23).
2. **Two test users exist** with the roles above. Create them the way the smokes did — via the service
   role — then put their credentials in the env. They must have a `profiles` row with the right `role`
   / `country_code`, not just an auth user.
3. **Auth "allow new users to sign up" stays off** (already set, 2.7) — the test users are invited, not self-signed.

### What runs, and the residue

- **11.1** (`rls.test.ts`) — HQ sees all countries; MY manager sees only MY; illegal cross-country
  insert is blocked; manager can't read `audit_log`.
- **11.2 / 11.3 / 11.5** (`rls-integration.test.ts`) — child-table isolation, audit immutability,
  and search scoping. `beforeAll` has HQ create a `__RLS11_…` VN site + one row in every child table;
  `afterAll` deletes it (FK cascade) and sweeps orphans from any interrupted run.
- ⚠️ **Residue you can't avoid:** the fixture's insert/delete writes immutable `audit_log` rows — the
  audit log has no delete policy, by design. A run adds roughly a dozen audit rows to the linked
  project and cleans up everything else. If that matters, point `TEST_*` at a throwaway project instead
  (no code change — just different env values).

### Run it

```bash
# .env.test (git-ignored) or exported in the shell, then:
npm test                       # unit + integration
npx vitest run tests/rls-integration.test.ts   # just the new suite
```

Still open in Phase 11 after this: nothing new to write — 11.2/11.3/11.5 are coded. 11.4 (unit) is
done. The remaining work is **running** the above against the env and ticking the boxes.

---

## Phase 12 — deployment readiness

| Item | Needs a live env? | What to stand up |
|---|---|---|
| **12.1** Docker image | No | `docker build` + run locally; confirm it boots on `PORT=3000` as non-root. `Dockerfile` already exists (0.6). |
| **12.2** Staging + prod projects | **Yes — two new projects** | See below |
| **12.3** CI on PR | Yes (repo secrets) | `.github/workflows/ci.yml` is written; add the secrets |
| **12.4** Pre-launch pen-test | Yes (staging) | Manual, both roles — cross-country probing of every API route |

### 12.2 — the two Supabase projects

Create **staging** and **production** projects, both in the **SEA / Singapore** region. For each:

1. `supabase link --project-ref <ref>` then `supabase db push` (migrations `0001`–`0005`).
2. `seed.sql` on **staging only** — never seed production. (`seed.sql` has no conflict guard; run once.)
3. Auth: **disable** "allow new users to sign up".
4. Auth: configure **SMTP** + **redirect URLs** so invites and password reset work (2.8).
5. Invite the first **`hq_admin`** via the service role (there is no other way in — signups are off).
6. App env per environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (server-only), `NEXT_PUBLIC_SITE_URL`.

### 12.3 — CI secrets to add in GitHub repo settings

The workflow runs typecheck/lint/build/unit on every PR with **no secrets**. To light up the rest:

- **RLS suite on PR** — the six `TEST_*` values above (point them at staging, or the linked project).
- **Migration job** (runs only on push to `staging` or manual dispatch, never on a PR):
  `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`, `SUPABASE_STAGING_DB_PASSWORD`.

### 12.4 — pen-test

Against **staging**, signed in as each role, confirm no API route (`/api/sites`, `/api/devices`,
`/api/circuits`, `/api/recorders`, `/api/cameras`, `/api/ip-schemes`, `/api/vlans`, `/api/invite`,
and every `[id]` PATCH/DELETE) lets a `country_manager` read or write another country's data. Largely a
live re-run of the 13.34 checks extended to the mutation routes. The `[id]` routes filter by id alone
on purpose — a cross-country row matches nothing under RLS, so a probe can't distinguish "not yours"
from "doesn't exist".
