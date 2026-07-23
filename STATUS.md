# STATUS — Corp Management Platform (MVP v1.0)

| Field | Value |
|---|---|
| **Last updated** | 2026-07-23 (Phase 13F + first live run) |
| **Source of truth** | `TASKS.md` (phase-by-phase subtasks) |
| **Build health** | `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · unit tests **49 passed**, 4 RLS integration skipped (need live Supabase env) |

> High-level rollup of `TASKS.md`. When a phase's status changes, update both files.

## Latest change (2026-07-23) — CCTV module drops its 4 KPI cards

- `app/(app)/cctv/page.tsx`: removed the `grid-cols-2 md:grid-cols-4` KPI row — **Recorders · Cameras active · Faulty / offline · Below retention**. The page now goes straight from `PageHead` to the Recorders/Cameras panels. `Kpi` import dropped.
- Dead derivations removed with them: `active`, `faulty`, `belowRetention`. **`retentionMin()`, the `country_settings` query and `isBelowRetention` all stay** — the per-row Retention cell still renders a `danger` chip when a recorder is under its country's minimum, so the below-retention signal is not lost, only the roll-up count.
- The four `cctv.kpi*` keys had no other caller and were **removed from both locales** (`en.ts`, `zh-TW.ts`), keeping key parity — same treatment as `sites.view`.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **61 passed**, 4 RLS skipped. Not driven live in-app.

## Earlier change (2026-07-23) — Sites list row action is now **Edit**, matching Network

- `app/(app)/sites/page.tsx`: the last column's `View →` accent link is replaced by the network module's row action — `<Link href={`/sites/${id}/edit`}><Button sm variant="ghost">Edit</Button></Link>` inside a `flex items-center justify-end` cell, identical to `network/page.tsx:90`. Uses the existing `common.edit` key, so no dictionary parity change.
- **The detail page is still reachable** — the site **name** in the first column has always linked to `/sites/{id}`; only the trailing column changed target (detail → edit). `/sites/[id]/edit` already exists.
- `sites.view` had exactly one caller, so the key was **removed from both locales** (`en.ts`, `zh-TW.ts`) to keep key parity and avoid dead entries.
- Column widths unchanged (`34/22/16/16/12%`); the button is right-aligned in the 12% cell.
- Verified: `tsc --noEmit` ✅. Not driven live in-app.

## Earlier change (2026-07-23) — `/sites` shows all four country panels

- **Vietnam and Indonesia now render too.** They were never missing by design — `app/(app)/sites/page.tsx` ended its grouping with `.filter((g) => g.sites.length > 0)`, and both countries have **0 rows**, so their panels were dropped. Filter removed: every visible country gets the same panel, same title format (`Vietnam · 0 sites`), same fixed column widths.
- **Empty country → `PanelEmpty` inside its own panel**, reusing `t.country.noSites(country)` ("No sites registered yet for Vietnam.") + the existing `sites.addFirst` link. No new dictionary keys, so key parity is untouched. The column headers are **not** drawn for an empty country — a header row over nothing reads as a failed load; this matches the country dashboard's convention.
- ⚠️ **Role scoping was required, not optional.** Rendering `COUNTRY_LIST` unconditionally would have shown a `country_manager` four panels including three countries they have no business seeing. The page now calls `getCurrentUser()` and mirrors the **Sidebar** rule: `hq_admin` → all four, anyone else → their own `countryCode` only. RLS is still the boundary — a country that slipped through would render an *empty* panel, never another country's rows.
- The page-level "no sites at all" empty state is kept as the fallback for a user with **no visible country** (no role match / null `countryCode`); it is otherwise unreachable now.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **61 passed**, 4 RLS skipped. ⚠️ **Not driven live** — the role-scoping branch in particular is worth a smoke test as HQ *and* as a country manager.

## Earlier change (2026-07-23) — Thailand's sites table now matches Malaysia's

Screenshot showed the two country panels on `/sites` drawing different layouts. **Two independent causes, both fixed:**

- 🐛 **Blank cells, not missing data.** Chonburi (TH) stores `""` for `address` / `contact_name` / `contact_phone`; Johor Bharu (MY) stores `null`. Both tables rendered `?? "—"`, which **only catches `null`** — so the MY row showed a dash and the TH row showed nothing, and the TH row drew shorter. New **`orDash()`** in `lib/utils/format.ts` treats empty and whitespace-only strings as absent; applied to the sites table on `/sites` **and** on the country dashboard (same data, same bug). Covered by 3 new tests (**61 passed**, was 58).
- 🐛 **Column widths didn't line up between panels.** Each country group renders **its own `<table>`**, and the default auto layout sizes columns to that table's own rows — Thailand's one short site produced narrower SITE/CONTACT columns than Malaysia's long KL address. `components/ui/Table.tsx` gained an opt-in **`Table fixed`** (`table-fixed`) + **`Thead widths`**; `/sites` passes `SITE_COL_WIDTHS = 34/22/16/16/12%`. **Opt-in on purpose** — `Table` is shared by network, CCTV, audit, renewals and search, and forcing fixed layout on all of them was not asked for and would reflow every module.
- ⚠️ The empty-string data itself is untouched — the forms still submit `""` for a blank optional input. `orDash` fixes the *display* everywhere it is used; other modules' tables still use `?? "—"` and would show the same blank cell for an empty-string value. Worth a sweep if it shows up again.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **61 passed**, 4 RLS skipped. Layout not re-driven live — worth a refresh of `/sites` to confirm.

## Earlier change (2026-07-23) — Sites panel titles normalised

- **`/sites` renders one title template for every country** — `${country} · ${siteCount(n)}` (`app/(app)/sites/page.tsx:63`), and always has. Checked against live data: only **TH (1 site)** and **MY (3 sites)** have rows, so those are the only two panels that render — the other two countries are absent because they are empty, not because of a title bug. Column headers come from a single `Thead` call, identical for all countries.
- **Fixed the one real defect in that title:** `country.siteCount` emitted `"1 site(s)"`. EN is now plural-aware — **"Thailand · 1 site" / "Malaysia · 3 sites"**. zh-TW (`${n} 個據點`) is unchanged; Chinese has no plural form.
- **Aligned the odd panel header out:** the country dashboard's Sites panel (`countries/[code]/page.tsx:476`) read just `"3 site(s)"` while its four siblings on the same page read `Devices · 6`, `ISP circuits · 2`, … It is now **`Sites · 3`**, same `label · count` shape, and the failed-query case degrades to `Sites · —` instead of a bare `—`.
- ⚠️ **Panel order on `/sites` is `COUNTRY_LIST` order (VN, TH, ID, MY), not alphabetical** — so Thailand sorts above Malaysia. Left as-is: it mirrors the `country_code` enum and the sidebar. Say the word if you want the list alphabetised by localised name instead.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `tests/i18n.test.ts` **9 passed** (the function-leaf rule still holds — `siteCount` uses `n` in both branches). Not driven live in-app.

## Earlier change (2026-07-23) — Verify feature deleted (component + API route)

- **Deleted `components/ui/VerifyButton.tsx` and `app/api/verify/` (`route.ts`).** Both had zero callers after the three button removals below. `/api/verify` no longer exists as a route, and with it the 8-table `VERIFIABLE` allow-list.
- ⚠️ **`last_verified_at` is now permanently read-only from the app** on all 8 tables (`sites`, `isp_circuits`, `network_devices`, `ip_schemes`, `vlans`, `vpn_links`, `cctv_recorders`, `cctv_cameras`). Nothing writes it. The column, its RLS/audit policies and the `database.ts` types are untouched, so values persist and keep ageing — every row will eventually read **Stale** with no in-app way to refresh it. Reinstating means restoring the route, not a migration.
- **Deliberately left in place:** the `common.verify` / `common.verifying` dictionary entries in **both** locales (unused now, but key parity is what `tests/i18n.test.ts` enforces — dropping them from one side only would fail) and the Fresh/Stale chips + the dashboard "stale records" KPI, which are reads.
- ⚠️ **`tsc` failed once on a stale artifact, not on the source:** Next's generated `.next/types/app/api/verify/route.ts` still referenced the deleted handler (`TS2307`). Removing that directory cleared it — worth knowing after any route deletion in this repo.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **58 passed**, 4 RLS skipped.

## Earlier change (2026-07-23) — Site detail drops the Verify button: **no Verify action left in the app**

- `app/(app)/sites/[id]/page.tsx`: removed `<VerifyButton table="sites" …/>` from the `PageHead` actions; the row is now **Archive/Restore + Edit**. Import dropped.
- ⚠️ **`components/ui/VerifyButton.tsx` now has zero callers** — with the network and CCTV trims below, nothing in the UI can stamp `last_verified_at` on any table any more. The component, `POST /api/verify` and its 6-table allow-list were **left in place** (deleting them wasn't asked for) — they are dead code pending a decision, alongside `vpnLinkSchema`.
- **Reads are unaffected**: every Fresh/Stale chip, the dashboard "stale records" KPI and `reviewMonthsFor()` still read `last_verified_at`, so existing values keep ageing and rows will drift to **Stale** with no way to clear them.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings). Not driven live in-app.

## Earlier change (2026-07-23) — CCTV module drops the Verify button

- `app/(app)/cctv/page.tsx`: removed **both** per-row `VerifyButton`s — recorders (`cctv_recorders`) and cameras (`cctv_cameras`). Both action cells are now **Edit** only; import dropped.
- Follows the same trim on the network module (below). `VerifyButton` now has **one remaining caller**: the site detail page (`app/(app)/sites/[id]/page.tsx`). The component, `POST /api/verify` and its allow-list are still untouched.
- The recorder Fresh/Stale chip still reads `last_verified_at`; it can no longer be stamped from this page.
- Verified: `tsc --noEmit` ✅. Not driven live in-app.

## Earlier change (2026-07-23) — Network module drops the Verify button

- `app/(app)/network/page.tsx`: removed the per-row **`VerifyButton`** ("Verify — still accurate") from the devices table; the row actions cell is now **Edit** only. Import dropped.
- Scope is the network module only — `VerifyButton` still ships on the **CCTV** module and the **site detail** page, so the component, `POST /api/verify` and its server-side table allow-list are all untouched. `network_devices.last_verified_at` still drives the Fresh/Stale chip on this page; it just can't be stamped from here anymore.
- Verified: `tsc --noEmit` ✅. Not driven live in-app.

## Earlier change (2026-07-23) — Dashboard back in the sidebar (top item)

- `components/layout/Sidebar.tsx`: added a **Dashboard** `NavItem` (`/dashboard`, `DashboardIcon`, active on `pathname.startsWith("/dashboard")`) as the **first item in the rail**, directly under the logo and above the Countries group — outside any group heading, since it isn't a country or a module. No count badge.
- Nothing else was needed: `DashboardIcon` was already exported from `icons.tsx` and `t.nav.dashboard` already existed in **both** dictionaries (EN "Dashboard" / 繁中 "儀表板") — both were left in place when the entry was trimmed on 2026-07-22. No dictionary or i18n change, so the key-parity test is unaffected.
- Reverses the "Dashboard stays out of the rail" decision from the 2026-07-22 nav trim; `/dashboard` was reachable only via post-login redirect until now.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings). Not driven live in-app.

## Earlier change (2026-07-23) — 13.33 live smoke passed: **Phase 13 is complete**

- ✅ **The EN / 繁體中文 switch works end to end in a real browser.** Driven as a throwaway `hq_admin` (created + deleted via the service role) so the smoke test never touched the real account's preference.
- **Every module page flips and URLs never change** — `/dashboard`, `/sites`, `/network`, `/cctv`, `/renewals`, `/users`, `/audit`, `/countries/MY`, `/search`, site detail. Chrome, page heads, table headers, empty states, KPI labels and enum values all render Chinese; `<html lang>` = `zh-Hant-TW` and `generateMetadata()` gives the tab `Corp Management — 東南亞 IT 資產登錄`. The only English left is **data** (site names, hostnames, `Fortinet`) and the audit log's DB identifiers — both correct.
- ⚠️ **CJK glyphs: `document.fonts.check()` is not a valid tofu test.** It returns `true` for *any* family name, because the browser answers about the font it would fall back to — it reported all four CJK families "installed" and would have passed on a broken stack. Proved instead by **advance width**: `據` measures 32px (a full em) against 22.5px for a guaranteed-missing codepoint, so the glyph is not `.notdef`. The 13.16 `--font-cjk` composite is present in the computed stack and a screenshot confirms it visually.
- **Chinese validation message** (blank required field → 請填寫據點名稱, no leaked `v.*` token) · **save → redirect** works · **log out → login page stays Chinese** and its switch works signed-out.
- **The no-cookie case is the one that proves the precedence chain:** a fresh browser started with 0 locale cookies and an English login page; after sign-in the 13.11 middleware seeded `locale=zh-TW` from `profiles.locale` and the dashboard came up Chinese. Round trip back to EN clean.
- **Bonus confirmation of the 13.10 design:** switching while *signed out* set only the cookie — `profiles.locale` stayed `zh-TW` while the UI went EN, exactly as intended (the RPC is skipped with no session).
- ⚠️ **`audit_log` grew 22 → 24** — the insert and delete of one test site. Immutable by design, so those rows were **left in place** rather than tampered with. No other residue: temp user deleted (profile cascaded), sites back to 4.
- **Tooling note:** the `agent-browser` CLI was not installed; it was run via `npx -y agent-browser@0.32.4`, which pulled a Chromium build into the Playwright cache. Nothing was added to the repo or to `package.json`.

## Earlier change (2026-07-23) — 13.34 security checks run live: 9/9 passed

- ✅ **The locale write path holds under a real `country_manager` session.** A throwaway MY manager was created via the service role, driven through the anon key, and deleted afterwards; the profile row cascaded and `audit_log` was identical before and after (22 → 22).
- **What the run proves:** `set_my_locale('en')` succeeds and persists · `set_my_locale('xx')` and `(null)` raise `22023` and write nothing · `update profiles set role='hq_admin' where user_id = auth.uid()` leaves `role` untouched · a direct `update … set locale` is equally a no-op, so the RPC really is the only write path · the manager reads 0 other profiles and 0 `audit_log` rows · **anon** gets `42501 permission denied for function set_my_locale`.
- ⚠️ **Method note worth keeping:** PostgREST reports a missing UPDATE policy as **0 rows with no error**, not a `42501`. A test that only asserts `error !== null` would have *failed* here while the system was secure — and one that asserts "no error" would have *passed* on a real escalation. Every assertion re-reads the row through the service role instead.
- The 13B design decision is now empirically confirmed: **no self-update policy on `profiles`** + a column-scoped `security definer` RPC closes the column-level escalation that RLS cannot express.
- ~~**Still open in Phase 13:** 13.33 and 13.35.~~ **Both closed** — see the entry above.

## Earlier change (2026-07-23) — first live run: RSC boundary fix + VPN orphan deleted

- 🟢 **The app boots and is reachable again** — confirmed in-browser. This was the first time Phase 13 had been driven live at all; every entry below said "not yet driven live", and the run surfaced a real defect immediately.
- 🚫→✅ **"Functions cannot be passed directly to Client Components."** `app/layout.tsx` passed the *resolved dictionary* into the client `I18nProvider`, but interpolating entries are **functions** (`country.title(name)`, `audit.showFields(n)`, `forms.pages.editSiteTitle(name)`) and a function cannot be serialized across the RSC boundary. `I18nProvider` now takes the **locale string** and resolves the dictionary client-side, so only a string is in the payload.
  - **Not a 13F regression** — the provider has been passing functions since 13.15/13.22, when 13E gave the `dashboard`/`country` namespaces their first function entries. 13F merely added the `forms.pages` object that React named in the error.
  - **Second instance, same cause:** `audit/page.tsx` passed `showLabel`/`hideLabel` functions to the client `DiffCell`. `DiffCell` now calls `useT()` itself — cleaner regardless, since the field count is only known inside it.
  - **Tradeoff, measured not assumed:** both dictionaries now ship client-side. Routes with client components went ~130kB → ~140kB First Load JS; the shared chunk is unchanged at 102kB and server-only pages (`/renewals`, `/search`, `/sites`) are untouched at ~103–106kB. This reverses the 13.5 note about keeping `en` out of client bundles; the reasoning is recorded in the provider's doc comment. Shipping only the active locale would need a per-locale dynamic import + Suspense.
  - ⚠️ **The local helpers that take strings as props** (`ModuleHead`, `MoreRows`, `ChildPanel`) are plain functions in server files, not client components — passing `t.country.showing` to them crosses no boundary and is fine. The rule to remember: **only `"use client"` components constrain what a dictionary entry may be.**
- **`InviteForm` rendered raw `v.*` keys** — a genuine 13.29 defect: it showed `errors.*.message` without `validationMessage()`, so its four validation messages would have read `v.fullName` / `v.email`. Fixed; a sweep confirmed no other form was missing the call.
- **The orphaned VPN form is gone** — `app/(app)/network/vpn/` (page + `VpnForm`) and the empty `app/api/vpn-links/` directory deleted; `/network/vpn/new` no longer exists in the route types. VPN link **reads** are untouched as designed (table, RLS/audit policies, site-detail panel, country stat, verify allowlist). `vpnLinkSchema` now has no caller — harmless, but a candidate for the next dead-code sweep. There is now **no English UI left in the app**.
- Verified: `npm run build` ✅ · `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **58 passed**, 4 RLS skipped.
- **Still open in Phase 13:** 13.33 (the rest of the smoke test — actually switching to 繁中, CJK glyph check, a validation message in Chinese, the no-cookie second-browser case). *(13.34 has since been run — see the entry above.)*

