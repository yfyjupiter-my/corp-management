# STATUS — Corp Management Platform (MVP v1.0)

| Field | Value |
|---|---|
| **Last updated** | 2026-07-16 (Phase 9) |
| **Source of truth** | `TASKS.md` (phase-by-phase subtasks) |
| **Build health** | `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · unit tests **49 passed**, 4 RLS integration skipped (need live Supabase env) |

> High-level rollup of `TASKS.md`. When a phase's status changes, update both files.

## Latest change (2026-07-22) — device form actions sit on the title line

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
