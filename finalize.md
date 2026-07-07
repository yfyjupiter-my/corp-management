# Finalize: Corp Management Platform — Resolved Decisions for Implementation

| Field | Value |
|---|---|
| **Source PRD** | `prd.md` (Draft v1.0) |
| **Purpose** | Resolve all Open Questions + lock ambiguous details so implementation can begin without further clarification |
| **Status** | Ready for scaffold |
| **Date** | 2026-07-07 |

---

## Part A — Resolved Open Questions

### Q1. CCTV standard retention minimum & stricter legal requirements

**Decision:** Adopt a **company-wide default minimum of 30 days**, stored as **configurable, per-country** so a stricter local requirement can override it without a code change.

- Add a `settings` table (or `country_settings`) keyed by `country_code` with `min_retention_days` (default `30`).
- The dashboard "below minimum" flag compares each recorder's `retention_days` against the **effective minimum** for that recorder's country: `country_settings.min_retention_days` if present, else the global default `30`.
- Seed values: `VN`, `TH`, `ID`, `MY` → `30`. No country is hard-coded to a stricter number now; encode overrides later once legal confirms. (Indonesia/Vietnam data-protection notes in PRD §Security remain informational only.)

**Why:** Keeps the KPI ("retention below company minimum is flagged") satisfiable on day one while making legal-driven overrides a data change, not a deployment.

---

### Q2. Existing password manager for `credential_ref`

**Decision:** Treat `credential_ref` as a **free-text reference/URL with no integration**. Do **not** couple to a specific vendor.

- `credential_ref` is a nullable `text` column. UI label: *"Link or reference to password manager entry — never paste the actual secret here."*
- Validation (soft): if the value looks like a URL, render it as a clickable link (`target="_blank" rel="noopener"`); otherwise show as plain text.
- A regex guard (see Part C) warns on save if the field or any notes field contains a password-like string.

**Why:** No confirmed vendor exists in the PRD. A plain reference field works for Bitwarden, 1Password, or a wiki URL alike, and avoids lock-in for an internal tool.

---

### Q3. Pilot country

**Decision:** **Malaysia (`MY`)** confirmed as pilot.

- Seed data targets `MY` first. All four countries (`VN`, `TH`, `ID`, `MY`) exist in the enum/reference from the start so RLS and navigation are complete; only `MY` is pre-populated with sample sites.

**Why:** Matches PRD §Phased Rollout assumption; no signal to change it.

---

### Q4. Expected record volume

**Decision:** Design for **< 10k total records** and **≤ ~200 cameras per site** as the practical ceiling; do not build for hundreds-of-thousands scale.

- Standard indexed Postgres queries; no pagination-by-cursor required for MVP, but **list views paginate at 50 rows** to stay safe.
- Global search targets the < 10k dataset with a **500ms** budget using trigram/`ILIKE` indexes (see Part C). No external search engine.

**Why:** Confirms PRD assumption; keeps the data layer simple (plain Postgres) while a page-size cap prevents an accidental unbounded fetch if one site does have many cameras.

---

## Part B — Locked Technical Decisions (previously implicit)

| Area | Decision |
|---|---|
| **Next.js version** | Next.js 15+ App Router, TypeScript, React Server Components. `output: "standalone"`. |
| **Node runtime** | `node:22-alpine` (matches PRD Dockerfile). |
| **Styling** | Tailwind CSS. Tokens/components come from `DESIGN.md` (primary styling source). |
| **Supabase clients** | `@supabase/supabase-js` + `@supabase/ssr`. Three factory helpers: `createBrowserClient` (client components), `createServerClient` (RSC/route handlers, cookie-based, user JWT → RLS applies), and a `createAdminClient` (service role, server-only, used **only** in the invite route). |
| **Validation** | Zod schemas in `lib/validation/*`, imported by both client forms and route handlers. |
| **Forms** | React Hook Form + Zod resolver for client interactivity; Server Actions or Route Handlers for mutations. **Decision: use Route Handlers** (`app/api/**`) for mutations so the same handlers can back a future read-only API (v2.0) and are easy to RLS-test. |
| **Auth flow** | Email + password, **invite-only** (public signup disabled in Supabase Auth settings). Magic link deferred. Middleware refreshes the session cookie and gates `/app/**`. |
| **Authorization** | Enforced in Postgres via RLS (source of truth). UI hides what a user can't do, but never relies on hiding for security. |
| **Audit log** | Written by **Postgres triggers** on insert/update/delete of inventory tables, capturing `actor` (from `auth.uid()`), action, table, record_id, and a JSON `diff`. `audit_log` has RLS: readable by `hq_admin` only; **no** update/delete policies (immutable). |
| **Migrations** | SQL files in `supabase/migrations`, applied via Supabase CLI in CI. |
| **Testing** | RLS policy tests with two seeded test users (one `hq_admin`, one `country_manager` for `MY`) — integration tests hitting the DB with each user's JWT, asserting cross-country access returns empty/denied. |
| **Timezone** | `sites.timezone` stored as IANA string (e.g., `Asia/Kuala_Lumpur`). Default per country on create. |
| **Money** | `monthly_cost` stored as `numeric(12,2)` + a `currency` char(3) column (per-site, default by country: MYR/VND/THB/IDR). Add `currency` — PRD omitted it and multi-country cost is meaningless without it. |
| **Soft delete** | `archived_at timestamptz null` on `sites`. No hard deletes of referenced records; child records inherit visibility via the archived site. |

### Country → defaults reference (seed)

