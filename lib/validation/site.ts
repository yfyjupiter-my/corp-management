import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/constants/countries";
import { optionalSafeText } from "./common";

export const siteSchema = z.object({
  country_code: z.enum(COUNTRY_CODES),
  name: z.string().trim().min(1, "Site name is required").max(120),
  address: optionalSafeText(500),
  timezone: z.string().min(1), // defaulted per country on create
  currency: z.string().length(3),
  contact_name: optionalSafeText(120),
  contact_phone: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  contact_email: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: optionalSafeText(2000),
});

export type SiteInput = z.infer<typeof siteSchema>;
