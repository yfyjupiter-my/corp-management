/**
 * Returns `path` only if it is a safe, same-origin, in-app relative path;
 * otherwise falls back to `/dashboard`.
 *
 * Guards against open-redirect abuse via attacker-controlled `next` /
 * `redirectedFrom` query params: a value must start with a single `/` and must
 * not begin with `//` or `/\`, both of which browsers treat as protocol-relative
 * absolute URLs (e.g. `//evil.com`).
 */
export function safeInternalPath(
  path: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!path) return fallback;
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}
