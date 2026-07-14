# Code Quality & Architecture Flaws Audit

_Audit date: 2026-07-13. Scope: structure, duplication, typing, separation of concerns. Excludes themes.html, mockup.html, wireframe.html._

---

Item: RLS-first authorization architecture
Verdict: ✅ Correct
Notes: Single, well-documented authorization boundary (Postgres RLS). Server/admin/client Supabase factories are cleanly separated with clear "server-only" guards. `getCurrentUser` is explicitly documented as UI-convenience, not the boundary. Strong architecture.

Item: Duplicated create-route boilerplate
Verdict: ⚠️ Needs action
Notes: `/api/sites`, `/api/devices`, `/api/ip-schemes`, `/api/vlans` are near-identical: getUser → 401 → safeParse → insert → select id → 201. Four copies drift over time (already inconsistent with `/api/verify`/invite error shapes).
- [x] CODE-1: Extracted `createResourceRoute(table, schema)` in `lib/api/create-resource-route.ts`; the four POST handlers are now one-liners. Also folds in the ROB-2 try/catch and ROB-3 error mapping.

Item: Duplicated Zod optional-string idiom
Verdict: ⚠️ Needs action
Notes: `.optional().or(z.literal("").transform(() => undefined))` is repeated dozens of times across `network.ts`, `site.ts`, `common.ts`. Error-prone to hand-copy.
- [x] CODE-2: Added `optionalString(max)` in `common.ts` and replaced the repeated `.optional().or(z.literal("")...)` idiom across `network.ts` and `site.ts`.

Item: Inline `<style>` blocks in client components
Verdict: ⚠️ Review
Notes: `InviteForm.tsx` and `ResetPasswordForm.tsx` each inject a `<style>` tag defining `.fld` / `.input-base` with duplicated field styling. Fine functionally but bypasses Tailwind and duplicates the same input styling.
- [ ] CODE-3: Promote the shared input style to a Tailwind component class (`@layer components` in `globals.css`) or a reusable `<Input>` component.

Item: `as never` cast in reset-password navigation
Verdict: ⚠️ Needs action
Notes: `router.push((params.get("redirectedFrom") as never) ?? "/dashboard")` casts to `never` to satisfy typedRoutes. This defeats type safety and is tied to the SEC-3 open-redirect concern.
- [x] CODE-4: Now routes through `safeInternalPath` (SEC-3) and casts to `Route` instead of `never`. A runtime-validated path can't be a static typedRoutes literal, so a documented `as Route` cast is the honest minimum.

Item: Typed routes enabled
Verdict: ✅ Correct
Notes: `next.config.ts` sets `typedRoutes: true` and `reactStrictMode: true`. Good defaults. `<Link href={... : "/network"}>` in search is a static fallback (loses the specific record) — minor UX debt, not a type flaw.
- [ ] CODE-5: Search results link every non-site type to `/network` regardless of type (device/circuit/camera). Route each type to its real detail page.

Item: Polymorphic maintenance_logs handled with a plpgsql dispatch
Verdict: ✅ Correct (with note)
Notes: `can_access_maintenance_target` cleanly resolves visibility across three target tables. It's `security definer` and search-path-pinned. Reasonable given the polymorphic design; just centralize any future target tables here and in the check constraint together.

Item: Constants vs DB source-of-truth for retention/review cycle
Verdict: ⚠️ Review
Notes: `DEFAULT_MIN_RETENTION_DAYS` / `reviewCycleMonths` live both in TS constants and `country_settings`. Two sources of truth risk divergence (see BUS-5).
- [ ] CODE-6: Treat `country_settings` as authoritative; use TS constants only as seed defaults.

Item: Test coverage is RLS-integration only
Verdict: ⚠️ Review
Notes: `tests/rls.test.ts` is solid but skips without env; there are no unit tests for `secrets.ts`, `format.ts`, or the Zod schemas (pure, easily testable logic).
- [ ] CODE-7: Add unit tests for `containsPossibleSecret`, `isStale`/`daysUntil`, and schema edge cases (empty-string transforms, role/country superRefine).

Item: Consistent "force-dynamic" on authed pages
Verdict: ✅ Correct
Notes: Server pages that read per-user data set `export const dynamic = "force-dynamic"`, preventing accidental static caching of country-scoped data.
