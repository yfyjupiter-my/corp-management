import type { Dictionary } from "./dictionaries/en";

/**
 * Localised Zod messages (TASKS.md 13.29).
 *
 * A Zod schema is built at module scope, where there is no request and therefore
 * no locale — so the schemas carry stable *keys* rather than display text, and
 * the key is resolved to a string at render time (in the form's `Field`) or at
 * response time (in a Route Handler, via `getDictionary()`).
 *
 * The `v.` prefix is what marks a message as a key. Anything without it is a
 * built-in Zod message (`Invalid uuid`, `String must contain at most 80
 * character(s)`, …) and is passed through untouched — translating Zod's own
 * catalogue is out of scope, and mapping them all to one generic string would
 * lose detail the English UI has today.
 */
const PREFIX = "v.";

export const V = {
  secret: "v.secret",
  ip: "v.ip",
  date: "v.date",
  email: "v.email",
  siteName: "v.siteName",
  provider: "v.provider",
  label: "v.label",
  fullName: "v.fullName",
  countryRequired: "v.countryRequired",
  countryForbidden: "v.countryForbidden",
} as const;

/** Resolves a schema message to display text; non-keys pass through unchanged. */
export function validationMessage(
  t: Dictionary,
  message: string | undefined,
): string | undefined {
  if (!message || !message.startsWith(PREFIX)) return message;
  const key = message.slice(PREFIX.length);
  return (t.validation as Record<string, string>)[key] ?? message;
}
