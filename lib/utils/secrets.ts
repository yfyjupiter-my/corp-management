/**
 * Secrets guard (finalize.md Part C — "Secrets guard").
 * Heuristic scan for password-like strings in free-text fields
 * (`notes`, `credential_ref`, etc.). Used by Zod `.refine()` on the server so a
 * save is blocked before a secret ever reaches the database.
 *
 * This is a defense-in-depth convenience, not a guarantee — the real policy is
 * "store references, never secrets" (PRD §Security).
 */

const SECRET_PATTERNS: RegExp[] = [
  // key: value / key = value where the key names a secret
  /\b(pass(word)?|passwd|pwd|secret|api[_-]?key|token|credential)\s*[:=]\s*\S+/i,
  // PEM private key blocks
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  // AWS-style access keys
  /\bAKIA[0-9A-Z]{16}\b/,
  // long high-entropy token (>= 24 chars of base64-ish, no spaces)
  /\b[A-Za-z0-9+/_-]{24,}\b/,
];

export function containsPossibleSecret(text: string | null | undefined): boolean {
  if (!text) return false;
  return SECRET_PATTERNS.some((re) => re.test(text));
}

/** Human-readable reason for blocking a save; surfaced in validation messages. */
export const SECRET_GUARD_MESSAGE =
  "This looks like it may contain a secret. Store a reference to your password " +
  "manager entry instead — never paste the actual credential.";
