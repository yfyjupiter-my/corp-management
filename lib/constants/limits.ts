/**
 * Row caps (TASKS 10.6 — "guard against unbounded fetch").
 *
 * A single blanket cap is wrong here, because the queries in this app fall into
 * three groups that fail in different ways when truncated:
 *
 *  - A **rendered list** truncated at 50 shows 50 rows. The user sees what they
 *    got and the page stays honest.
 *  - An **aggregation** truncated at 50 reports "12 devices" when there are 400.
 *    The number is silently wrong, which is worse than the unbounded fetch the
 *    cap was meant to prevent. These get a high ceiling that exists purely to
 *    stop a runaway scan, plus a warning when it is actually hit.
 *  - A **<select> option list** truncated at 50 makes a site unfileable — the
 *    user cannot pick what isn't in the list. Also a high ceiling.
 *
 * So: cap everything, but cap it at the value that matches how the rows are used.
 */

/** Rows rendered in a list/table view. */
export const LIST_PAGE_SIZE = 50;

/**
 * Safety ceiling for queries whose rows are counted or filtered rather than
 * rendered (dashboard KPIs, renewals windows, sidebar counts). Hitting this
 * means a count is understated — call sites `console.warn` when they do.
 */
export const AGGREGATE_CAP = 1000;

/** Safety ceiling for rows that populate a `<select>`. */
export const OPTIONS_CAP = 500;

/**
 * True when a result came back exactly at its cap, i.e. there were probably
 * more rows. Postgres cannot tell us "there were more" without a second count,
 * so this is a heuristic — it false-positives on an exact multiple.
 */
export function isTruncated(rows: unknown[] | null | undefined, cap: number): boolean {
  return (rows?.length ?? 0) >= cap;
}
