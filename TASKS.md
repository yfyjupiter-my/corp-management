# TASKS — Corp Management Platform (MVP v1.0)

| Field | Value |
|---|---|
| **Source** | `finalize.md` (Ready for scaffold) + `prd.md` (Draft v1.0) |
| **Purpose** | Phase-by-phase implementation breakdown into small, verifiable subtasks |
| **Date** | 2026-07-07 |
| **Status legend** | `[ ]` todo · `[~]` scaffolded / partial · `[x]` done |

> 🔴 **2026-07-28 — Phase 14 removed the role system.** `0006_drop_roles.sql` drops
> `hq_admin` / `country_manager`, so **every authenticated user has full CRUD on all four
> countries**, including the audit log and user creation. Items below that describe role-based
> behaviour (2.4, 2.7, 9.1–9.6, 10.7, 11.1–11.5, 12.4, 13.34) stay ticked as a record of what was
> built, but each carries a ⚠️ amendment where the role removal superseded it. **Phase 14 is the
> current contract; read it before trusting an authorization claim anywhere above it.**
>
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
- [x] ~~**2.3** RLS helper fns `current_role_is_hq()`, `current_country()`~~ — **both dropped by 14.1.**  Original: `current_role_is_hq()`, `current_country()` — `SECURITY DEFINER`, `stable`, read `profiles` by `auth.uid()`. — verified `0002:9–24` (+ `set search_path = public`).
- [x] **2.4** RLS policies (deny-by-default, RLS enabled on every table): `sites` by country; child tables scoped via parent `site_id`; `cctv_cameras` via recorder→site; `audit_log` select for `hq_admin` only, no insert/update/delete policies (`0002_rls.sql`). — verified: RLS on all 12 tables; audit has select-only policy. ⚠️ **Superseded by 14.1** (`0006_drop_roles.sql`): all of these policies were dropped and replaced with `auth.uid() is not null`. RLS is still enabled on all 12 tables and `audit_log` is still select-only, but the country scoping is gone.
- [x] **2.5** Audit: `SECURITY DEFINER` trigger writing `actor/action/table_name/record_id/diff(jsonb)` on insert/update/delete (`0003_audit.sql`). — verified: changed-keys-only diff on UPDATE, applied to 9 tables.
- [x] **2.6** Login flow end-to-end: `(auth)/login` form → `auth/callback` → redirect to dashboard; invalid creds handled. — verified: `LoginForm` (`signInWithPassword`, error surfaced, `redirectedFrom`), `auth/callback/route.ts` (code exchange, `safeInternalPath`). Confirmed live in 0.7b.
- [x] **2.7** Invite-only confirmed: public signup disabled in Supabase Auth settings (document in `README.md`). — confirmed 2026-07-16: "Allow new users to sign up" turned off in the hosted dashboard; README documents the toggle + redirect URL setup.
- [x] **2.8** Password recovery flow: `(auth)/forgot-password` (`resetPasswordForEmail` → neutral confirmation) + `(auth)/reset-password` (`updateUser`, min-8 + confirm, invalid/expired-link state) via existing `auth/callback`; "Forgot password?" link on login; middleware `isRecoveryRoute` allowlist. — `app/(auth)/forgot-password/*`, `app/(auth)/reset-password/*`, `app/(auth)/login/LoginForm.tsx`, `lib/supabase/middleware.ts`. Requires Supabase SMTP + redirect URLs configured.

## Phase 3 — Sites registry (Story 1) — ✅ done

- [x] **3.1** Sites list page grouped by country with per-country site count; archived sites are never listed (the `?archived=1` toggle was removed 2026-07-22). — `app/(app)/sites/page.tsx`
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
- [~] **5.4** ~~Maintenance logs: `maintenanceLogSchema`, polymorphic log-event form + `POST /api/maintenance-logs`~~ — **descoped 2026-07-22**. Form (`cctv/maintenance/*`), route (`api/maintenance-logs`), and schema deleted; the `maintenance_logs` table + RLS/audit migrations remain in the DB for future use.
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

## Phase 9 — Roles, audit view & user management (Story 4) — ✅ done, then largely superseded by Phase 14

> ⚠️ **Read Phase 14 first.** Every "HQ-admin-only" gate below was removed on 2026-07-28, and the
> invite flow was replaced by direct user creation. The items stay as a record of what was built.

