# STATUS — Corp Management Platform (MVP v1.0)

| Field | Value |
|---|---|
| **Last updated** | 2026-07-16 (Phase 9) |
| **Source of truth** | `TASKS.md` (phase-by-phase subtasks) |
| **Build health** | `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · unit tests **49 passed**, 4 RLS integration skipped (need live Supabase env) |

> High-level rollup of `TASKS.md`. When a phase's status changes, update both files.

## Latest change (2026-07-22) — nav trim

- Removed the **Dashboard** and **Sites** entries from the sidebar (`components/layout/Sidebar.tsx`); the rail now starts at the Countries group. Routes `/dashboard` and `/sites/**` are untouched and still reachable (post-login redirect, country cards, search deep links). Icon components remain exported in `icons.tsx`.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

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
- **Maintenance logs** — `MaintenanceLogForm` + `POST /api/maintenance-logs`; one RLS-scoped picker spans devices + recorders + cameras (encoded `table:id`, split on submit); `cctv/maintenance/new`.
- **CCTV list** — per-row **Edit** + **Verify** on both tables, "+ Recorder / + Camera / + Maintenance" actions, KPI row.
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