## Earlier change (2026-07-23) — Phase 13: 13F forms, validation & API complete (13.28–13.31)

- **String extraction is done.** Every form field, Zod message and API error now comes from the dictionary; the only English left in the app is the orphaned `network/vpn/new/VpnForm.tsx` (see the 13C entry — untracked, its POST target no longer exists, deletion is still your call).
- **Zod messages became keys, not text** (13.29). A schema is built at module scope where there is no request and therefore no locale, so `lib/validation/*` now emits `v.*` tokens (`lib/i18n/validation.ts`) that `validationMessage(t, msg)` resolves at render time — in the form's `Field`, and in the route handler before it responds. Built-in Zod messages carry no `v.` prefix and **pass through untouched**; translating Zod's own catalogue is out of scope, and collapsing them to one generic string would lose detail the English UI has today. `SECRET_GUARD_MESSAGE` was deleted from `lib/utils/secrets.ts` — its text is now `validation.secret`.
- **API errors localise in place** (13.30). All 13 route handlers call `getDictionary()`. The three shared helpers stayed **pure** and take the dictionary as an argument (`dbErrorResponse(error, context, t)`, `rateLimitResponse(rl, t)`) instead of importing `next/headers` themselves — that would have made `lib/api/rate-limit.ts` unusable from its unit test. `CONFLICT_MESSAGE` moved to `errors.conflict`; the 5 SQLSTATE messages in `db-error.ts` became keys into `errors.db`, so the ROB-3 "never leak Postgres internals" guarantee is unchanged — only the lookup target moved.
- **The 10 create/edit page wrappers had to come too** (not in the plan's 13.28 list): they own the `title`/`subtitle`/`eyebrow` props, so leaving them would have left every form heading English. `sites/new/page.tsx` became `async`; the three eyebrows now reuse `nav.sites`/`nav.network`/`nav.cctv`.
- **`forms` grew 6 sub-namespaces** — `labels` (47), `ph` (39), `help`, `select`, `actions`, `saveFailed`, `pages`. **All placeholders went into the dictionary**, including technical examples (`Fortinet`, `10.10.0.1`, `FG60F-…`) whose zh values are identical — a half-in/half-out split would have been arbitrary and re-litigated. The camera page's no-recorder empty state was split into a sentence + a link label; "No recorders yet — {link} first." does not survive translation.
- **Two new tests beyond the plan:** every `V.*` key must resolve to real text in both locales — an unresolved key would silently render the `v.foo` token, which neither `tsc` nor the key-parity test can see — and built-in Zod messages must pass through unchanged.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ · tests **58 passed**, 4 RLS skipped. **Not yet driven live** — 13.33 (smoke) and 13.34 (security checks) are all that remain in Phase 13.

## Earlier change (2026-07-23) — Phase 13: 13E page strings complete (13.22–13.27)

- **Every list, detail, dashboard and auth page now renders from the dictionary.** What is still English: the 6 create/edit **forms** and their page wrappers (13.28), Zod messages (13.29) and API route errors (13.30) — i.e. all of 13F.
- Pages done: dashboard + country dashboard (13.22) · sites list / site detail / site network (13.23) · network + CCTV modules (13.24) · renewals + search (13.25) · audit + `DiffCell` + users + `InviteForm` (13.26) · login / forgot-password / reset-password + their 3 forms, `no-access`, `not-found` (13.27).
- **Dictionary grew to ~260 keys** across 18 namespaces; two new shared ones: **`columns`** (21 table headers reused across modules) and **`countries`** (display names, so `COUNTRIES[code].name` is no longer rendered anywhere).
- **Interpolating entries are functions**, e.g. `country.title(name)`, `audit.pageOf(page, total)`, `renewals.resultCount(n, days)`. Composing them from JSX fragments does not survive translation — Chinese puts the count and the noun in a different order. `tests/i18n.test.ts` was extended to match: a function leaf must take at least one argument and **must include every argument in its output**, so a translation that silently drops an interpolated value fails the suite.
- **Four structural changes the string swap forced**, each a latent bug if left alone:
  - `renewals`: `Renewal.kind` was the union `"ISP contract" | "Device warranty"` and was compared by value to pick the chip tone. Now `"contract" | "warranty"` — a translated label cannot double as a comparison key.
  - `DiffCell`: assembled "Show N field(s)" from `{open ? "Hide" : "Show"}` + a pluralising ternary. Now takes `showLabel`/`hideLabel` functions.
  - `search`: `typeLabel` was a module-level `Record`; now a `(t) => Record<…>` factory, since module scope has no dictionary.
  - Local helpers (`ModuleHead`, `MoreRows`, `ChildPanel`, `PageLink`) take their strings as props — they are declared outside the component that holds `t`.
- **`app/layout.tsx`: static `metadata` → `generateMetadata()`** — a static export cannot read the locale cookie, so the browser-tab title would have been stuck in English.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ · tests **56 passed**, 4 RLS skipped. **Not yet driven live.**

## Earlier change (2026-07-23) — Phase 13: 13D chrome & shared strings complete (13.18–13.21)

- **`0005_locale.sql` has been applied** to the linked Supabase project (`supabase db push`, 2026-07-23) — 13.32 done, and the app is runnable again.
- **The switch now visibly changes the UI.** Everything outside the page bodies flips language: sidebar groups + nav + brand tagline, the user menu, the Topbar search placeholder and role pill, every Verify button, and all enum values in tables and selects. Page titles/subtitles and form fields are still English — that's 13E/13F.
- **`Sidebar.tsx`** (13.18) — group labels and all nav items via `useT()`. Added a **`countries` namespace** (VN/TH/ID/MY) so the 國家 group doesn't list "Vietnam"; `lib/constants/countries.ts` stays untouched, same rule the plan set for `enums.ts`.
- **`UserMenu.tsx`** (13.19) — role line hoisted to a single `roleLine` const (it was duplicated in the panel and the button), plus Log out / Signing out…. **`Topbar.tsx`** went with it (chrome, not a separate task): it is now `async` and uses `getDictionary()` for the search placeholder and role pill.
- **`components/ui/*`** (13.20) — audited all 9. Only `VerifyButton` owns literals; the other eight (`Panel`/`PanelEmpty`/`Chip`/`CredentialRef`/`DropdownMenu`/`PageHead`/`Table`/`Kpi`/`Button`) are purely structural, every string caller-supplied. Nothing to translate there, now or later.
- **Enum labels** (13.21) — `enums.{deviceType,circuitType,cameraType,cameraStatus,vpnStatus,auditAction}` added to both dictionaries and **16 of the 17 `capitalize` spans replaced** across `network/page.tsx`, `cctv/page.tsx`, `countries/[code]/page.tsx`, `sites/[id]/page.tsx`, `audit/page.tsx`, `DeviceForm`, `CameraForm`, `CircuitForm`. The `capitalize` class is gone with them — labels now carry their own casing. **Two cases the plan missed:** the audit `action` chip (needed `auditAction`, from `lower(tg_op)`) and the site-detail VPN status chip (needed `vpnStatus`). `ap` reads "Access point" rather than "AP".
- ⚠️ **The 17th `capitalize` is in `app/(app)/network/vpn/new/VpnForm.tsx`** — the untracked orphan flagged below. Left untranslated deliberately: touching it would muddy the decision to delete it. It is the only English enum rendering left in the app.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ · tests **56 passed**, 4 RLS skipped. **Not yet driven live** — the smoke test in 13.33 is worth running now that the switch does something visible.

## Earlier change (2026-07-23) — Phase 13: 13C switch UI & shell complete (13.13–13.17)

- **The switch is now live in the UI** — first visible change of Phase 13. It flips `<html lang>`, the cookie and `profiles.locale`; the strings themselves are still English everywhere because extraction (13D–13F) hasn't run. Expect only the switch pill itself to react so far.
- **`components/layout/LocaleSwitch.tsx`** (13.13) — client segmented control, two buttons in one pill, existing DESIGN.md tokens only. `useTransition` + the `setLocale` server action, mirroring the logout pattern in `UserMenu.tsx`; disabled while pending and on the active option. A11y: `role="group"` + `aria-label` (translated), `aria-pressed`, and `lang={l}` per button so each label renders in its own language.
- **`components/layout/Topbar.tsx`** (13.14) — mounted between the search link and the role pill, with `ml-auto` so the pair stays right-aligned.
- **`app/layout.tsx`** (13.15) — now `async`: emits `lang={HTML_LANG[locale]}` and wraps `children` in `I18nProvider`. **Build cost confirmed, not assumed:** `npm run build` passes and `/_not-found` flipped from static to `ƒ` (dynamic); every other route was already dynamic, so that is the entire cost.
- **`app/globals.css` + `tailwind.config.ts`** (13.16) — `--font-cjk` (`PingFang TC`, `Microsoft JhengHei`, `Noto Sans TC`, `Heiti TC`) plus `--font-{head,body,mono}-stack` composites; the four `font-family` declarations now use the stacks. **`tailwind.config.ts` also had to change** (not in the plan): its `fontFamily` mapped `font-head`/`font-body`/`font-mono` directly to the bare next/font vars, so utility-class text — sidebar, chips, KPI labels — would still have rendered tofu.
- **`app/(auth)/layout.tsx`** (13.17) — new shell putting the switch top-right on login / forgot-password / reset-password, so someone who cannot read English can switch before signing in. One layout instead of three page edits.
- ⚠️ **Unrelated pre-existing discrepancy found:** `app/(app)/network/vpn/new/{page.tsx,VpnForm.tsx}` still exist **untracked** on disk and still build as a live route, even though commit `b44897f` retired VPN link creation and this file records them as deleted. Their POST target `app/api/vpn-links/` is an empty directory, so **submitting that form would 404**. Left alone — deleting is your call.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · `npm run build` ✅ · tests **56 passed**, 4 RLS skipped. **Not driven live** — and it cannot be until `0005_locale.sql` is applied (see below).

## Earlier change (2026-07-23) — Phase 13: 13B persistence complete (13.7–13.12)

- 🚫 **`0005_locale.sql` must be applied to the linked Supabase project before the app will run.** `getCurrentUser()` now selects `profiles.locale`; against a DB without the column that select errors, `profile` comes back null, and **every request looks signed-out**. Migration written but **not applied** (13.32 still open — no Docker in this env for a local `db reset`).
- **`supabase/migrations/0005_locale.sql`** (13.7/13.8) — `profiles.locale text check (locale is null or locale in ('en','zh-TW'))` + `set_my_locale(p_locale text)`: `security definer`, `set search_path = public`, `plpgsql`, re-validates the argument and raises `22023` on anything else, raises `28000` when `auth.uid()` is null, updates **only** `locale` for the calling user; `revoke all from public, anon` + `grant execute to authenticated`. **No self-update RLS policy was added** — RLS cannot restrict columns, so any policy permissive enough for locale would let a `country_manager` set `role='hq_admin'`, which is what `current_role_is_hq()` reads. The function is the sole write path; the reasoning is recorded in the migration header.
- **`lib/actions/locale.ts`** (13.10) — `"use server"` `setLocale(next)`: `isLocale()` guard **before any write**, then the cookie (`httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` in prod, 1-year `maxAge`), then the RPC only when signed in (the login page is translated too, so a signed-out switch still works via cookie), then `revalidatePath("/", "layout")`.
- **`lib/supabase/middleware.ts`** (13.11) — when the locale cookie is absent and a session exists, reads `profiles.locale` and sets the cookie on the response. Placed after the redirect branches so redirects don't pay for the query; precedence is **cookie → `profiles.locale` → `en`**, and it costs one query per new browser only. Root `middleware.ts` unchanged (pure delegation).
- **Types** (13.9/13.12) — `locale` added to the `profiles` `Row`/`Insert` and `set_my_locale` to the `Functions` block in `lib/types/database.ts`; `CurrentUser.locale` + the `profiles` select in `lib/auth.ts`. Both typed `Locale | null` off `lib/i18n/config`, so the DB check constraint and the TS union can't drift apart silently.
- Still no visible UI change — the switch itself is 13C. Next: 13.13–13.17 (`LocaleSwitch`, Topbar mount, `app/layout.tsx` `lang` + provider, the `--font-cjk` fallback, and the switch on the auth pages).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **56 passed**, 4 RLS skipped. **Not exercised against a live DB.**

## Earlier change (2026-07-23) — Phase 13: 13A locale core complete (13.1–13.6)

- **`lib/i18n/server.ts`** (13.4) — `getLocale()` (cookie → `en`) and `getDictionary()` for the 38 server components. Importing `next/headers` makes it server-only, so the lookup table itself was split into **`lib/i18n/dictionaries/index.ts`** (`DICTIONARIES: Record<Locale, Dictionary>`, `dictionaryFor()`) — a pure function usable from middleware (13.11 needs it) and tests.
- **`lib/i18n/client.tsx`** (13.5) — `I18nProvider({ dict, locale })` + `useT()` / `useLocale()` for the 17 client components, same `t.common.save` shape as the server side. **No fallback dictionary:** the context defaults to `null` and the hooks throw outside the provider — defaulting to `en` would ship the whole English object into every client bundle and hide a missing provider behind silently-English UI.
- **`tests/i18n.test.ts`** (13.6) — 7 tests: recursive dotted-path key parity `en` ↔ `zh-TW`, parity for every locale in `LOCALES` via `dictionaryFor`, no empty/non-string values, a copy-paste guard (zh values actually differ), plus `LOCALE_LABELS`/`HTML_LANG` coverage and `isLocale` accept/reject.
- Suite is now **56 passed** (was 49), 4 RLS integration skipped. Still nothing consumes i18n — no behaviour change.
- Next: **13B persistence** — `0005_locale.sql` (`profiles.locale` + the `set_my_locale` security-definer RPC), `lib/actions/locale.ts`, the middleware cookie seed, and the `CurrentUser`/`Database` type updates.
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings) · tests **56 passed**, 4 RLS skipped.

