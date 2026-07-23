import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/constants/countries";
import { optionalSafeText, optionalString } from "./common";
import { V } from "@/lib/i18n/validation";

export const siteSchema = z.object({
  country_code: z.enum(COUNTRY_CODES),
  name: z.string().trim().min(1, V.siteName).max(120),
  address: optionalSafeText(500),
  timezone: z.string().min(1), // defaulted per country on create
  currency: z.string().length(3),
  contact_name: optionalSafeText(120),
  contact_phone: optionalString(40),
  contact_email: z
    .string()
    .email(V.email)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: optionalSafeText(2000),
});

export type SiteInput = z.infer<typeof siteSchema>;
