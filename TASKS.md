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
> **2026-07-16 reconciliation:** QA audits (SEC/CODE/BUS/ROB) reconciled against the actual code — every remediation `[x]` in the `*-AUDIT.md` files is backed by real implementation. **All audit items now resolved:** SEC-5 (rate limiting, `lib/api/rate-limit.ts`) and BUS-6 (optimistic concurrency on the site edit PATCH, `lib/api/optimistic.ts`) are implemented; no audit items remain deferred. Unit suite verified green: **49 passed** (`secrets`/`format`/`validation`/`rate-limit`/`optimistic`/`cctv`), 4 RLS integration tests skipped (need live Supabase env).
>
> **2026-07-16 progress:** **Phases 0–5 complete** (see `STATUS.md`). Phase 0 (foundation), 1 (data layer), 2 (auth/RLS/audit) fully verified against code + hosted Supabase; Phase 3 (sites) done; Phase 4 (network) done — device edit (BUS-6), ISP-circuit + VPN-link create flows, per-row Verify/Edit, `CredentialRef`. **Phase 5 (CCTV) implemented this pass** — recorder + camera create/edit (BUS-6 optimistic concurrency), polymorphic maintenance-log form + route, per-row Verify/Edit on the CCTV list, and the per-country retention-below-minimum flag (`isBelowRetention` vs. `country_settings.min_retention_days`). Verified via `tsc`/`lint`/unit tests (49 passed) + code review (not yet driven live in-app). Circuit/VPN **edit** parity intentionally deferred. Next: Phase 6 (dashboard).

---

## Phase 0 — Project foundation & tooling