## Earlier change (2026-07-23) — Phase 13: 13.1–13.3 (locale config + both dictionaries)

- **`lib/i18n/config.ts`** (13.1): `LOCALES = ["en","zh-TW"]` + `Locale` type, `DEFAULT_LOCALE` (`en`), `LOCALE_COOKIE` (`"locale"`), `LOCALE_LABELS` (`EN` / `繁中`), `HTML_LANG` (`en` / `zh-Hant-TW`), `isLocale(value: unknown)` guard. Zero imports, so it is usable from server components, client components and middleware alike.
- **`lib/i18n/dictionaries/en.ts`** (13.2) — 16 namespaces (`common`, `nav`, `topbar`, `dashboard`, `country`, `sites`, `network`, `cctv`, `renewals`, `audit`, `users`, `search`, `auth`, `forms`, `enums`, `errors`) + `export type Dictionary = typeof en`. Seeded with the shared chrome only: Save / Save changes / Saving… / Cancel / Edit / New / Verify / Fresh / Stale, the sidebar groups + nav labels, the Topbar search placeholder and role pill, and each module's real `PageHead` title/subtitle. `forms` and `enums` are intentionally empty — 13.28 and 13.21 fill them.
- **`lib/i18n/dictionaries/zh-TW.ts`** (13.3) — full 繁體中文 mirror annotated `: Dictionary`.
- **Deviation from the plan:** `en` is **not** `as const`. Literal value types would have forced `zh-TW` to repeat the English strings verbatim; widened `string` values still enforce the exact key shape. **Guard proven**, not assumed: adding a probe key to `en` alone failed `tsc` with `TS2741 … missing in type` at `zh-TW.ts`; removed and re-verified clean.
- Nothing consumes any of this yet — no behaviour change. Next: 13.4/13.5 (`getDictionary()` for the 38 server components, `I18nProvider`/`useT()` for the 17 client ones), then 13.6 (runtime key-parity test).
- Verified: `tsc --noEmit` ✅ · `next lint` ✅ (0 warnings).

