# Business Logic & State Vulnerabilities Audit

_Audit date: 2026-07-13. Scope: role/country scoping, invite lifecycle, verify/archive state, dashboard aggregation. Excludes themes.html, mockup.html, wireframe.html._

---

Item: Country-scoping model (hq_admin sees all, manager scoped to own country)
Verdict: ✅ Correct
Notes: Enforced at the DB via RLS on `sites` and cascaded to child tables through the parent site. `profiles` constraints (`hq_has_no_country`, `manager_has_country`) keep role/country states consistent. UI checks (`getCurrentUser`) are correctly treated as convenience only.

Item: Invite creates auth user + profile atomically-ish
Verdict: ⚠️ Needs action
Notes: `app/api/invite/route.ts` creates the auth user, then inserts the profile; on profile failure it deletes the auth user (rollback). But if `deleteUser` itself fails, the auth user is stranded with no profile → they can authenticate but `getCurrentUser` returns null, landing them on `/no-access` permanently with no cleanup path.
- [x] BUS-1: Rollback `deleteUser` failure is now handled explicitly (try/catch + returned-error check) and logs the orphaned auth-user id for manual cleanup (see ROB-1). A DB-side transactional trigger remains a possible future hardening but is no longer required to avoid an unhandled 500.

Item: Invite role/country coherence
Verdict: ✅ Correct
Notes: `inviteUserSchema.superRefine` requires country for `country_manager` and forbids it for `hq_admin`; the route persists `country_code = role === 'hq_admin' ? null : country_code!`, matching the DB check constraints.

Item: HQ admin can invite another HQ admin (privilege escalation surface)
Verdict: ⚠️ Review
Notes: Any `hq_admin` can create more `hq_admin` accounts with no second approval. Within trust model this may be acceptable, but there's no guard against a single compromised HQ account minting unlimited global-access admins.
- [x] BUS-2: **Accepted with audit** (owner decision, 2026-07-14). HQ admins may create other HQ admins (trusted-org model). The invite route now writes an explicit `audit_log` entry recording the acting admin (`actor`), the new user, and the granted role — closing the accountability gap (`profiles` has no audit trigger and service-role writes record `actor=NULL`).

Item: `created_by` defaults to `auth.uid()` but service-role invite has no uid
Verdict: ⚠️ Review
Notes: Inventory tables default `created_by` to `auth.uid()`. For invite-created profiles this is fine (no such column). But any row created via the admin client would record `created_by = null`. Currently only profiles are created that way, so low impact — confirm no future admin-client writes to inventory.
- [x] BUS-3: Documented in `lib/supabase/admin.ts` — service-role writes record `created_by = NULL`, so the admin client is restricted to profile creation and all inventory writes must use the user-scoped server client.

Item: Verify action stamps `last_verified_at` without freshness/authorship record
Verdict: ⚠️ Review
Notes: `/api/verify` sets `last_verified_at = now()` for any RLS-visible row. Correct for scoping, but it does not record *who* verified. The audit trigger captures the update diff, so actor is recoverable — acceptable, but staleness logic (`isStale`) trusts the timestamp blindly.
- [x] BUS-4: **Confirmed** (owner decision, 2026-07-14). The `audit_log` update diff (actor + `last_verified_at` change) is accepted as the source of truth for "who verified". No dedicated `verified_by` column added.

Item: Dashboard "min retention" uses a global default, not per-country setting
Verdict: ⚠️ Needs action
Notes: `dashboard/page.tsx` compares recorder `retention_days` against `DEFAULT_MIN_RETENTION_DAYS` (constant) rather than each country's `country_settings.min_retention_days`. The schema supports per-country minimums but the dashboard ignores them — a country with a stricter minimum shows wrong compliance counts.
- [x] BUS-5: Dashboard now builds a `country_code → min_retention_days` map from `country_settings` and compares each recorder against its own country's minimum (via site→country), falling back to the TS constant only when a country has no row.

Item: Dashboard "expiring ≤90d" vs KPI label consistency
Verdict: ✅ Correct
Notes: KPI card, filter (`days <= 90`), and 30-day danger threshold are internally consistent. Past-due circuits (negative days) are still included, which is intended (they need attention).

Item: Archive is soft-delete; child visibility inherited
Verdict: ✅ Correct
Notes: `archived_at` soft-delete; lists filter `is('archived_at', null)`. Child rows inherit visibility via the site, and no hard deletes of referenced records occur. Restore is symmetric in the PATCH route.

Item: Verify/Archive lack optimistic-concurrency control
Verdict: ⚠️ Review
Notes: Concurrent edits (two managers editing the same site) last-write-wins with no version check. Low likelihood at this scale but can silently clobber changes.
- [x] BUS-6: Added `updated_at`-based optimistic concurrency on the site edit PATCH. The edit form echoes the `updated_at` it loaded (`expected_updated_at`); the route guards the update with an extra `.eq("updated_at", …)` predicate, and a 0-row result is disambiguated (row still visible → `409` conflict; gone/invisible → `404`). Decision logic is pure and unit-tested (`lib/api/optimistic.ts`, `tests/optimistic.test.ts`). Verify (monotonic `last_verified_at`) and archive/restore (idempotent toggle) deliberately skip the guard — concurrent calls converge, so a 409 there would be user-hostile. Also fixed a latent gap: this PATCH route now routes DB errors through `dbErrorResponse` and has a top-level try/catch (it had been missed by ROB-2/ROB-3).
