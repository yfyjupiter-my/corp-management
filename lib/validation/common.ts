import { z } from "zod";
import { containsPossibleSecret, SECRET_GUARD_MESSAGE } from "@/lib/utils/secrets";

/** A free-text field that must not contain anything resembling a secret. */
export const safeText = (max = 2000) =>
  z
    .string()
    .max(max)
    .refine((v) => !containsPossibleSecret(v), { message: SECRET_GUARD_MESSAGE });

/**
 * Note on the empty→undefined idiom: `.optional().or(z.literal("").transform())`
 * only works when the base schema *rejects* `""` (e.g. an email/date/IP regex),
 * so the union falls through to the empty-literal branch. For an unconstrained
 * string, `""` is a valid string and the first branch wins — leaving the empty
 * value un-normalised. These helpers use a trailing `.transform` instead so an
 * empty string reliably becomes `undefined` (stored as NULL rather than "").
 */
export const optionalSafeText = (max = 2000) =>
  safeText(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

/**
 * An optional plain string (no secret guard); an empty string is normalised to
 * `undefined`. Collapses the repeated optional-string idiom (CODE-2).
 */
export const optionalString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

/** IPv4/IPv6-ish string. Loose on purpose — this is a registry, not a validator. */
export const ipString = z
  .string()
  .trim()
  .regex(
    /^(\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?|[0-9a-fA-F:]+(\/\d{1,3})?)$/,
    "Enter a valid IP address or CIDR",
  );

/** ISO date (yyyy-mm-dd) or empty. */
export const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional()
  .or(z.literal("").transform(() => undefined));

/** `credential_ref` — reference/URL only, guarded against pasted secrets. */
export const credentialRef = z
  .string()
  .max(500)
  .refine((v) => !containsPossibleSecret(v), { message: SECRET_GUARD_MESSAGE })
  .optional()
  .transform((v) => (v === "" ? undefined : v));
