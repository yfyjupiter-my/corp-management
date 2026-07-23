import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/constants/countries";
import { USER_ROLES } from "@/lib/constants/enums";
import { V } from "@/lib/i18n/validation";

/**
 * Invite payload (HQ admin only). A country_manager must have a country; an
 * hq_admin must not (they see all countries).
 */
export const inviteUserSchema = z
  .object({
    email: z.string().email(V.email),
    full_name: z.string().trim().min(1, V.fullName).max(120),
    role: z.enum(USER_ROLES),
    country_code: z.enum(COUNTRY_CODES).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role === "country_manager" && !val.country_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["country_code"],
        message: V.countryRequired,
      });
    }
    if (val.role === "hq_admin" && val.country_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["country_code"],
        message: V.countryForbidden,
      });
    }
  });

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
