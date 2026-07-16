# TASKS — Corp Management Platform (MVP v1.0)

| Field | Value |
|---|---|
| **Source** | `finalize.md` (Ready for scaffold) + `prd.md` (Draft v1.0) |
| **Purpose** | Phase-by-phase implementation breakdown into small, verifiable subtasks |
| **Date** | 2026-07-07 |
| **Status legend** | `[ ]` todo · `[~]` scaffolded / partial · `[x]` done |

> Update the checkboxes as work completes. Ignore `wireframe.html`, `themes.html`, `mockup.html`.
> Definition of done for any data-facing task: shared Zod validation runs, RLS scopes the query, and the change is visible in the relevant list/dashboard.
>
> **2026-07-16 reconciliation:** QA audits (SEC/CODE/BUS/ROB) reconciled against the actual code — every remediation `[x]` in the `*-AUDIT.md` files is backed by real implementation. **SEC-5 (rate limiting) now implemented** (`lib/api/rate-limit.ts`, in-memory sliding window on all mutation routes); only BUS-6 (optimistic concurrency) remains owner-deferred. Unit suite verified green: **39 passed** (`secrets`/`format`/`validation`/`rate-limit`), 4 RLS integration tests skipped (need live Supabase env).

---

## Phase 0 — Project foundation & tooling