| Code | Name | Timezone | Currency |
|---|---|---|---|
| `VN` | Vietnam | `Asia/Ho_Chi_Minh` | VND |
| `TH` | Thailand | `Asia/Bangkok` | THB |
| `ID` | Indonesia | `Asia/Jakarta` | IDR |
| `MY` | Malaysia | `Asia/Kuala_Lumpur` | MYR |

---

## Part C — Data-Model Clarifications & Guards

### Enums (Postgres `create type` or `text` + check constraint)

- `user_role`: `hq_admin` | `country_manager`  *(HQ Viewer added in v1.1)*
- `country_code`: `VN` | `TH` | `ID` | `MY`
- `circuit_type`: `fiber` | `broadband` | `lte`
- `device_type`: `router` | `firewall` | `switch` | `ap` | `other`
- `camera_type`: `dome` | `bullet` | `ptz` | `other`
- `camera_status`: `active` | `faulty` | `offline`
- `vpn_status`: `up` | `down` | `unknown`

### Common columns (every inventory table)

`id uuid pk default gen_random_uuid()`, `created_by uuid` (default `auth.uid()`), `created_at timestamptz default now()`, `updated_at timestamptz default now()` (trigger-maintained), `last_verified_at timestamptz null`.

- **"Verify — still accurate"** action = `update … set last_verified_at = now()` on the single row (RLS-scoped). Stale = `last_verified_at is null or last_verified_at < now() - review_cycle`.
- **Review cycle**: global default **6 months**, stored in `country_settings.review_cycle_months` (default `6`) so it's tunable.

### Extensibility

- Add `attributes jsonb not null default '{}'` on `network_devices` and `cctv_cameras` (per PRD risk mitigation) for country-specific extras. Not indexed in MVP.

### Secrets guard (regex scan on save)

- Server-side validation runs a heuristic on `notes`, `credential_ref`, and other free-text fields: reject/flag values matching common secret patterns (e.g., `password\s*[:=]`, long high-entropy tokens, `BEGIN … PRIVATE KEY`). Implementation: a shared `containsPossibleSecret(text)` util used in Zod `.refine()`. On match → block save with a message pointing to `credential_ref` guidance.

### Search implementation

- Enable `pg_trgm`. Add GIN trigram indexes on: `sites.name`, `network_devices.hostname`, `isp_circuits.provider`, `isp_circuits.circuit_id`, `cctv_cameras.label`, and IP columns.
- Global search = union `ILIKE '%q%'` across those columns via a single SQL function `search_registry(q text)` that runs **as the caller** (RLS-scoped), returning `(type, id, label, country_code)`. Results grouped by type in the UI.

### Renewals view

- Query `isp_circuits.contract_end` and `network_devices.warranty_end` within a window param (`30 | 60 | 90` days), sorted ascending, filterable by `country_code`. In-app only for MVP.

---

## Part D — Additions to the PRD data model (gaps found)

These were missing from PRD §Data Model and are required to implement the acceptance criteria:

1. **`country_settings`** — `country_code pk`, `min_retention_days int default 30`, `review_cycle_months int default 6`. (Resolves Q1 + review-cycle tunability.)
2. **`sites.currency`** — `char(3)`; multi-country `monthly_cost` is otherwise ambiguous.
3. **`vpn_links.peer_site_id`** — optional FK to `sites.id` when the peer is another site; keep free-text `peer` for HQ/external peers.
4. **`maintenance_logs`** — confirm polymorphic shape (`target_table` + `target_id`). Add a check constraint restricting `target_table` to `network_devices | cctv_recorders | cctv_cameras`.
5. **`audit_log.diff`** — `jsonb`; `actor uuid`, `action text` (`insert|update|delete`), `table_name text`, `record_id uuid`, `created_at timestamptz`.

---

## Part E — RLS Policy Pattern (authoritative)

```sql
-- Helper: caller's profile
-- current_role_is_hq(): profiles.role = 'hq_admin' for auth.uid()
-- current_country():     profiles.country_code for auth.uid()

-- sites: hq sees all; country_manager sees own country
create policy sites_select on sites for select using (
  current_role_is_hq() or country_code = current_country()
);
create policy sites_write on sites for all using (
  current_role_is_hq() or country_code = current_country()
) with check (
  current_role_is_hq() or country_code = current_country()
);

-- child tables (isp_circuits, network_devices, ip_schemes, vlans, vpn_links,
-- cctv_recorders, maintenance_logs): scope via parent site's country
-- e.g. using ( exists (select 1 from sites s where s.id = site_id
--   and (current_role_is_hq() or s.country_code = current_country())) )

-- cctv_cameras: scope via recorder -> site
-- audit_log: select only when current_role_is_hq(); no insert/update/delete policies
--            (writes happen via SECURITY DEFINER trigger)
```

- **Deny-by-default**: RLS enabled on every table; no permissive fallback policy.
- Helper functions are `SECURITY DEFINER`, `stable`, reading `profiles` by `auth.uid()`.
- The audit trigger is `SECURITY DEFINER` so it can insert into `audit_log` despite the table having no insert policy for callers.

---

## Part F — Open Questions: Final Status

| # | Question | Resolution |
|---|---|---|
| 1 | CCTV retention minimum / legal overrides | Default **30 days**, per-country override via `country_settings`. |
| 2 | Password manager for `credential_ref` | **No integration**; free-text reference/URL + secret-scan guard. |
| 3 | Pilot country | **Malaysia** confirmed. |
| 4 | Record volume | Design for **< 10k** records, page lists at 50, trigram search; camera-per-site cap handled by pagination. |

**All open questions resolved. Ready to proceed to scaffold.**

> Note: Decisions in Parts A–C were made from the PRD's stated assumptions and sensible internal-tool defaults. If HQ later confirms a stricter legal retention figure or a specific password manager, both are data/config changes, not re-architecture.
