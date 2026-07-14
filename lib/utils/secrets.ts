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
];

// Candidate "token" runs: 20+ contiguous base64/hex-ish characters.
const TOKEN_RUN = /[A-Za-z0-9+/=_-]{20,}/g;

/**
 * SEC-4: a long run is only treated as a secret when it mixes the character
 * classes the way random tokens do — lowercase AND uppercase AND digit. The
 * old blunt `{24,}` rule fired on any long run, blocking legitimate lowercase
 * `credential_ref` URLs, slugs, and UUID segments (all 1–2 classes). Real
 * base64/JWT secrets mix all three, so they still trip the guard.
 */
function looksLikeHighEntropyToken(text: string): boolean {
  const runs = text.match(TOKEN_RUN);
  if (!runs) return false;
  return runs.some(
    (r) => /[a-z]/.test(r) && /[A-Z]/.test(r) && /[0-9]/.test(r),
  );
}

export function containsPossibleSecret(text: string | null | undefined): boolean {
  if (!text) return false;
  if (SECRET_PATTERNS.some((re) => re.test(text))) return true;
  return looksLikeHighEntropyToken(text);
}

/** Human-readable reason for blocking a save; surfaced in validation messages. */
export const SECRET_GUARD_MESSAGE =
  "This looks like it may contain a secret. Store a reference to your password " +
  "manager entry instead — never paste the actual credential.";
