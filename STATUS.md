# STATUS — Corp Management Platform (MVP v1.0)

| Field | Value |
|---|---|
| **Last updated** | 2026-07-16 (Phase 9) |
| **Source of truth** | `TASKS.md` (phase-by-phase subtasks) |
| **Build health** | `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · unit tests **49 passed**, 4 RLS integration skipped (need live Supabase env) |

> High-level rollup of `TASKS.md`. When a phase's status changes, update both files.

## Latest change (2026-07-22) — Sites list drops the archived toggle

- Removed the **Show archived / Hide archived** button from the Sites module header (`app/(app)/sites/page.tsx`); the header action is now a single **+ New** button (relabelled from "+ New site", matching the country dashboards). The page no longer reads `searchParams`, so `?archived=1` does nothing — archived sites are always filtered out (`.is("archived_at", null)` is now unconditional).
- `archived_at` dropped from the select and the now-unreachable **Archived** chip removed from the Status cell; the chip is Stale/Fresh only.
- `SiteForm`'s create submit label is now **Save** (was "Save site"); edit mode still reads "Save changes". All six forms now submit with the same **Save** label.
- **Caveat:** archived sites are no longer reachable from the list, so restoring one needs its detail URL directly. Archive/restore itself is untouched.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — Network New dropdown + a dedicated Firewall form

- Network `PageHead` actions are now one ghost **New** `DropdownMenu` (same component as CCTV) with **New circuit** → `/network/circuits/new` and **New Firewall** → `/network/firewalls/new`; the two separate `+ Circuit` / `+ VPN link` buttons are gone.
- New route `app/(app)/network/firewalls/new/page.tsx` renders the shared `DeviceForm` with a new `fixedType="firewall"` prop — a firewall is a `network_devices` row with `device_type='firewall'`, so it reuses the same columns, RLS-scoped site list and `POST /api/devices`. No schema change. With `fixedType` the Type select renders disabled for context and the value submits from a hidden registered input.
- Submit labels normalised to **Save** on `CircuitForm`, `VpnForm` and `DeviceForm` (create); edit mode still reads "Save changes".
- VPN link **creation is retired**: `app/(app)/network/vpn/` (page + `VpnForm`) and `app/api/vpn-links/route.ts` are deleted. Existing rows still **read** fine — the site detail VPN links panel, the country dashboard "VPN links" stat, the `vpn_links` table, its RLS/audit policies, the `verify` allowlist and `vpnLinkSchema` all remain; nothing in the app can insert one now.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **49 passed**, 4 RLS skipped.

## Earlier change (2026-07-22) — Location column dropped from both camera tables

- Removed the **Location** column (header + `location_desc` cell) from the camera tables on `app/(app)/cctv/page.tsx` and `app/(app)/countries/[code]/page.tsx`, and dropped `location_desc` from both camera selects. No `colSpan` to adjust.
- `location_desc` now has no reader and no writer in the app; the column, its Zod field, and the `CameraForm` `defaultValues` passthrough remain so stored values survive edits.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — camera form: Site select replaces the Location field

- `CameraForm` now opens with the recorder form's **Site** select (`{country_code} · {name}`, `Select a site…`, required) in the old Recorder slot; **Recorder** moved into the slot the free-text **Location** field used to occupy, and that field is gone.
- Cameras have no `site_id` of their own (they inherit one via recorder), so Site is local `useState`, not a form value: it scopes the recorder options to that site and clears `recorder_id` on change. Recorder is disabled until a site is picked ("Select a site first…"), and shows "No recorders on this site yet." when the site has none. Edit mode seeds Site from the camera's current recorder.
- `location_desc` stays in the Zod schema, DB, edit values and the CCTV/country camera tables — it's just no longer editable; it's kept in `defaultValues` so an edit round-trip doesn't drop an existing value. **Nothing in the UI can set it now.**
- Both pages fetch sites and select `site_id` on recorders: `cctv/cameras/new/page.tsx` (now a `Promise.all`) and `cctv/cameras/[id]/edit/page.tsx`.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **49 passed**, 4 RLS skipped.

## Earlier change (2026-07-22) — country dashboards drop the New dropdown

- Removed the `+ New` `DropdownMenu` (New site / New network device / New CCTV recorder) from the `PageHead` actions in `app/(app)/countries/[code]/page.tsx` — one file, so all four country dashboards lose it. Unused `DropdownMenu` import dropped; the CCTV dashboard's own **New** dropdown is untouched.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — recorder form adopts the device-form pattern

- `RecorderForm` now matches the other forms: props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; own `PageHead` inside `<form>` with **Cancel / Save** (edit: **Save changes**) in the header actions; fields wrapped in `Panel`. Bottom action bar + audit-log hint gone; server error renders in the actions row. Grid → `gap-x-4 gap-y-0` + `px/pt-[18px] pb-[1px]`; `Field` uses the absolute `pb-[17px]` message strip (error wins over help).
- Both pages are now thin fetch-and-delegate wrappers: `cctv/recorders/new/page.tsx` and `cctv/recorders/[id]/edit/page.tsx` dropped `PageHead`/`Panel`/`PanelHeader` ("Recorder details") and `max-w-3xl`. Create dropped `eyebrow="CCTV"`; edit keeps it — same split as the camera pages.
- This was the last form still on the old layout; all six (device, site, circuit, VPN, camera, recorder) now share the pattern.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — maintenance log form removed from CCTV

- Deleted `app/(app)/cctv/maintenance/**` (`page.tsx` + `MaintenanceLogForm.tsx`) and dropped the **+ Maintenance** action from the CCTV dashboard `PageHead`; subtitle is now "Recorders, cameras, and retention." No other UI linked to the route.
- The CCTV header action is now a `DropdownMenu` (`label="New"`, `sm`, `variant="ghost"`) with **New recorder** → `/cctv/recorders/new` and **New camera** → `/cctv/cameras/new` — same reusable component as the country dashboard, so it also restores the only UI entry point to the recorder create page. `CameraForm`'s create submit label is now **Save** (was "Save camera"; edit still reads "Save changes").
- Also deleted `app/api/maintenance-logs/route.ts` and `maintenanceLogSchema`/`MaintenanceLogInput` from `lib/validation/cctv.ts` (plus the now-unused `optionalDate` import).
- Left in place: the `maintenance_logs` table + RLS/audit migrations and `MAINTENANCE_TARGETS` in `lib/constants/enums.ts` (still used by `Database` types). No app code writes maintenance logs now.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **49 passed**, 4 RLS skipped.

## Earlier change (2026-07-22) — camera form adopts the device-form pattern

- `CameraForm` now matches the other forms: props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; own `PageHead` inside `<form>` with **Cancel / Save camera** (edit: **Save changes**) in the header actions; fields wrapped in `Panel`. Bottom action bar + audit-log hint gone; server error renders in the actions row. Grid → `gap-x-4 gap-y-0` + `px/pt-[18px] pb-[1px]`; `Field` uses the absolute `pb-[17px]` message strip (error wins over help).
- `cctv/cameras/new/page.tsx`: the **no-recorders empty state** (with its "add a recorder" link) keeps its own `PageHead` + `Panel`/`PanelEmpty`; otherwise the page just renders `<CameraForm …/>`. `cctv/cameras/[id]/edit/page.tsx` is thin and keeps `eyebrow="CCTV"`. Both dropped the "Camera details" `PanelHeader` and `max-w-3xl`; create also dropped its eyebrow.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — maintenance form adopts the device-form pattern

- `MaintenanceLogForm` now matches the other forms: props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; own `PageHead` inside `<form>` with **Cancel / Log maintenance** in the header actions; fields wrapped in `Panel`. Bottom action bar + audit-log hint gone; server error renders in the actions row. Grid → `gap-x-4 gap-y-0` + `px/pt-[18px] pb-[1px]`; local `Field` gains the absolute `pb-[17px]` message strip (and a `help` slot, unused so far).
- `cctv/maintenance/new/page.tsx`: the **no-assets empty state** keeps its own `PageHead` + `Panel`/`PanelEmpty` (nothing to submit, so no form/actions); otherwise the page just renders `<MaintenanceLogForm …/>`. Dropped `PanelHeader` ("Maintenance event"), `max-w-3xl`, and `eyebrow="CCTV"`. The `preset` prop is unchanged (still no caller).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — VPN form adopts the device-form pattern

- `VpnForm` now matches `DeviceForm`/`SiteForm`/`CircuitForm`: props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; own `PageHead` inside `<form>` with **Cancel / Save** in the header actions; fields wrapped in `Panel`. Bottom action bar + audit-log hint gone; server error renders in the actions row.
- Grid → `gap-x-4 gap-y-0` + `px/pt-[18px] pb-[1px]`; `Field` uses the absolute `pb-[17px]` help/error strip (error wins). The long **Peer (free-text)** help was split: it now reads "HQ or an external endpoint.", and the pointer to the registry moved onto **Peer site** as its own help ("Use this when the peer is a registered site.") — the strip truncates, so one sentence per field.
- `network/vpn/new/page.tsx` is thin (fetch → `<VpnForm …/>`); dropped `PageHead`/`Panel`/`PanelHeader`, the "Link details" header, `max-w-3xl`, and `eyebrow="Network"` — full width, title only, like the other create pages.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — circuit form adopts the device-form pattern

- `CircuitForm` now matches `DeviceForm`/`SiteForm`: props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; it renders its own `PageHead` inside `<form>` with **Cancel / Save** in the header actions, and wraps the fields in `Panel`. Bottom action bar + the audit-log hint removed; the inline server error moved into the actions row.
- Grid switched to `gap-x-4 gap-y-0` + `px/pt-[18px] pb-[1px]`, and the local `Field` uses the absolutely-positioned `pb-[17px]` help/error strip (error wins over help) so all rows are equal height. The Static IPs help text was shortened to "Comma or space separated." since the strip truncates; the example lives in the placeholder.
- `network/circuits/new/page.tsx` is thin (fetch → `<CircuitForm …/>`), dropped `PageHead`/`Panel`/`PanelHeader` and the "Circuit details" header. It also **lost `max-w-3xl` and the `eyebrow="Network"`**, matching the other create pages (full width, title only).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — site form adopts the device-form pattern

- `SiteForm` now mirrors `DeviceForm`: new props `title`, `subtitle?`, `eyebrow?`, `panelClassName?`; it renders its own `PageHead` **inside** `<form>` with **Cancel / Save site** in the header actions (title line), and wraps the fields in `Panel` itself. The bottom action bar and its "Saving writes an entry to the audit log." note are gone (audit logging itself unchanged).
- Field layout matched too: single `md:grid-cols-3` grid (was `md:grid-cols-2 xl:grid-cols-3`), `gap-x-4 gap-y-0`, `px/pt-[18px] pb-[1px]`, and the local `Field` renders help/error absolutely inside a fixed `pb-[17px]` strip (error wins over help) so every grid row is equal height. `spanAll` dropped — Notes now uses `span2`, textarea `min-h-[64px]`.
- `sites/new/page.tsx` and `sites/[id]/edit/page.tsx` are thin: they render `<SiteForm …/>` only, no `PageHead`/`Panel`/`PanelHeader` imports. Edit keeps `eyebrow="Sites"`; create has none. Both stay full width. The "Site details" panel header is gone from both.
- The inline server error renders in the actions row. Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — new-site page drops its eyebrow

- `app/(app)/sites/new/page.tsx`: removed `eyebrow="Sites"` from `PageHead`; the page now shows just the "New site" title + subtitle. The site **edit** page (`sites/[id]/edit`) keeps its eyebrow. Same trim previously applied to the new-device page.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — Sites back in the sidebar (MODULES)

- `components/layout/Sidebar.tsx`: added a **Sites** entry as the first item of the **MODULES** group (`/sites`, `SitesIcon`, active on `pathname.startsWith("/sites")`). It carries a count badge — the sum of `siteCounts` over the countries the user can see, so HQ gets the group total and a country manager gets only their own country's count.
- No new data fetching: reuses the `siteCounts` prop the layout already passes for the Countries group. Reverses the earlier nav trim for Sites only; **Dashboard stays out** of the rail.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings). Not driven live in-app.

## Earlier change (2026-07-22) — device form actions sit on the title line

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
- ~~**Maintenance logs** — `MaintenanceLogForm` + `POST /api/maintenance-logs`~~ **removed 2026-07-22** (form, route, and schema deleted; table/RLS retained).
- **CCTV list** — per-row **Edit** + **Verify** on both tables, KPI row, **New** dropdown (recorder / camera).
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
