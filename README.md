# Corp Management — SEA IT Infrastructure Registry

Centralized, role-based registry of **network** and **CCTV** infrastructure for the company's four
Southeast Asia offices (Vietnam, Thailand, Indonesia, Malaysia). HQ admins and country managers
register and maintain sites, ISP circuits, network devices, IP schemes, VPN links, CCTV recorders,
cameras, and maintenance logs — with cross-country isolation enforced by Postgres Row Level Security.

> This is a **registry, not a monitoring system**. No live polling, no camera streams, no secrets in
> the database (only references to a password-manager entry). See `prd.md` and `finalize.md`.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router, React Server Components, TypeScript |
| Styling | Tailwind CSS driven by HQ Slate design tokens (`DESIGN.md`) |
| Backend | Supabase — Postgres (RLS), Auth (email/password, invite-only), Storage (v1.1) |
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

## Project structure

```
app/
  (auth)/login/         Invite-only sign-in (no public sign-up)
  (app)/                Authenticated shell: rail + topbar
    dashboard/          Per-country KPI cards, health, renewals, staleness
    countries/[code]/   Country-scoped site list
    network/            ISP circuits, devices, IP schemes, VPN links
    cctv/               Recorders, cameras, maintenance logs
    renewals/           Contract & warranty expiry window (30/60/90d)
    users/              Invite users, assign role + country (HQ admin only)
    audit/              Immutable audit log (HQ admin only)
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

- **RLS is the source of truth.** `hq_admin` sees all countries; `country_manager` is scoped to
  their `country_code`. UI hiding is convenience only — never the enforcement boundary.
- **No secrets stored.** `credential_ref` is a plain reference/URL; a save-time regex guard warns on
  password-like strings (`lib/utils/secrets.ts`).
- **Immutable audit log.** Written by `SECURITY DEFINER` Postgres triggers; readable by HQ admins,
  no update/delete policies.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and used solely by the invite route.

## Testing

RLS policy tests seed two users (one `hq_admin`, one Malaysia `country_manager`) and assert that
cross-country reads/writes return empty or are denied. Run with `npm test`.

## Reference documents

- `prd.md` — product requirements
- `finalize.md` — resolved open questions & locked technical decisions
- `DESIGN.md` — HQ Slate design system (primary styling source)
- `wireframe.html`, `themes.html`, `mockup.html` — design references (do not edit)
