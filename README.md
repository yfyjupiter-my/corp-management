# Corp Management — SEA IT Infrastructure Registry

Centralized registry of **network** and **CCTV** infrastructure for the company's four
Southeast Asia offices (Vietnam, Thailand, Indonesia, Malaysia). Signed-in users register and
maintain sites, ISP circuits, network devices, IP schemes, VPN links, CCTV recorders, cameras,
and maintenance logs across all four countries. Postgres Row Level Security keeps the registry
closed to unauthenticated callers — see **Security model** for what it does and does not enforce.

> This is a **registry, not a monitoring system**. No live polling, no camera streams, no secrets in
> the database (only references to a password-manager entry). See `prd.md` and `finalize.md`.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router, React Server Components, TypeScript |
| Styling | Tailwind CSS driven by HQ Slate design tokens (`DESIGN.md`) |
| Backend | Supabase — Postgres (RLS), Auth (email/password, no public sign-up), Storage (v1.1) |
| Validation | Zod schemas shared between client forms and route handlers |
| Deployment | Docker (`node:22-alpine`, `output: standalone`) behind a TLS-terminating proxy |

## Getting started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local   # fill in your Supabase project values

# 3. Apply database schema (requires Supabase CLI + a linked project)
supabase db reset            # runs supabase/migrations/* then supabase/seed.sql

# 4. Run
npm run dev                  # http://localhost:3000
```

### Environment variables (`.env.local`)

Copy `.env.example` → `.env.local` and set each value. **`.env.local` is
git-ignored — never commit real keys.** Find the URL and keys in the Supabase
dashboard under **Project Settings → API**.

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL (e.g. `https://xxxx.supabase.co`). Inlined into the browser bundle. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anonymous key. Safe for the browser — RLS constrains what it can read. |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Service-role key. **Bypasses RLS** — used solely by `lib/supabase/admin.ts` in `POST /api/users`. **Never** prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SITE_URL` | public | Base URL for auth redirect links (password reset). `http://localhost:3000` in dev. |

### Seeding a hosted (cloud) project

`supabase db reset` runs migrations **and** `supabase/seed.sql`, but it's local-only.
For a hosted project, `supabase db push` applies migrations **but not the seed** — load it
separately, and **only once** on a fresh DB:

```bash
supabase link --project-ref <ref>
supabase db push                     # migrations 0001–0004 only
```

Then run the seed once, either way:

- **SQL Editor** (simplest): paste the contents of `supabase/seed.sql` into the dashboard
  SQL Editor and run it. Runs privileged, so RLS is bypassed cleanly.
- **psql**: `psql "$DATABASE_URL" -f supabase/seed.sql` (connection URI from
  Settings → Database).

> ⚠️ Run the seed **once**. `country_settings` is guarded with `on conflict do nothing`,
> but the Malaysia sample block has no conflict guard — re-running duplicates the
> "Kuala Lumpur HQ" site and its child records. On a brand-new project you can instead use
> `supabase db reset --linked` to apply migrations + seed in one (destructive) step.

Verify the seed landed — expect 4 / 1 / 4:

```sql
select
  (select count(*) from country_settings) as countries,
  (select count(*) from sites)            as sites,
  (select count(*) from cctv_cameras)     as cameras;
```

### Closed auth (disable public sign-up)

This app has **no public sign-up flow** — users are provisioned by an existing user from
the **Users** page (`POST /api/users`), which creates the account already-confirmed with a
password the creator sets. No invite email is sent, so this path does not need SMTP.
Lock the project down to match:

1. **Authentication → Providers → Email** — turn **off** *"Allow new users to sign up"*.
   With it on, anyone could self-register and land without a `profiles` row (and thus
   no RLS scope). RLS still denies them every row, but disabling sign-up removes the
   dead-end accounts entirely.
2. **Authentication → URL Configuration** — set the **Site URL** and add the
   `/auth/callback` redirect URL (matches `NEXT_PUBLIC_SITE_URL`) so password-reset
   links resolve.

Create your first login via **Authentication → Users → Add user**, then insert its
`profiles` row (`insert into profiles (user_id, full_name) values (…)`) — an auth user
with no profile lands on `/no-access`. Every user after that can be created in-app.

## Project structure

```
app/
  (auth)/login/         Sign-in (no public sign-up)
  (app)/                Authenticated shell: rail + topbar
    dashboard/          Per-country KPI cards, health, renewals, staleness
    countries/[code]/   Country-scoped site list
    network/            ISP circuits, devices, IP schemes, VPN links
    cctv/               Recorders, cameras, maintenance logs
    renewals/           Contract & warranty expiry window (30/60/90d)
    users/              Create user accounts (open to any signed-in user)
    audit/              Immutable audit log (readable by any signed-in user)
  api/                  Route Handlers for mutations (RLS-scoped user JWT)
components/             UI primitives + layout (Sidebar, Topbar)
lib/
  supabase/             Browser / server / admin client factories + middleware helper
  validation/           Zod schemas
  constants/            Country + enum reference data
  utils/                Formatting, secret-scan guard, class merge
supabase/
  migrations/           SQL schema, RLS, audit triggers, search function
  seed.sql              Reference data + Malaysia pilot sample
middleware.ts           Session refresh + /app gate
```

## Security model

> ⚠️ **Flat access model since `0006_drop_roles.sql`.** Roles (`hq_admin` /
> `country_manager`) were removed: **every authenticated user has full CRUD on all four
> countries** and can read the audit log and create other users. RLS is still enabled on
> every table, but it now draws the line at *signed in*, not at *who* — it is an
> authentication boundary, not an authorization one.

- **Deny-by-default still holds for `anon`.** Every policy is `auth.uid() is not null`,
  so the public anon key (which ships in the browser bundle) reads and writes nothing.
  This is now the *only* boundary RLS enforces, so treat any policy edit as security-critical.
- **No secrets stored.** `credential_ref` is a plain reference/URL; a save-time regex guard warns on
  password-like strings (`lib/utils/secrets.ts`).
- **Immutable audit log.** Written by `SECURITY DEFINER` Postgres triggers; readable by any
  authenticated user, with no update/delete policies — so it cannot be altered from the app.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and used solely by `POST /api/users`, which is
  the one operation the anon key cannot perform (creating an auth user).

## Testing

`npm test` runs the unit suite. The RLS suites (`tests/rls*.test.ts`) additionally need a
live project and one test user — `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`,
`TEST_USER_EMAIL`, `TEST_USER_PASSWORD` — and **auto-skip** when those are absent. They
assert the current contract: a signed-in user can CRUD every country, the audit log is
immutable, and `anon` gets nothing from any table.

## Reference documents

- `prd.md` — product requirements
- `finalize.md` — resolved open questions & locked technical decisions
- `DESIGN.md` — HQ Slate design system (primary styling source)
- `wireframe.html`, `themes.html`, `mockup.html` — design references (do not edit)