## Earlier change (2026-07-22) — Phase 13 (i18n) planned, not yet started

- **`TASKS.md` gains Phase 13 — EN / 繁體中文 language switch**: 35 subtasks in 7 groups (13A locale core · 13B persistence · 13C switch UI & shell · 13D chrome & shared · 13E pages · 13F forms/validation/API · 13G verification). **No code written yet.**
- Approach: cookie + `profiles.locale`, hand-rolled typed dictionary in `lib/i18n/` (`zh-TW.ts` annotated `: Dictionary`, so a missing key is a `tsc` error). A `[locale]` URL segment is ruled out — `typedRoutes: true` would mean rewriting every route and `Link href`.
- Two findings that shape the work: (1) `profiles` has **no self-UPDATE policy**, and adding one would be a privilege-escalation hole (RLS can't restrict columns → a `country_manager` could set `role='hq_admin'`), so the locale write goes through a column-scoped `security definer` RPC; (2) all three `next/font` families load `subsets: ["latin"]` and have **no CJK glyphs** — needs a `--font-cjk` fallback in `globals.css`.
- Scope reality: **55 `.tsx` files / ~5,000 lines**, 38 server + 17 client components, 16 `capitalize` enum renders, 13 API routes, 8 Zod messages. Dates/money stay `en-GB`/`en-US` in both locales (reversible).
- Plan file: `~/.claude/plans/adding-dual-switches-languages-cryptic-jellyfish.md`.

## Earlier change (2026-07-22) — Sites list drops the archived toggle

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
| 13 | i18n — EN / 繁體中文 switch | ✅ **Done** | All 35 subtasks. Live smoke (13.33) + security checks (13.34) both passed 2026-07-23. |

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