- [x] **9.1** Users page + `InviteForm` — HQ-admin-only (redirect-gated), profiles list (name/role/country/added) + invite panel. — `users/page.tsx`, `users/InviteForm.tsx`. ⚠️ **Superseded by 14.3:** `InviteForm` deleted, redirect gate removed, Role/Country columns dropped.
- [x] **9.2** `POST /api/invite` using `createAdminClient` (service role, server-only) — assigns `role` + `country_code`, invite email + profile insert with auth-user rollback on failure. — `api/invite/route.ts`. ⚠️ **Route deleted by 14.3** → `POST /api/users`. The service-role client, the rollback and the BUS-2 audit write all carried over.
- [x] **9.3** Invite route enforces HQ-admin-only (`actor?.role !== "hq_admin"` → 403) + `inviteUserSchema.safeParse` validation; writes an explicit `audit_log` entry for the acting admin (BUS-2). — `api/invite/route.ts`. ⚠️ **Superseded by 14.3:** the check is now `if (!actor) → 403`. The BUS-2 audit write stays.
- [x] **9.4** Audit log page (`audit/page.tsx`) — HQ-admin-only, redirect-gated. ⚠️ **Gate removed by 14.4** — readable by any authenticated user.
- [x] **9.5** Audit view: HQ-admin-only, immutable list of actor/action/table/record/**diff**/time, **paginated** (50/page, `?page=N`, exact count + Newer/Older links). Diff rendered via expandable `DiffCell` (changed-field names inline, raw JSON on expand); actor UUIDs resolved to profile names on the visible page; `.error` guard degrades to "temporarily unavailable". — `audit/page.tsx`, `audit/DiffCell.tsx`. ⚠️ No longer HQ-only; **still immutable** (select-only policy, unchanged by 14.1).
- [x] ~~**9.6** UI hides actions a user can't perform~~ — **void as of 14.4.** There are no per-role actions left to hide: the Administration group, the Countries nav and every module render identically for everyone. Original: sidebar hid Administration for non-HQ, both admin pages redirected non-HQ, Countries nav was scoped to the manager's country.

## Phase 10 — Cross-cutting concerns

