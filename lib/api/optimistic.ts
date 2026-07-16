/**
 * BUS-6 — optimistic concurrency for guarded PATCH updates.
 *
 * A client that edits a row sends back the `updated_at` it last read
 * (`expected_updated_at`). The route adds that as an extra `.eq("updated_at", …)`
 * predicate so the write only lands if nobody changed the row in between (the
 * `set_updated_at` trigger bumps `updated_at` on every update, so a stale value
 * won't match). This classifies the result of such a guarded update.
 *
 * A guarded update that touches zero rows is ambiguous — either the row was
 * changed concurrently (its `updated_at` moved) or it is gone / not visible
 * under RLS. The caller resolves that by re-reading the row's visibility and
 * passing `rowVisible`.
 *
 * Verify (a monotonic `last_verified_at` stamp) and archive/restore (an
 * idempotent boolean toggle) intentionally do NOT use this guard: concurrent
 * calls there converge rather than lose data, so a 409 would be user-hostile.
 */
export type GuardedUpdateOutcome = "ok" | "conflict" | "not_found";

export function classifyGuardedUpdate(input: {
  guarded: boolean;
  updatedCount: number;
  rowVisible: boolean;
}): GuardedUpdateOutcome {
  if (input.updatedCount > 0) return "ok";
  // An unguarded 0-row update keeps its prior no-op-success behaviour.
  if (!input.guarded) return "ok";
  return input.rowVisible ? "conflict" : "not_found";
}

export const CONFLICT_MESSAGE =
  "This record was changed by someone else since you opened it. Reload to see " +
  "the latest version, then re-apply your changes.";
