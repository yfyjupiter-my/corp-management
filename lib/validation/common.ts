import { z } from "zod";
import { containsPossibleSecret, SECRET_GUARD_MESSAGE } from "@/lib/utils/secrets";

/** A free-text field that must not contain anything resembling a secret. */
export const safeText = (max = 2000) =>
  z
    .string()
    .max(max)
    .refine((v) => !containsPossibleSecret(v), { message: SECRET_GUARD_MESSAGE });

export const optionalSafeText = (max = 2000) =>
  safeText(max).optional().or(z.literal("").transform(() => undefined));

/**
 * An optional plain string (no secret guard); an empty string is normalised to
 * `undefined`. Collapses the repeated
 * `.optional().or(z.literal("").transform(() => undefined))` idiom (CODE-2).
 */
export const optionalString = (max: number) =>
  z.string().max(max).optional().or(z.literal("").transform(() => undefined));

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
  .or(z.literal("").transform(() => undefined));