- [~] **10.1** Secrets guard: `containsPossibleSecret(text)` util used in Zod `.refine()` on `notes`/`credential_ref`/free-text (`lib/utils/secrets.ts`).
- [x] **10.2** Secrets guard applied across all mutation schemas (2026-07-24). Every **prose** free-text field now runs it: `notes` everywhere (already did), `address`/`contact_name`/`location_desc` (already did), plus **`cctv_recorders.location`** and **`vlans.purpose`**, which were the two uncovered ones. **Deliberately not guarded** — `serial`, `hostname`, `brand`, `model`, `firmware`, `circuit_id`, `bandwidth`, `resolution`, phone fields: these are *identifiers*, not prose, and `looksLikeHighEntropyToken()` fires on any 20+ char run mixing case and digits, which is exactly what a device serial looks like. Guarding them would reject legitimate hardware data.
- [x] **10.3** Verify action route `POST /api/verify` + reusable `components/ui/VerifyButton.tsx` — wired into site detail, the network device list (4.3), **and the CCTV recorders + cameras lists** (5.1).
- [~] **10.4** Formatters/utils: `formatDate`, `isStale`, money+currency, `cn` (`lib/utils/*`).
- [x] **10.5** Money display uses per-site `currency` (2026-07-24). The per-site part was already correct — `formatMoney(c.monthly_cost, site.currency)` on the site detail circuits table is the app's only money render. 🐛 **The formatting was not:** `maximumFractionDigits: 2` with no minimum let Intl's per-currency convention through, and VND/IDR have **zero** default fraction digits — so the column came out ragged, `₫1,200` on one row and `₫1,200.5` on the next. Now pinned to **exactly two digits for every currency**, mirroring the `numeric(12,2)` column. This deliberately overrides currency convention for VND/IDR: the alternative (Intl's default) rounds a stored `1200.50` to `₫1,201`, and a registry must not misreport a figure someone reconciles against a contract. 4 new tests. ✅ **Confirmed live 2026-07-28** — a VND site with circuits at `1200.50` / `1200` / `999999.99` rendered `₫1,200.50` · `₫1,200.00` · `₫999,999.99`; same rows swept through IDR, MYR, THB and USD, all exactly two decimals.
- [x] **10.6** Every table read is now bounded (2026-07-24). **Not a blanket 50** — `lib/constants/limits.ts` defines three caps, because the queries fail differently when truncated: `LIST_PAGE_SIZE` (50) for rendered lists; `AGGREGATE_CAP` (1000) for rows that are *counted or filtered* rather than rendered (dashboard KPIs, renewals windows, sidebar counts) — a 50-cap there would silently report "12 devices" when there are 400; `OPTIONS_CAP` (500) for `<select>` option lists — a truncated site picker makes a site unfileable. Newly capped: dashboard ×5, renewals ×3, users, site-detail ×5 child panels, site-network ×2, app layout, and 11 option lists across 9 form pages. Dashboard/renewals `console.warn` via `isTruncated()` when a cap is actually hit. **Three reads deliberately left uncapped** (commented in place): `country_settings` ×2 (bounded by the 4-value country enum) and the audit actor lookup (`.in()` over one 50-row page). `search_registry` was already `limit 100` in SQL.
- [x] **10.7** 403/empty + `not-found` handling on unauthorized/cross-country access (2026-07-24). Audited all 8 dynamic pages and all 13 API routes. **Two gaps closed:** `cctv/recorders/[id]/edit` and `cctv/cameras/[id]/edit` had `notFound()` on a missing row but **no uuid guard before the query**, so a non-uuid path segment reached Postgres and failed the uuid cast (`22P02`) — a server error where a 404 was wanted. Same defect fixed on the network device edit page 2026-07-23; the `[id]` API routes already guarded. **Third fix — `/countries/[code]` now scopes by role:** RLS already prevented the leak, but a country manager who typed `/countries/TH` got a fully-drawn *empty* Thailand dashboard reading as "Thailand has no assets" rather than "not yours". Now `hq_admin` → any country, anyone else → their own or `notFound()`, mirroring the Sidebar and `/sites`. Cross-country **record** access was already correct everywhere: RLS returns 0 rows → `notFound()`, indistinguishable from a missing id, so a probe cannot confirm a record exists. ✅ **Confirmed live 2026-07-28** as a throwaway MY `country_manager`: `/countries/TH` → HTTP 404 + "Page not found" (control: `/countries/MY` renders in full); a non-uuid segment 404s on **all seven** dynamic edit routes (CCTV recorders/cameras, network, sites, circuits) and a well-formed-but-missing uuid returns the *same* 404; **no `22P02` or 500 in the server log**.

## Phase 11 — Testing & QA

> 🔴 **11.1 / 11.2 / 11.3 / 11.5 were rewritten by 14.5 and must be re-run.** They asserted
> cross-country isolation, which `0006_drop_roles.sql` removed. The 2026-07-28 live pass (89/89)
> validated assertions that no longer exist, so it is **not** evidence for the current suites. The
> new contract: a signed-in user CRUDs every country, `audit_log` stays immutable, and **`anon`
> reads nothing from any of the 12 tables** — that last block is now the only security boundary RLS
> enforces. Env shrank from six `TEST_*` vars to four. Boxes below stay ticked for the *code*; the
> **live run is outstanding** and tracked in 14.6.

- [x] **11.1** RLS integration tests with two seeded users (1 `hq_admin`, 1 `country_manager` MY) asserting cross-country returns empty/denied (`tests/rls.test.ts`). **Run live 2026-07-28 — 4/4 passed.** ⚠️ **The two users (`rls-test-hq@` / `rls-test-my@corp-management.test`) were deleted from the linked project on 2026-07-28, along with `.env.test`** — the suite is back to auto-skipping. The task stays closed on the strength of that run; re-running it (locally or in CI) means re-creating both users first, per `LIVE-ENV.md` §11.
- [x] **11.2** Extend RLS tests to child tables (2026-07-24; **run live 2026-07-28 — passed**). `tests/rls-integration.test.ts` covers circuits, devices, ip/vlan, vpn, recorders and cameras. Self-seeds a `__RLS11_…` VN fixture as HQ (one row per table) so "MY manager sees none of these" is paired with an HQ read proving the row exists — real isolation, not an empty table. Auto-skips without the `TEST_*` env (see `LIVE-ENV.md`). *(maintenance_logs was descoped 2026-07-22, so no test.)*
- [x] **11.3** Audit-log immutability test (2026-07-24; **run live 2026-07-28 — passed**), in the same file. Both HQ and MY manager attempt `update` + `delete` on an `audit_log` row; each assertion **re-reads through HQ** to confirm the row is unchanged, because a missing UPDATE/DELETE policy makes PostgREST return 0 rows and *no error* (the 13.34 gotcha) — "no error" alone would prove nothing.
- [x] **11.4** Zod/secrets-guard unit tests — `tests/secrets.test.ts` (7), `tests/validation.test.ts` (13), `tests/format.test.ts` (13); 33 passed on 2026-07-16.
- [x] **11.5** Search RLS test (2026-07-24; **run live 2026-07-28 — passed**), in `rls-integration.test.ts`. HQ `search_registry(TAG)` finds the VN fixture site; MY manager `search_registry(TAG)` returns 0 rows. Proves `search_registry` really is `security invoker` (RLS-scoped) and not leaking across countries.
- [x] **11.6** QA audits filed + reconciled — `SEC-AUDIT.md`, `CODE-AUDIT.md`, `BUS-AUDIT.md`, `ROB-AUDIT.md` (Security, Code Quality, Business Logic, Robustness). Remediations verified against code 2026-07-16. Runtime and Compliance/a11y audits not yet run.

## Phase 12 — Deployment readiness

- [ ] **12.1** `docker build` produces a runnable standalone image; container starts on `PORT=3000` as non-root. **Still open — Docker is not installed in this environment, so the build has never been run.** Attempted 2026-07-28; instead the Dockerfile's assumptions were checked against a real local `npm run build`, which found a blocker: 🐛 `COPY --from=builder /app/public ./public` would have **failed the build**, because no `public/` directory exists (Docker fails a `COPY` with a missing source, and Next never creates one). Fixed with **`public/.gitkeep`**. ⚠️ Also documented in the Dockerfile: omitting the `NEXT_PUBLIC_*` **build args does not fail the build** — the values are inlined into the client bundle (verified: the URL appears in 3 `page-*.js` chunks), every route is dynamic, so the build succeeds and ships an image whose browser-side Supabase client is `undefined`, unfixable without a rebuild. Verified present for the runner stage: `.next/standalone/server.js`, `.next/static`, `output: "standalone"`. **Left to prove under Docker:** the build itself, BusyBox `addgroup/adduser --system --gid`, boot on `PORT=3000`, and non-root.
- [ ] **12.2** Staging + production Supabase projects (SEA/Singapore region); migrations promoted via CI.
- [~] **12.3** CI (2026-07-24) — **`.github/workflows/ci.yml` written, awaiting repo secrets.** `checks` job runs typecheck/lint/build/unit on every PR with no secrets; the RLS suite lights up when the six `TEST_*` secrets are added (it auto-skips otherwise, so the workflow is safe now). Migrations are applied by a **separate `migrations` job gated to `staging` / manual dispatch** — deliberately *not* on PRs, which would mutate the shared project. Secrets needed listed in `LIVE-ENV.md` §12.3.
- [ ] **12.4** Pre-launch manual pen-test of API routes. 🔴 **Rescoped by Phase 14** — "can a `country_manager` reach another country's data" is void, since cross-country access is now intended. What must be proved instead: (a) every route rejects an unauthenticated request and a forged bearer token; (b) `POST /api/users` needs a session and its rate limit holds — every user can mint accounts now, so the throttle is the only bound on the auth table; (c) `audit_log` still cannot be written or altered through PostgREST, re-reading each attempt because a missing policy returns 0 rows and *no error*; (d) `anon` reads 0 rows from all 12 tables, live. Full scope in `LIVE-ENV.md` §12.4.

## Phase 13 — Internationalization: EN / 繁體中文 switch

> A two-position language switch in the Topbar flipping the whole UI between English and Traditional Chinese. No i18n exists today — every string across **55 `.tsx` files / ~5,000 lines** is hardcoded English.
> **Approach:** cookie + `profiles.locale` persistence, hand-rolled typed dictionary (no new dependency). A `[locale]` URL segment is ruled out — `typedRoutes: true` would mean rewriting every route and `Link href`.
> **Definition of done for any string task:** no English literal remains in the file, both dictionaries carry the key, and `tsc --noEmit` passes.

### 13A — Locale core

- [x] **13.1** `lib/i18n/config.ts` — `LOCALES = ["en","zh-TW"]`, `Locale` type, `DEFAULT_LOCALE`, `LOCALE_COOKIE`, `LOCALE_LABELS` (`EN` / `繁中`), `HTML_LANG` (`en` / `zh-Hant-TW`), `isLocale()` guard. No imports, so it is safe on both sides of the RSC boundary.
- [x] **13.2** `lib/i18n/dictionaries/en.ts` — namespaced `as const` object (`common`, `nav`, `topbar`, `sites`, `network`, `cctv`, `renewals`, `audit`, `users`, `dashboard`, `country`, `search`, `auth`, `forms`, `enums`, `errors`) + `export type Dictionary = typeof en`. Seed with shared strings only (Save / Cancel / Edit / Saving… / Fresh / Stale / nav labels); each later task adds its own keys. **Deviation:** `as const` was dropped — literal value types would force `zh-TW.ts` to repeat the English strings verbatim; widened `string` values still enforce the exact key shape.
- [x] **13.3** `lib/i18n/dictionaries/zh-TW.ts` — `export const zhTW: Dictionary = { … }`. The explicit annotation (not `as const`) is the drift guard: a missing or misspelled key becomes a `tsc` error.
- [x] **13.4** `lib/i18n/server.ts` — `getLocale()` (cookie → default) and `getDictionary()`, for the 38 server components. Lookup itself lives in `lib/i18n/dictionaries/index.ts` (`DICTIONARIES`, `dictionaryFor`) so it stays free of `next/headers` and is usable from middleware/tests.
- [x] **13.5** `lib/i18n/client.tsx` — `"use client"`; `I18nProvider({ dict, locale })`, `useT()`, `useLocale()`, for the 17 client components. Same `t.common.save` shape as the server side. No fallback dictionary — `useT()` outside the provider throws rather than silently rendering English (and keeps `en` out of every client bundle).
- [x] **13.6** Unit test `tests/i18n.test.ts` — recursive key-parity assertion between `en` and `zhTW`, so an accidental `any` cast can't hide drift the type system would otherwise catch.

### 13B — Persistence

- [x] **13.7** `supabase/migrations/0005_locale.sql` — `alter table profiles add column locale text check (locale is null or locale in ('en','zh-TW'))`. **No new RLS policy on `profiles`** (see 13.8).
- [x] **13.8** Same migration: `set_my_locale(p_locale text)` — also raises on an unauthenticated caller (`auth.uid() is null`), `language plpgsql` so it can `raise`. — `security definer`, `set search_path = public`, re-validates the input, updates **only** `locale` for `auth.uid()`; `revoke all from public, anon` + `grant execute to authenticated`. A plain self-update policy would be a **privilege-escalation hole** — RLS cannot restrict columns, so a `country_manager` could set `role='hq_admin'`, which is exactly what `current_role_is_hq()` reads.
- [x] **13.9** `lib/types/database.ts` — add `locale` to the `profiles` `Row`/`Insert` and `set_my_locale` to the schema's `Functions` block.
- [x] **13.10** `lib/actions/locale.ts` — `"use server"` `setLocale(next: string)`: `isLocale()` guard first, set the cookie (`httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` in prod, 1-year `maxAge`), call the RPC (no-op when signed out), `revalidatePath("/", "layout")`. Mirrors `lib/actions/auth.ts`.
- [x] **13.11** `lib/supabase/middleware.ts` (root `middleware.ts` needed no change — it just delegates) — when the locale cookie is absent, read `profiles.locale` for the session user and set the cookie on the response. Precedence **cookie → `profiles.locale` → `en`**; afterwards `getLocale()` is a pure cookie read everywhere, so the extra query costs only a new browser's first request.
- [x] **13.12** `lib/auth.ts` — add `locale` to the `CurrentUser` interface and to the profile `select`.

### 13C — Switch UI & shell

- [x] **13.13** `components/layout/LocaleSwitch.tsx` — client segmented control (two buttons in one pill; active `bg-surface shadow-sm text-fg`, inactive `text-fg-subtle`), `useTransition` + `setLocale` following the logout pattern in `UserMenu.tsx`, disabled while pending. A11y: `role="group"` + `aria-label`, `aria-pressed` and `lang={l}` per button. Existing DESIGN.md tokens only — no new CSS.
- [x] **13.14** `components/layout/Topbar.tsx` — mounted between the search link and the role pill, with `ml-auto` so the pair stays right-aligned. The search link keeps `flex-1 max-w-[440px]`.
- [x] **13.15** `app/layout.tsx` — make it `async`, emit `lang={HTML_LANG[locale]}`, wrap `children` in `I18nProvider`. **Note:** `cookies()` here opts the tree into dynamic rendering; nearly every page is already `force-dynamic`, so the practical cost is `app/not-found.tsx` losing static optimization. Confirm the build output after this task. **Confirmed:** `npm run build` passes and `/_not-found` is now `ƒ` (dynamic); every other route was already dynamic, so that is the whole cost.
- [x] **13.16** `app/globals.css` — added `--font-cjk` plus `--font-{head,body,mono}-stack` composites, and pointed the four `font-family` declarations at them. **`tailwind.config.ts` had to change too** (not in the original plan): its `fontFamily` mapped `font-head`/`font-body`/`font-mono` straight to the bare next/font vars, so utility-class text would still have rendered tofu. The three `next/font` families load `subsets: ["latin"]` and have **no CJK glyphs**. **Do not** pull a CJK family through `next/font/google` — multi-megabyte and it subsets poorly.
- [x] **13.17** Rendered top-right via a new `app/(auth)/layout.tsx` (one file rather than three page edits; the pages keep their own centering). Without it, a user who cannot read English has no way to reach the switch before signing in.

### 13D — String extraction: chrome & shared

- [x] **13.18** `components/layout/Sidebar.tsx` — group labels (Countries / Modules / Administration) + all nav items via `useT()`. Also added a `countries` namespace (VN/TH/ID/MY display names) — `lib/constants/countries.ts` stays untouched, same rule as `enums.ts`.
- [x] **13.19** `components/layout/UserMenu.tsx` — role lines (hoisted to one `roleLine` const, it was duplicated), "Log out", "Signing out…". **Also `Topbar.tsx`** (chrome, not listed separately): search placeholder + role pill; it became `async` and uses `getDictionary()`.
- [x] **13.20** `components/ui/*` — audited all 9: only `VerifyButton` owns literals ("Verify — still accurate" / "Verifying…"), now via `useT()`. `Panel`/`PanelEmpty`/`Chip`/`CredentialRef`/`DropdownMenu`/`PageHead`/`Table`/`Kpi`/`Button` are purely structural — every string is caller-supplied.
- [x] **13.21** Enum labels — add `enums.deviceType` / `circuitType` / `cameraType` / `cameraStatus` / `vpnStatus` to both dictionaries, then replace all **16 `capitalize` spans** across `network/page.tsx` (×2), `cctv/page.tsx` (×2), `countries/[code]/page.tsx` (×4), `sites/[id]/page.tsx` (×2), `audit/page.tsx`, `DeviceForm`, `CameraForm`, `CircuitForm`. `capitalize` is meaningless for Chinese. **`lib/constants/enums.ts` stays untouched** — it mirrors the Postgres check constraints. **Done:** 16 of 17 replaced (the 17th is in the orphaned `network/vpn/new/VpnForm.tsx`, see below). Two extras found beyond the plan's list: the audit `action` chip needed an `enums.auditAction` set (`lower(tg_op)` → insert/update/delete) and the site-detail VPN status chip needed `enums.vpnStatus`. `ap` renders as "Access point", not "AP".

### 13E — String extraction: pages (38 server components)

Same two-line pattern each: `const t = await getDictionary();`, then replace literals in `PageHead` titles/subtitles, `Thead columns`, `PanelHeader`, `PanelEmpty`, chips and links.

- [x] **13.22** `app/(app)/dashboard/page.tsx` + `app/(app)/countries/[code]/page.tsx`. Country names now come from the new `countries` dictionary namespace, so `COUNTRIES[code].name` is no longer rendered anywhere on these pages. Local helper components (`ModuleHead`, `MoreRows`, `ChildPanel`, `DiffCell`) take their strings as props — they sit outside the component that holds `t`.
- [x] **13.23** `app/(app)/sites/page.tsx`, `sites/[id]/page.tsx`, `sites/[id]/network/page.tsx`.
- [x] **13.24** `app/(app)/network/page.tsx` + `app/(app)/cctv/page.tsx` (incl. their `DropdownMenu` item labels).
- [x] **13.25** `app/(app)/renewals/page.tsx` (window + country filter pills) and `app/(app)/search/page.tsx`. The renewals `Renewal.kind` union changed from display strings (`"ISP contract"`) to stable keys (`"contract" | "warranty"`) — a translated label can no longer be used as a comparison value. `search`'s `typeLabel` map became a `(t) => Record<…>` factory.
- [x] **13.26** `app/(app)/audit/page.tsx` + `DiffCell.tsx`, `app/(app)/users/page.tsx` + `InviteForm.tsx`. `DiffCell` takes `showLabel`/`hideLabel` functions rather than assembling "Show N field(s)" from fragments, which does not translate.
- [x] **13.27** `app/(auth)/**` (login, forgot-password, reset-password + their 3 client forms), `app/no-access/page.tsx`, `app/not-found.tsx`. The three auth pages and `no-access`/`not-found` became `async`. **`metadata` became `generateMetadata()`** — a static export cannot read the locale cookie.

### 13F — String extraction: forms, validation, API

- [x] **13.28** The 6 forms — `SiteForm`, `DeviceForm`, `CircuitForm`, `CameraForm`, `RecorderForm`, plus `IpSchemeForm`/`VlanForm`/`ArchiveButton`: `useT()` for field labels, placeholders, help text, submit labels (`Save` / `Save changes` / `Saving…`), Cancel. **Also the 10 create/edit page wrappers** (not listed separately in the plan): they own the `title`/`subtitle`/`eyebrow` props, so leaving them would have left every form heading English. `sites/new/page.tsx` became `async`; the three eyebrows now reuse `nav.sites`/`nav.network`/`nav.cctv`. `forms` grew 6 sub-namespaces — `labels` (47), `ph` (39), `help`, `select`, `actions`, `saveFailed`, `pages`. **Placeholders all moved into the dictionary**, including the technical examples (`Fortinet`, `10.10.0.1`, `FG60F-…`) whose zh values are identical — a half-in/half-out split would have been arbitrary. The camera page's no-recorder empty state was split into a sentence + a link label; the old "No recorders yet — {link} first." does not survive translation.
- [x] **13.29** `lib/validation/*` — the schemas now carry **`v.*` dictionary keys** rather than English text, resolved at render time by `validationMessage(t, msg)` (`lib/i18n/validation.ts`). A schema is built at module scope where there is no request and therefore no locale, so a function-message approach would have meant rebuilding every schema per request. Built-in Zod messages (`Invalid uuid`, `String must contain at most 80 character(s)`) have no `v.` prefix and **pass through untouched** — translating Zod's own catalogue is out of scope, and collapsing them to one generic string would lose detail the English UI has today. `SECRET_GUARD_MESSAGE` was deleted from `lib/utils/secrets.ts`; its text is now `validation.secret`.
- [x] **13.30** The 13 `app/api/**/route.ts` handlers — every `{ error: … }` now comes from `getDictionary()`. The three shared helpers stayed **pure** and take the dictionary as an argument (`dbErrorResponse(error, context, t)`, `rateLimitResponse(rl, t)`) rather than importing `next/headers` themselves, which would have made `lib/api/rate-limit.ts` unusable from its unit test. `CONFLICT_MESSAGE` was deleted from `lib/api/optimistic.ts` → `errors.conflict`; the 5 SQLSTATE messages in `db-error.ts` became keys into `errors.db`. Zod issues surfaced by a route go through `validationMessage()` too, so a 400 from the API reads in the caller's language.

### 13G — Verification

- [x] **13.31** `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ · tests **58 passed**, 4 RLS skipped (2026-07-23). Two tests were added beyond the plan: every `V.*` key must resolve to real text in **both** locales (an unresolved key would silently render the `v.foo` token, which neither `tsc` nor the parity test can see), and built-in Zod messages must pass through unchanged.
- [x] **13.32** Applied to the linked Supabase project via `supabase db push` (2026-07-23).
- [x] **13.33** Live smoke — **run 2026-07-23 in a real browser against `npm run dev` + the linked Supabase project. All items passed.** Driven as a throwaway `hq_admin` (created and deleted via the service role) so the smoke test never touched the real account's preference:
  - **繁中 → whole UI flips, URLs unchanged.** `<html lang>` = `zh-Hant-TW`; `/dashboard`, `/sites`, `/network`, `/cctv`, `/renewals`, `/users`, `/audit`, `/countries/MY`, `/search?q=kl` and the site-detail page all render Chinese — chrome, page heads, table headers, empty states, KPI labels and enum values. The only English left is **data** (site names, hostnames, `Fortinet`, `Cisco Catalyst 9200`) and the audit log's DB identifiers (`sites`, `cctv_cameras`, changed-column names), all correct.
  - **CJK glyphs are real, not tofu.** Computed stack on a sidebar link is `"Source Sans 3", "Source Sans 3 Fallback", "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", "Heiti TC", sans-serif` — the 13.16 `--font-cjk` composite. **`document.fonts.check()` is not a valid test** (it returns `true` for any family name because the browser answers about its fallback); proved instead by advance width — `據` measures **32px** (a full em) against **22.5px** for a guaranteed-missing codepoint, so the glyph is not `.notdef`. Screenshot confirms visually.
  - **`generateMetadata()` works** — tab title reads `Corp Management — 東南亞 IT 資產登錄`.
  - **Validation in Chinese:** blank required name on `/sites/new` → **請填寫據點名稱**, i.e. `validationMessage()` resolved the `v.*` key rather than leaking the token.
  - **Save → redirect works:** created a site, redirected to `/sites/[id]`, detail page and all five child empty states in Chinese. *(Test row deleted afterwards; see the audit note below.)*
  - **Log out → login page stays Chinese**, and its switch works signed-out in both directions. Confirms the 13.10 design: with no session the switch sets **only** the cookie — `profiles.locale` stayed `zh-TW` while the signed-out UI went to EN, exactly as intended.
  - **Second browser, no cookie → Chinese from `profiles.locale`.** A fresh session started with 0 locale cookies and an English login page; after sign-in the middleware (13.11) seeded `locale=zh-TW` and the dashboard came up Chinese. This is the one path that proves the cookie → `profiles.locale` → `en` precedence.
  - **Round trip back to EN** clean — `lang="en"`, cookie `locale=en`, dashboard English.
  - ⚠️ **`audit_log` grew 22 → 24** — the insert and the delete of the one test site. Immutable by design, so those two rows were **left in place** rather than tampered with. No other residue: temp user deleted (profile cascaded), site count back to 4.
- [x] **13.34** Security checks (CLAUDE.md top priority) — **run live 2026-07-23 against the linked project, 9/9 passed.** A throwaway `country_manager` (MY) was created via the service role, driven through the anon key, and deleted afterwards (profile row cascaded; `audit_log` count identical before and after). Every assertion was re-read through the service role, so an RLS no-op (0 rows, **no error**) could not pass as success:
  1. `set_my_locale('en')` succeeds and persists.
  2. `set_my_locale('xx')` raises `22023 invalid locale: xx` and writes nothing; `set_my_locale(null)` likewise.
  3. `update profiles set role='hq_admin' where user_id = auth.uid()` returns **0 rows and no error** — `role` unchanged. PostgREST reports a missing UPDATE policy as an empty result, not a `42501`, so *"no error" is not a pass*; the re-read is what proves it.
  4. A direct `update profiles set locale=…` is also a no-op — `set_my_locale()` is genuinely the only write path.
  5. The manager reads **0** other profile rows and **0** `audit_log` rows.
  6. `anon` calling `set_my_locale` → `42501 permission denied for function set_my_locale` (the `revoke`/`grant` pair holds).
  7. No `audit_log` rows written by any of the above (`profiles` carries no audit trigger — confirmed against the trigger loop in `0003_audit.sql`, which covers 9 inventory tables only).
- [x] **13.35** `STATUS.md` updated and the Phase 13 boxes ticked (2026-07-23). *(This item appeared twice — the duplicate was removed 2026-07-24.)*

> ⚠️ **13.34 assertion 4 is reversed by 14.1.** "A direct `update profiles set locale = …` is a
> no-op, so `set_my_locale()` is the only write path" no longer holds: `profiles` now has an
> authenticated write policy. The escalation that made the RPC necessary is also gone — there is no
> `role` column to escalate into. The RPC still works and is still what the app calls.

**Explicit decisions (reversible):** dates stay `en-GB` and money `en-US` in both locales — they render as data in mono columns, and localizing would touch ~40 call sites for little gain. The switch also appears on the auth pages (13.17), not only the Topbar as literally asked.

---

## Phase 14 — Remove roles: direct user creation, flat CRUD (2026-07-28)

> **Request:** remove "invite a user" from the Users & roles module; an admin creates a user directly
> with no role/permission to assign; **all users can CRUD**.
>
> 🔴 **Security consequence, stated plainly and accepted:** cross-country isolation is gone. Every
> authenticated user reads and writes all four countries' data, reads the audit log, and can create
> further users. RLS stays enabled on all 12 tables but now only distinguishes *signed in* from
> *anon* — it is an authentication boundary, not an authorization one. This runs against the PRD's
> country-scoping story; it was requested, re-confirmed, and implemented as asked.

- [x] **14.1** `supabase/migrations/0006_drop_roles.sql` — drop all 25 role-dependent policies; drop `current_role_is_hq()`, `current_country()` and `can_access_maintenance_target()`; recreate flat `auth.uid() is not null` select/write policies on the 11 mutable tables; `audit_log` gets a select-only policy and **stays immutable** (no insert/update/delete policy — writes still arrive via the `SECURITY DEFINER` trigger in 0003). Then `alter table profiles drop column role, country_code` and `drop type user_role`. `site_country(uuid)` kept (role-free). **`sites.country_code` untouched** — that is data (where a site is), not authorization; only the *profile's* country went away. ✅ **Applied to the linked project 2026-07-28** (`supabase db push`) and verified — see 14.6.
- [x] **14.2** TypeScript schema/auth surface — `USER_ROLES`/`UserRole` removed from `lib/constants/enums.ts`; `CurrentUser` narrowed to `{ id, email, fullName, locale }` and `isHqAdmin()` deleted (`lib/auth.ts`); `profiles` Row/Insert trimmed in `lib/types/database.ts`.
- [x] **14.3** Invite → direct create. **Deleted** `app/api/invite/route.ts` and `users/InviteForm.tsx`. **New** `app/api/users/route.ts` (`admin.auth.admin.createUser({ email_confirm: true })` — no invite mail, so **no SMTP dependency**) and `users/CreateUserForm.tsx` (name / email / password; no role or country picker). `inviteUserSchema` → `createUserSchema` (`email`, `full_name`, `password` 8–72). Carried over from 9.2/9.3 unchanged: the service-role client, the auth-user rollback on a failed profile insert, and the BUS-2 explicit audit write. `inviteLimiter` → `createUserLimiter`, and its rationale changed: it used to bound email sending, now it bounds account creation by *any* user.
  - ⚠️ **72-char password cap is deliberate** — bcrypt truncates past 72 bytes, so a longer value would have its tail silently ignored and the user could not reproduce it from what they typed.
- [x] **14.4** UI de-roling — `Sidebar` shows all four countries and the Administration group to everyone; `Topbar` **lost its role pill entirely** (and with it its `user` prop) since it had nothing left to report; `UserMenu` shows the email in place of the role line. Role branches removed from `dashboard`, `sites`, `renewals`, `countries/[code]` (its 10.7 `notFound()` on a foreign country is gone) and `audit` (redirect gate removed). Dictionary: `nav.users` "Users & roles" → "Users", `users` namespace rebuilt around create-not-invite, and 8 dead keys dropped from **both** locales (`topbar.hqAdmin`/`manager`/`allCountries`, `dashboard.subtitleCountry`, `validation.countryRequired`/`countryForbidden`, `errors.inviteFailed`); new `validation.passwordMin` + `errors.createUserFailed`.
- [x] **14.5** Tests rewritten to the new contract. `validation.test.ts`: the role/country coherence block → 6 `createUserSchema` tests, including one asserting Zod **strips** a `role`/`country_code` sent by a stale client. `rls.test.ts`: cross-country isolation → a signed-in user creating a site in **all four** countries, plus a **12-table `anon` denial sweep** — with roles gone, deny-by-default for the anon key (which ships in the browser bundle) is the only boundary left, so that sweep is the schema's security regression test. `rls-integration.test.ts`: child-table isolation → child-table CRUD through both parent paths, audit immutability retained (still re-reading after each blocked write, per the 13.34 gotcha). CI secrets six → four (`TEST_USER_EMAIL`/`_PASSWORD` replace the HQ/manager pair).
- [x] **14.6** ✅ **Applied and verified live 2026-07-28.** `supabase db push` applied `0006` to the linked project (`0001`–`0005` were already there). Verified rather than assumed — 22 schema/boundary assertions plus **tests 105 passed / 0 skipped**, which is the first time the RLS suites have run against this schema, closing the 11.1/11.2/11.3/11.5 re-run.
  - **Schema:** `profiles` is now `user_id, full_name, created_at, locale`; the one existing row survived the drop with its `locale`; `current_role_is_hq()` / `current_country()` are gone; **`sites.country_code` intact** across all 5 sites (MY/TH/VN/ID).
  - **The boundary that matters:** `anon` reads **0 rows from all 12 tables**, cannot insert a site (`new row violates row-level security policy`), and gets nothing from `search_registry`.
  - **Flat CRUD confirmed:** a throwaway user with no role and no country created a site in **all four** countries and read `audit_log`; its attempt to update an audit row was a **no-op with the row re-read unchanged**, so immutability survived intact.
  - **The blocker is genuinely cleared** — a `profiles` insert with no `role` now succeeds, which is the exact write `POST /api/users` performs and would have failed against the old `not null` column.
  - **Teardown clean:** probe user deleted (0 orphan profiles), sites back to 5, 0 fixture rows left. ⚠️ **Residue: `audit_log` 64 → 99** (+35), immutable by design.
  - ⚠️ **Still not clicked through in a browser** — a second user signing in, seeing four countries, and creating a third from the Users page. Everything below the UI is proven.
  - 🐛 **Unrelated finding:** `tkgoh228@gmail.com` is an **orphaned auth user** (no `profiles` row) — it can authenticate but lands on `/no-access`. Pre-existing, not caused by this change. Delete it or give it a profile.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ (clean `.next`, shared chunk unchanged at 102 kB, `/api/invite` gone and `/api/users` present) · tests **75 passed / 30 skipped** without env, **105 passed / 0 skipped** live.

---

## Dependency order (recommended)

1. **Phase 0–2** (foundation, data, security core) — mostly scaffolded; verify & harden first.
2. **Phase 3** (sites) — root of all records; blocks 4–8.
3. **Phase 4 & 5** (network, CCTV) — can proceed in parallel once sites exist.
4. **Phase 6–8** (dashboard, search, renewals) — depend on populated data.
5. **Phase 9** (roles/audit/users) — needs auth core + at least one mutating flow.
6. **Phase 10** cross-cutting — apply continuously alongside 3–9.
7. **Phase 11–12** — gate before launch.
8. **Phase 13** (i18n) — independent of 10–12, but do it **after** the UI has settled: every new page or form written afterwards must be authored against the dictionary rather than retrofitted. Within the phase the order is strict: 13A → 13B → 13C, then 13D–13F in any order (13.21 needs 13D's enum keys).
