# Security Vulnerabilities Audit

_Audit date: 2026-07-13. Scope: Next.js App Router + Supabase (RLS-first). Excludes themes.html, mockup.html, wireframe.html per project constraints._

---

Item: RLS deny-by-default on all tables
Verdict: ✅ Correct
Notes: `0002_rls.sql` enables RLS on all 12 tables with no permissive fallback. Helper functions (`current_role_is_hq`, `current_country`, `site_country`) are `security definer` with `set search_path = public`, closing the search-path hijack vector.

Item: Service-role key isolation
Verdict: ✅ Correct
Notes: `createAdminClient` reads `SUPABASE_SERVICE_ROLE_KEY` (non-`NEXT_PUBLIC_`), throws if unset, and is imported only by `app/api/invite/route.ts`. Invite route re-checks `hq_admin` before use since the admin client bypasses RLS.

Item: Global search runs as caller (security invoker)
Verdict: ✅ Correct
Notes: `search_registry` is `security invoker` + `set search_path = public`, so RLS scopes results to the caller's country. Uses parameterized ILIKE (no SQL injection).

Item: audit_log immutability
Verdict: ✅ Correct
Notes: Only a HQ `select` policy exists; no insert/update/delete policies. Writes go through the `security definer` trigger. Non-HQ get zero rows (verified by intent in `tests/rls.test.ts`).

Item: Missing HTTP security headers
Verdict: ⚠️ Needs action
Notes: `next.config.ts` sets no `headers()`. No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, or Referrer-Policy. App is clickjacking-exploitable and lacks defense-in-depth against XSS.
- [x] SEC-1: Added a `headers()` block to `next.config.ts` with HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a report-only CSP.

Item: Open-redirect via `next` param in auth callback
Verdict: ⚠️ Needs action
Notes: `app/auth/callback/route.ts` redirects to `${origin}${next}` from an attacker-controllable `next` query param. `origin` pins the host so external redirects are blocked, but a crafted `next` can still bounce users to unintended internal paths, and any future absolute-URL handling would open a redirect.
- [x] SEC-2: Added `safeInternalPath` (`lib/utils/safe-redirect.ts`) and applied it to `next` in the auth callback — must be a `/`-relative path, not `//` or `/\`, else falls back to `/dashboard`.

Item: `redirectedFrom` reflected into router.push after reset
Verdict: ⚠️ Needs action
Notes: `ResetPasswordForm.tsx` does `router.push(params.get("redirectedFrom") ?? "/dashboard")` with a raw query value cast `as never`. A malicious link could set an unexpected internal path.
- [x] SEC-3: `redirectedFrom` in `ResetPasswordForm.tsx` now passes through `safeInternalPath` before `router.push`.

Item: Secrets guard is a broad heuristic (defense-in-depth only)
Verdict: ✅ Correct (by design), ⚠️ minor
Notes: `containsPossibleSecret` blocks password-like text before write. The `[A-Za-z0-9+/_-]{24,}` rule will false-positive on legitimate long tokens/URLs/serials. Acceptable as documented defense-in-depth, but worth tuning.
- [x] SEC-4: Replaced the blunt `{24,}` rule with `looksLikeHighEntropyToken` — a 20+ run is flagged only if it mixes lowercase + uppercase + digit (as base64/JWT secrets do). Lowercase URLs, slugs, and UUID segments no longer false-positive. Covered by `tests/secrets.test.ts`.

Item: No rate limiting on auth + write endpoints
Verdict: ⚠️ Needs action
Notes: `/api/invite`, `/api/verify`, `/api/devices`, `/api/sites`, login, and forgot-password have no rate limiting. Supabase Auth has some built-in throttling, but app routes do not, allowing brute force / enumeration / abuse.
- [ ] SEC-5: **Deferred** (owner decision, 2026-07-14). Relies on Supabase Auth's built-in throttling for now; app-level rate limiting (Upstash/Vercel KV) to be added before a public/production launch. No infra dependency introduced yet.

Item: Verify route table allow-list
Verdict: ✅ Correct
Notes: `/api/verify` restricts `table` to a Zod enum allow-list and validates `id` as UUID; RLS still scopes which rows the update touches.
