import { z } from "zod";
import { containsPossibleSecret } from "@/lib/utils/secrets";
import { V } from "@/lib/i18n/validation";

/**
 * Messages are dictionary *keys*, not display text — a schema is built at module
 * scope where there is no locale. `validationMessage()` resolves them (13.29).
 */

/** A free-text field that must not contain anything resembling a secret. */
export const safeText = (max = 2000) =>
  z
    .string()
    .max(max)
    .refine((v) => !containsPossibleSecret(v), { message: V.secret });

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
    V.ip,
  );

/** ISO date (yyyy-mm-dd) or empty. */
export const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, V.date)
  .optional()
  .or(z.literal("").transform(() => undefined));

/** `credential_ref` — reference/URL only, guarded against pasted secrets. */
export const credentialRef = z
  .string()
  .max(500)
  .refine((v) => !containsPossibleSecret(v), { message: V.secret })
  .optional()
  .transform((v) => (v === "" ? undefined : v));
