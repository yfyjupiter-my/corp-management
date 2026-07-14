# Robustness & Error Handling Audit

_Audit date: 2026-07-13. Scope: API error paths, rollback, external-call failure modes, input parsing. Excludes themes.html, mockup.html, wireframe.html._

---

Item: JSON body parsing guarded
Verdict: ✅ Correct
Notes: Every route uses `await request.json().catch(() => null)` then `safeParse`, so malformed/empty bodies return a clean 400 instead of throwing.

Item: Auth check ordering
Verdict: ✅ Correct
Notes: Routes call `getUser()` and 401 before doing work; invite checks `hq_admin` (403) before touching the admin client.

Item: Invite rollback swallows deleteUser failure
Verdict: ⚠️ Needs action
Notes: `app/api/invite/route.ts` line 50 calls `admin.auth.admin.deleteUser(...)` without awaiting the result-check — if it rejects, the error propagates as an unhandled 500 and the original `profileError` message is lost; if it silently fails, the auth user is orphaned.
- [ ] ROB-1: Wrap the rollback `deleteUser` in try/catch; on failure, log and still return the original profile error with a note that manual cleanup may be needed.

Item: Route handlers have no top-level try/catch
Verdict: ⚠️ Needs action
Notes: `/api/sites`, `/api/devices`, `/api/ip-schemes`, `/api/vlans`, `/api/verify`, `/api/invite` rely on Supabase calls not throwing. Network/transport errors from Supabase (thrown, not returned in `error`) would surface as unstyled 500s with a stack.
- [ ] ROB-2: Add a shared handler wrapper (or per-route try/catch) that catches thrown exceptions and returns a generic 500 JSON without leaking internals.

Item: Error messages leak raw DB errors to client
Verdict: ⚠️ Needs action
Notes: Routes return `error.message` from Postgres/PostgREST directly (`return NextResponse.json({ error: error.message }, ...)`). These can expose constraint names, column names, and RLS hints to the client.
- [ ] ROB-3: Map DB errors to safe, user-facing messages; log the raw error server-side only.

Item: `search_registry` RPC failure not surfaced
Verdict: ⚠️ Review
Notes: `search/page.tsx` destructures `{ data }` from the RPC and ignores `error` (`results = data ?? []`). A failing search silently renders "No matches" instead of an error state.
- [ ] ROB-4: Capture the RPC `error` and render a distinct "search failed" state vs "no results".

Item: Dashboard queries ignore per-query errors
Verdict: ⚠️ Review
Notes: `dashboard/page.tsx` uses `Promise.all` and `?? []` fallbacks; if one query errors (not rejects), the KPI silently shows 0/empty with no signal that data is missing — misleading for an infra-health dashboard.
- [ ] ROB-5: Detect `.error` on each result and show a "data unavailable" indicator per card rather than a misleading zero.

Item: Auth callback failure path
Verdict: ✅ Correct
Notes: `auth/callback/route.ts` handles missing code and exchange error by redirecting to `/login?error=auth_callback_failed`. Good terminal state (see SEC-2 for the `next` open-redirect concern).

Item: Reset-password session-readiness gating
Verdict: ✅ Correct
Notes: `ResetPasswordForm` gates submit on `getSession()` presence, shows an explicit "invalid/expired link" state, and validates length + match client-side before calling `updateUser`.

Item: Currency formatting resilience
Verdict: ✅ Correct
Notes: `formatMoney` wraps `Intl.NumberFormat` in try/catch with a fallback string, so an invalid ISO currency code won't crash a render. `formatDate`/`daysUntil` guard `NaN` dates.

Item: `set_updated_at` / audit triggers assume an `id` column
Verdict: ✅ Correct
Notes: All audited tables in the trigger arrays have `id`; `maintenance_logs` included in audit but not in `set_updated_at` (it has no `updated_at`) — correctly omitted.
