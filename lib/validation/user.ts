import { z } from "zod";
import { V } from "@/lib/i18n/validation";

/**
 * Create-user payload. Any authenticated user may create another user —
 * roles were removed in 0006_drop_roles.sql, so there is nothing to assign
 * beyond a name, a login email and an initial password.
 *
 * The account is created already-confirmed (no invite email), so the password
 * is set here rather than chosen by the recipient from a mail link.
 */
export const createUserSchema = z.object({
  email: z.string().trim().email(V.email),
  full_name: z.string().trim().min(1, V.fullName).max(120),
  // Matches the reset-password form's floor. Capped because Supabase/bcrypt
  // truncates past 72 bytes, which would silently ignore the tail.
  password: z.string().min(8, V.passwordMin).max(72),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