- [~] **0.1** Next.js 15 App Router + TypeScript + RSC baseline (`next.config.ts` `output: "standalone"`).
- [~] **0.2** Tailwind config + design tokens wired from `DESIGN.md` (`tailwind.config.ts`, `app/globals.css`).
- [~] **0.3** UI primitives: `Button`, `Chip`, `Kpi`, `PageHead`, `Panel`, `Table` (`components/ui/*`).
- [~] **0.4** App shell: `Sidebar`, `Topbar`, icons, `(app)/layout.tsx`.
- [~] **0.5** Env contract: `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (service key server-only).
- [~] **0.6** `Dockerfile` multi-stage (`node:22-alpine`, standalone, non-root, `PORT=3000`), `.dockerignore`.
- [ ] **0.7** Verify local dev boots against a real Supabase project (`npm run dev`) and `.env.local` documented in `README.md`.
- [ ] **0.8** Lint/typecheck clean: `npm run lint` + `tsc --noEmit` pass on the whole tree.

## Phase 1 — Data layer (migrations & seed)

- [~] **1.1** Enums: `user_role`, `country_code`, `circuit_type`, `device_type`, `camera_type`, `camera_status`, `vpn_status` (`0001_init.sql`).
- [~] **1.2** Core tables: `profiles`, `sites`, `isp_circuits`, `network_devices`, `ip_schemes`, `vlans`, `vpn_links`, `cctv_recorders`, `cctv_cameras`, `maintenance_logs`, `audit_log`.
- [~] **1.3** Gap tables/columns from finalize Part D: `country_settings` (`min_retention_days`=30, `review_cycle_months`=6), `sites.currency char(3)`, `sites.archived_at`, `vpn_links.peer_site_id`, `attributes jsonb` on devices + cameras.
- [~] **1.4** Common columns on inventory tables: `id`, `created_by default auth.uid()`, `created_at`, `updated_at` (trigger), `last_verified_at`.
- [ ] **1.5** `maintenance_logs` check constraint restricting `target_table` to `network_devices | cctv_recorders | cctv_cameras` (finalize D.4) — verify present.
- [ ] **1.6** `updated_at` maintenance trigger applied to every inventory table — verify present.
- [~] **1.7** Seed: 4 countries + `country_settings` defaults; Malaysia (`MY`) sample sites/devices/cameras only (`seed.sql`).
- [ ] **1.8** Confirm migrations apply cleanly from empty DB via Supabase CLI (`supabase db reset`).

## Phase 2 — Auth, RLS & audit (security core)

- [~] **2.1** Supabase clients: `createBrowserClient`, `createServerClient` (cookie/JWT → RLS), `createAdminClient` (service role, invite route only).
- [~] **2.2** Middleware refreshes session + gates `/app/**` (`middleware.ts`, `lib/supabase/middleware.ts`).
- [~] **2.3** RLS helper fns `current_role_is_hq()`, `current_country()` — `SECURITY DEFINER`, `stable`, read `profiles` by `auth.uid()`.
- [~] **2.4** RLS policies (deny-by-default, RLS enabled on every table): `sites` by country; child tables scoped via parent `site_id`; `cctv_cameras` via recorder→site; `audit_log` select for `hq_admin` only, no insert/update/delete policies (`0002_rls.sql`).
- [~] **2.5** Audit: `SECURITY DEFINER` trigger writing `actor/action/table_name/record_id/diff(jsonb)` on insert/update/delete (`0003_audit.sql`).
- [ ] **2.6** Login flow end-to-end: `(auth)/login` form → `auth/callback` → redirect to dashboard; invalid creds handled.
- [ ] **2.7** Invite-only confirmed: public signup disabled in Supabase Auth settings (document in `README.md`).
- [x] **2.8** Password recovery flow: `(auth)/forgot-password` (`resetPasswordForEmail` → neutral confirmation) + `(auth)/reset-password` (`updateUser`, min-8 + confirm, invalid/expired-link state) via existing `auth/callback`; "Forgot password?" link on login; middleware `isRecoveryRoute` allowlist. — `app/(auth)/forgot-password/*`, `app/(auth)/reset-password/*`, `app/(auth)/login/LoginForm.tsx`, `lib/supabase/middleware.ts`. Requires Supabase SMTP + redirect URLs configured.

## Phase 3 — Sites registry (Story 1) — ✅ done

- [x] **3.1** Sites list page grouped by country with per-country site count; archived hidden by default (`?archived=1` toggle). — `app/(app)/sites/page.tsx`
- [x] **3.2** `siteSchema` (Zod) — country, name, address, timezone (IANA default per country), contact fields, notes, currency default by country. — `lib/validation/site.ts`
- [x] **3.3** Site create form (RHF + Zod resolver, country → TZ/currency prefill) + `POST /api/sites` route (RLS-scoped insert). — `sites/SiteForm.tsx`, `sites/new/page.tsx`, `api/sites/route.ts`
- [x] **3.4** Site edit + archive/restore (`archived_at` soft delete, no hard delete). — `sites/[id]/edit/page.tsx`, `sites/ArchiveButton.tsx`, `api/sites/[id]/route.ts`
- [x] **3.5** Site detail page: child inventory (circuits, devices, IP scheme, VPN, recorders) + verify/edit/archive actions + `last_verified_at`. — `sites/[id]/page.tsx`
- [x] **3.6** Country view `countries/[code]` — fixed "New site" link (→ `/sites/new`), site names link to detail; added "Sites" sidebar nav.

## Phase 4 — Network module (Story 2)

- [~] **4.1** Network list page: devices + circuits tables, stale flag, paginated at 50.
- [~] **4.2** Device create: `DeviceForm` + `POST /api/devices` (RLS + secrets guard).
- [ ] **4.3** Device edit + per-row "Verify — still accurate" wired to verify route.
- [ ] **4.4** ISP circuits: `ispCircuitSchema`, create/edit form + `POST /api/circuits` (provider, circuit_id, bandwidth, type, static_ips[], contract start/end, monthly_cost + currency, support_phone).
- [x] **4.5** IP schemes + VLANs: `ipSchemeSchema`/`vlanSchema`, per-site editor (subnets, gateway, DNS, DHCP range, VLAN table) + routes. — `lib/validation/network.ts`, `sites/[id]/network/page.tsx` + `IpSchemeForm.tsx`/`VlanForm.tsx`, `api/ip-schemes/route.ts`, `api/vlans/route.ts`; entry from site detail "IP schemes" panel.
- [ ] **4.6** VPN/WAN links: `vpnLinkSchema`, form + route; `peer_site_id` FK selector or free-text `peer`, tunnel_type, status.
- [ ] **4.7** `credential_ref` UX: labeled "link to password manager entry", render URL as `target=_blank rel=noopener`, plain text otherwise.

## Phase 5 — CCTV module (Story 3)

- [~] **5.1** CCTV list page: recorders + cameras with status chips (verify pagination at 50).
- [ ] **5.2** Recorders: `recorderSchema`, create/edit form + `POST /api/recorders` (brand, model, channels, storage_tb, retention_days, firmware, mgmt IP ref, location).
- [ ] **5.3** Cameras: `cameraSchema`, create/edit form + `POST /api/cameras` (label, location_desc, type, resolution, outdoor, status) — scoped to a recorder.
- [ ] **5.4** Maintenance logs: `maintenanceLogSchema`, log-event form + route (date, action, performed_by, next_due) polymorphic on `target_table`/`target_id`.
- [ ] **5.5** Retention-below-minimum flag: compare recorder `retention_days` to effective minimum (`country_settings.min_retention_days` else 30).

## Phase 6 — Dashboard & country cards (Story 3 & 5)

- [~] **6.1** Landing dashboard scaffold (`dashboard/page.tsx`).
- [ ] **6.2** Per-country cards: site count, device count, camera health (active/faulty), circuits expiring ≤90d, stale records (past review cycle).
- [ ] **6.3** CCTV totals + retention-below-minimum flag surfaced on dashboard/country view.
- [ ] **6.4** Stale computation uses `country_settings.review_cycle_months` (default 6) not a hardcoded value.

## Phase 7 — Global search (Story 5)

- [~] **7.1** `pg_trgm` GIN indexes on searchable columns (`0004_search.sql`).
- [x] **7.2** `search_registry(q text)` SQL function running **as caller** (RLS-scoped), returning `(type, id, label, country_code)` — confirmed `security invoker` + `set search_path` (SEC audit), called via `supabase.rpc` in `search/page.tsx`.
- [~] **7.3** Search page: query box → grouped-by-type results (`search/page.tsx`, `hrefFor` deep-links per type). <500ms budget on <10k dataset not yet measured.
- [x] **7.4** Empty/short-query, no-results, and RPC-failure states all handled (`search/page.tsx` — <2 chars, "No matches", "temporarily unavailable" per ROB-4).

## Phase 8 — Renewals view (Story 6)

- [~] **8.1** Renewals page scaffold (`renewals/page.tsx`).
- [ ] **8.2** Query `isp_circuits.contract_end` + `network_devices.warranty_end` within 30/60/90 window, sorted asc, filterable by country.
- [ ] **8.3** Window selector + country filter UI wired.

## Phase 9 — Roles, audit view & user management (Story 4)

- [~] **9.1** Users page + `InviteForm` scaffold.
- [~] **9.2** `POST /api/invite` using `createAdminClient` (service role, server-only) — assign `role` + `country_code`.
- [x] **9.3** Invite route enforces HQ-admin-only (`actor?.role !== "hq_admin"` → 403) + `inviteUserSchema.safeParse` validation; writes an explicit `audit_log` entry for the acting admin (BUS-2). — `api/invite/route.ts`
- [~] **9.4** Audit log page scaffold (`audit/page.tsx`).
- [ ] **9.5** Audit view: HQ-admin-only, immutable list of actor/action/table/record/diff/time, paginated.
- [ ] **9.6** UI hides actions a user can't perform (never relied on for security — RLS is source of truth).

## Phase 10 — Cross-cutting concerns

- [~] **10.1** Secrets guard: `containsPossibleSecret(text)` util used in Zod `.refine()` on `notes`/`credential_ref`/free-text (`lib/utils/secrets.ts`).
- [ ] **10.2** Apply secrets guard across all mutation schemas (network, cctv, site).
- [~] **10.3** Verify action route `POST /api/verify` + reusable `components/ui/VerifyButton.tsx` — wired into site detail; still to wire into network/CCTV lists.
- [~] **10.4** Formatters/utils: `formatDate`, `isStale`, money+currency, `cn` (`lib/utils/*`).
- [ ] **10.5** Money display uses per-site `currency` (MYR/VND/THB/IDR); numeric(12,2) formatting.
- [ ] **10.6** List views cap at 50 rows everywhere (guard against unbounded fetch).
- [ ] **10.7** 403/empty + `not-found` handling on unauthorized/cross-country access.

## Phase 11 — Testing & QA

- [~] **11.1** RLS integration tests with two seeded users (1 `hq_admin`, 1 `country_manager` MY) asserting cross-country returns empty/denied (`tests/rls.test.ts`).
- [ ] **11.2** Extend RLS tests to child tables (circuits, devices, ip/vlan, vpn, recorders, cameras, maintenance) + `audit_log` (HQ-only read).
- [ ] **11.3** Audit-log immutability test: caller cannot update/delete `audit_log`.
- [x] **11.4** Zod/secrets-guard unit tests — `tests/secrets.test.ts` (7), `tests/validation.test.ts` (13), `tests/format.test.ts` (13); 33 passed on 2026-07-16.
- [ ] **11.5** Search RLS test: `country_manager` search never returns other-country rows.
- [x] **11.6** QA audits filed + reconciled — `SEC-AUDIT.md`, `CODE-AUDIT.md`, `BUS-AUDIT.md`, `ROB-AUDIT.md` (Security, Code Quality, Business Logic, Robustness). Remediations verified against code 2026-07-16. Runtime and Compliance/a11y audits not yet run.

## Phase 12 — Deployment readiness

- [ ] **12.1** `docker build` produces a runnable standalone image; container starts on `PORT=3000` as non-root.
- [ ] **12.2** Staging + production Supabase projects (SEA/Singapore region); migrations promoted via CI.
- [ ] **12.3** CI applies migrations (Supabase CLI) + runs RLS/unit tests on PR.
- [ ] **12.4** Pre-launch manual pen-test of API routes for cross-country access (finalize risk mitigation).

---

## Dependency order (recommended)

1. **Phase 0–2** (foundation, data, security core) — mostly scaffolded; verify & harden first.
2. **Phase 3** (sites) — root of all records; blocks 4–8.
3. **Phase 4 & 5** (network, CCTV) — can proceed in parallel once sites exist.
4. **Phase 6–8** (dashboard, search, renewals) — depend on populated data.
5. **Phase 9** (roles/audit/users) — needs auth core + at least one mutating flow.
6. **Phase 10** cross-cutting — apply continuously alongside 3–9.
7. **Phase 11–12** — gate before launch.