- [x] **0.1** Next.js 15 App Router + TypeScript + RSC baseline (`next.config.ts` `output: "standalone"`). — verified 2026-07-16: standalone guarded off on Vercel, `typedRoutes` + strict mode, `next ^15.0.0`.
- [x] **0.2** Tailwind config + design tokens wired from `DESIGN.md` (`tailwind.config.ts`, `app/globals.css`). — verified present.
- [x] **0.3** UI primitives: `Button`, `Chip`, `Kpi`, `PageHead`, `Panel`, `Table` (`components/ui/*`). — verified present (+ `VerifyButton`).
- [x] **0.4** App shell: `Sidebar`, `Topbar`, icons, `(app)/layout.tsx`. — verified: `components/layout/{Sidebar,Topbar}.tsx`, `app/(app)/layout.tsx`.
- [x] **0.5** Env contract: `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (service key server-only). — verified: service key marked SERVER ONLY.
- [x] **0.6** `Dockerfile` multi-stage (`node:22-alpine`, standalone, non-root, `PORT=3000`), `.dockerignore`. — verified: non-root `nextjs` user, standalone copy, `PORT=3000`. Actual image build still tracked in 12.1.
- [x] **0.7a** `.env.local` documented in `README.md` (per-variable scope/description table + Supabase Auth setup). — verified 2026-07-16: 4-var scope table (`README.md:43–48`), invite-only first-login (`README.md:82`), hosted-project seeding, git-ignore warning.
- [x] **0.7b** Live boot against a real Supabase project: `npm run dev` with real `.env.local` + linked/seeded project reaches the app. — confirmed 2026-07-16: login with real credentials succeeded without error.
- [x] **0.8** Lint/typecheck clean: `npm run lint` (0 warnings/errors) + `tsc --noEmit` both pass. Fixed `no-page-custom-font` by moving Google Fonts to `next/font/google` (`app/layout.tsx`); font-family tokens now owned by next/font, removed from `app/globals.css`.

## Phase 1 — Data layer (migrations & seed)

- [x] **1.1** Enums: `user_role`, `country_code`, `circuit_type`, `device_type`, `camera_type`, `camera_status`, `vpn_status` (`0001_init.sql`). — verified 2026-07-16: all 7 present (`0001:10–16`).
- [x] **1.2** Core tables: `profiles`, `sites`, `isp_circuits`, `network_devices`, `ip_schemes`, `vlans`, `vpn_links`, `cctv_recorders`, `cctv_cameras`, `maintenance_logs`, `audit_log`. — verified: all 11 present.
- [x] **1.3** Gap tables/columns from finalize Part D: `country_settings` (`min_retention_days`=30, `review_cycle_months`=6), `sites.currency char(3)`, `sites.archived_at`, `vpn_links.peer_site_id`, `attributes jsonb` on devices + cameras. — verified: all present (`0001:37,46,51,145,98,185`).
- [x] **1.4** Common columns on inventory tables: `id`, `created_by default auth.uid()`, `created_at`, `updated_at` (trigger), `last_verified_at`. — verified: present on all 8 inventory tables.
- [x] **1.5** `maintenance_logs` check constraint restricting `target_table` to `network_devices | cctv_recorders | cctv_cameras` (finalize D.4) — verified present (`0001_init.sql:206-207`, constraint `maintenance_target_valid`).
- [x] **1.6** `updated_at` maintenance trigger applied to every inventory table — verified present (`0001_init.sql:236-247`, loop over all 8 inventory tables; `maintenance_logs`/`audit_log` correctly excluded as immutable).
- [x] **1.7** Seed: 4 countries + `country_settings` defaults; Malaysia (`MY`) sample sites/devices/cameras only (`seed.sql`). — verified: 4 countries @ 30/6, MY pilot (1 site / 2 devices / 1 recorder / 4 cameras / 3 VLANs / maint log). Note: MY block has no conflict guard — seed once only (documented in README).
- [x] **1.8** Confirm migrations apply cleanly from empty DB via Supabase CLI (`supabase db reset`). — confirmed 2026-07-16 via hosted apply: migrations 0001–0004 applied to the linked Supabase project and the app boots + login succeeds (0.7b). Local `supabase db reset` (CLI + Docker) not re-run in this env.

## Phase 2 — Auth, RLS & audit (security core)

- [x] **2.1** Supabase clients: `createBrowserClient`, `createServerClient` (cookie/JWT → RLS), `createAdminClient` (service role, invite route only). — verified 2026-07-16: `lib/supabase/{client,server,admin}.ts`; admin server-only with missing-key guard + BUS-3 note.
- [x] **2.2** Middleware refreshes session + gates `/app/**` (`middleware.ts`, `lib/supabase/middleware.ts`). — verified: auth-only gate (RLS is authz), recovery-route allowlist.
- [x] **2.3** RLS helper fns `current_role_is_hq()`, `current_country()` — `SECURITY DEFINER`, `stable`, read `profiles` by `auth.uid()`. — verified `0002:9–24` (+ `set search_path = public`).
- [x] **2.4** RLS policies (deny-by-default, RLS enabled on every table): `sites` by country; child tables scoped via parent `site_id`; `cctv_cameras` via recorder→site; `audit_log` select for `hq_admin` only, no insert/update/delete policies (`0002_rls.sql`). — verified: RLS on all 12 tables; audit has select-only policy.
- [x] **2.5** Audit: `SECURITY DEFINER` trigger writing `actor/action/table_name/record_id/diff(jsonb)` on insert/update/delete (`0003_audit.sql`). — verified: changed-keys-only diff on UPDATE, applied to 9 tables.
- [x] **2.6** Login flow end-to-end: `(auth)/login` form → `auth/callback` → redirect to dashboard; invalid creds handled. — verified: `LoginForm` (`signInWithPassword`, error surfaced, `redirectedFrom`), `auth/callback/route.ts` (code exchange, `safeInternalPath`). Confirmed live in 0.7b.
- [x] **2.7** Invite-only confirmed: public signup disabled in Supabase Auth settings (document in `README.md`). — confirmed 2026-07-16: "Allow new users to sign up" turned off in the hosted dashboard; README documents the toggle + redirect URL setup.
- [x] **2.8** Password recovery flow: `(auth)/forgot-password` (`resetPasswordForEmail` → neutral confirmation) + `(auth)/reset-password` (`updateUser`, min-8 + confirm, invalid/expired-link state) via existing `auth/callback`; "Forgot password?" link on login; middleware `isRecoveryRoute` allowlist. — `app/(auth)/forgot-password/*`, `app/(auth)/reset-password/*`, `app/(auth)/login/LoginForm.tsx`, `lib/supabase/middleware.ts`. Requires Supabase SMTP + redirect URLs configured.

## Phase 3 — Sites registry (Story 1) — ✅ done

- [x] **3.1** Sites list page grouped by country with per-country site count; archived hidden by default (`?archived=1` toggle). — `app/(app)/sites/page.tsx`
- [x] **3.2** `siteSchema` (Zod) — country, name, address, timezone (IANA default per country), contact fields, notes, currency default by country. — `lib/validation/site.ts`
- [x] **3.3** Site create form (RHF + Zod resolver, country → TZ/currency prefill) + `POST /api/sites` route (RLS-scoped insert). — `sites/SiteForm.tsx`, `sites/new/page.tsx`, `api/sites/route.ts`
- [x] **3.4** Site edit + archive/restore (`archived_at` soft delete, no hard delete). Edit PATCH now uses `updated_at`-based optimistic concurrency (BUS-6 → `409` on concurrent change) and routes DB errors through `dbErrorResponse` + try/catch. — `sites/[id]/edit/page.tsx`, `sites/SiteForm.tsx`, `sites/ArchiveButton.tsx`, `api/sites/[id]/route.ts`, `lib/api/optimistic.ts`
- [x] **3.5** Site detail page: child inventory (circuits, devices, IP scheme, VPN, recorders) + verify/edit/archive actions + `last_verified_at`. — `sites/[id]/page.tsx`
- [x] **3.6** Country view `countries/[code]` — fixed "New site" link (→ `/sites/new`), site names link to detail; added "Sites" sidebar nav.
- [x] **3.7** (2026-07-22) Country view rebuilt as a **per-country dashboard** grouped by the MODULES sections — KPI row + Network / CCTV / Renewals / Sites, each scoped to that country's sites (children via `.in("site_id", siteIds)`, cameras via recorder ids). Per-country `country_settings` drives retention + staleness; 50-row fetch cap, 8-row previews with "view all" links, `.error` degradation. Sidebar no longer lists Dashboard/Sites (routes still live). — `countries/[code]/page.tsx`, `components/layout/Sidebar.tsx`

## Phase 4 — Network module (Story 2)

- [x] **4.1** Network list page: devices + circuits tables, stale flag, paginated at 50. — verified 2026-07-16: both tables `.limit(50)`, device stale chip, per-row Edit + Verify, create buttons for device/circuit/VPN. — `network/page.tsx`
- [x] **4.2** Device create: `DeviceForm` + `POST /api/devices` (RLS + secrets guard). — `network/new/*`, `api/devices/route.ts` via `createResourceRoute`.
- [x] **4.3** Device edit + per-row "Verify — still accurate" wired to verify route. — `DeviceForm` edit mode + `PATCH /api/devices/[id]` (BUS-6 optimistic concurrency, `409` on conflict, not-found handling), edit page `network/[id]/edit`, `VerifyButton` per row on the list.
- [x] **4.4** ISP circuits: `ispCircuitSchema`, create form + `POST /api/circuits` (provider, circuit_id, bandwidth, type, static_ips[], contract start/end, monthly_cost, support_phone). — `network/circuits/new/*`, `api/circuits/route.ts`. static_ips collected as free text, split + server-validated. (Circuit *edit* deferred — parity with device edit when needed.)
- [x] **4.5** IP schemes + VLANs: `ipSchemeSchema`/`vlanSchema`, per-site editor (subnets, gateway, DNS, DHCP range, VLAN table) + routes. — `lib/validation/network.ts`, `sites/[id]/network/page.tsx` + `IpSchemeForm.tsx`/`VlanForm.tsx`, `api/ip-schemes/route.ts`, `api/vlans/route.ts`; entry from site detail "IP schemes" panel.
- [x] **4.6** VPN/WAN links: `vpnLinkSchema`, form + route; `peer_site_id` FK selector or free-text `peer`, tunnel_type, status. — `network/vpn/new/*`, `api/vpn-links/route.ts`. `peer_site_id` empty→NULL normalisation added to the schema.
- [x] **4.7** `credential_ref` UX: labeled "link to password manager entry", render URL as `target=_blank rel=noopener`, plain text otherwise. — input help text on `DeviceForm`; `components/ui/CredentialRef.tsx` renders http(s) as `target=_blank rel="noopener noreferrer"`, other schemes/labels as plain mono text; consumed in the site detail devices table.

## Phase 5 — CCTV module (Story 3) — ✅ done

- [x] **5.1** CCTV list page: recorders + cameras with status chips, paginated at 50; per-row **Edit** + **Verify**, "+ Recorder / + Camera / + Maintenance" create actions, and KPI row (recorders, active/total cameras, faulty/offline, below-retention). — `cctv/page.tsx`
- [x] **5.2** Recorders: `recorderSchema`, create **and** edit form + `POST /api/recorders` / `PATCH /api/recorders/[id]` (brand, model, channels, storage_tb, retention_days, firmware, mgmt IP, location, notes). Edit uses BUS-6 optimistic concurrency (409 on conflict) + not-found handling. — `cctv/recorders/new/*`, `cctv/recorders/[id]/edit`, `api/recorders/*`
- [x] **5.3** Cameras: `cameraSchema`, create **and** edit form + `POST /api/cameras` / `PATCH /api/cameras/[id]` (label, location_desc, type, resolution, outdoor, status, notes) — scoped to a recorder (recorder picker). Edit uses BUS-6. — `cctv/cameras/new/*`, `cctv/cameras/[id]/edit`, `api/cameras/*`
- [x] **5.4** Maintenance logs: `maintenanceLogSchema`, polymorphic log-event form + `POST /api/maintenance-logs` (date, action, performed_by, next_due) on `target_table`/`target_id`. One combined RLS-scoped picker spans devices + recorders + cameras (encoded `table:id`, split on submit). — `cctv/maintenance/new/*`, `api/maintenance-logs/route.ts`
- [x] **5.5** Retention-below-minimum flag: `isBelowRetention` compares recorder `retention_days` to the effective minimum — per-country `country_settings.min_retention_days` (joined via recorder→site), falling back to the company default (30). Surfaced as a danger chip in the recorders table + a KPI. Null retention not flagged. — `lib/utils/cctv.ts`, `cctv/page.tsx`, `tests/cctv.test.ts`

## Phase 6 — Dashboard & country cards (Story 3 & 5) — ✅ done

- [x] **6.1** Landing dashboard: global KPI row + per-country cards + attention panels (retention, renewals), RLS-scoped (country managers see only their country). — `dashboard/page.tsx`
- [x] **6.2** Per-country cards: site count, device count, camera health (active/total + faulty), circuits expiring ≤90d, stale records (past review cycle). Camera→country resolved via camera→recorder→site; card title deep-links to `countries/[code]`. — `dashboard/page.tsx`
- [x] **6.3** CCTV totals (recorders/cameras per country) + retention-below-minimum surfaced as a per-country danger chip and a global attention panel. — `dashboard/page.tsx`
- [x] **6.4** Stale computation uses per-country `country_settings.review_cycle_months` (fallback `DEFAULT_REVIEW_CYCLE_MONTHS`=6), not a hardcoded value. — `reviewMonthsFor()` in `dashboard/page.tsx`

## Phase 7 — Global search (Story 5)

- [~] **7.1** `pg_trgm` GIN indexes on searchable columns (`0004_search.sql`).
- [x] **7.2** `search_registry(q text)` SQL function running **as caller** (RLS-scoped), returning `(type, id, label, country_code)` — confirmed `security invoker` + `set search_path` (SEC audit), called via `supabase.rpc` in `search/page.tsx`.
- [~] **7.3** Search page: query box → grouped-by-type results (`search/page.tsx`, `hrefFor` deep-links per type). <500ms budget on <10k dataset not yet measured.
- [x] **7.4** Empty/short-query, no-results, and RPC-failure states all handled (`search/page.tsx` — <2 chars, "No matches", "temporarily unavailable" per ROB-4).

## Phase 8 — Renewals view (Story 6) — ✅ done

- [x] **8.1** Renewals page scaffold (`renewals/page.tsx`).
- [x] **8.2** Query `isp_circuits.contract_end` + `network_devices.warranty_end` within 30/60/90 window, sorted asc, filterable by country. Country resolved through parent site (circuit/device → `site_id` → `country_code`); RLS-scoped queries + ROB-5 `.error` guard degrades to a "temporarily unavailable" state. — `renewals/page.tsx`
- [x] **8.3** Window selector + country filter UI wired. Window pills (30/60/90) and country pills (HQ sees All + 4 codes; a country manager sees only their own) both preserve the other filter via `withCountry()`; a Country column added to the table. — `renewals/page.tsx`

## Phase 9 — Roles, audit view & user management (Story 4) — ✅ done

- [x] **9.1** Users page + `InviteForm` — HQ-admin-only (redirect-gated), profiles list (name/role/country/added) + invite panel. — `users/page.tsx`, `users/InviteForm.tsx`
- [x] **9.2** `POST /api/invite` using `createAdminClient` (service role, server-only) — assigns `role` + `country_code`, invite email + profile insert with auth-user rollback on failure. — `api/invite/route.ts`
- [x] **9.3** Invite route enforces HQ-admin-only (`actor?.role !== "hq_admin"` → 403) + `inviteUserSchema.safeParse` validation; writes an explicit `audit_log` entry for the acting admin (BUS-2). — `api/invite/route.ts`
- [x] **9.4** Audit log page (`audit/page.tsx`) — HQ-admin-only, redirect-gated.
- [x] **9.5** Audit view: HQ-admin-only, immutable list of actor/action/table/record/**diff**/time, **paginated** (50/page, `?page=N`, exact count + Newer/Older links). Diff rendered via expandable `DiffCell` (changed-field names inline, raw JSON on expand); actor UUIDs resolved to profile names on the visible page; `.error` guard degrades to "temporarily unavailable". — `audit/page.tsx`, `audit/DiffCell.tsx`
- [x] **9.6** UI hides actions a user can't perform (never relied on for security — RLS is source of truth): sidebar hides the Administration group (Users/Audit) for non-HQ (`Sidebar.tsx` `isHq`); both admin pages redirect non-HQ to `/dashboard`; Countries nav scoped to the manager's own country. Country managers' create/edit/verify/archive stay visible (RLS permits within their country).

## Phase 10 — Cross-cutting concerns

- [~] **10.1** Secrets guard: `containsPossibleSecret(text)` util used in Zod `.refine()` on `notes`/`credential_ref`/free-text (`lib/utils/secrets.ts`).
- [ ] **10.2** Apply secrets guard across all mutation schemas (network, cctv, site).
- [x] **10.3** Verify action route `POST /api/verify` + reusable `components/ui/VerifyButton.tsx` — wired into site detail, the network device list (4.3), **and the CCTV recorders + cameras lists** (5.1).
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
