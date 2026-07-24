import { z } from "zod";
import { CAMERA_STATUSES, CAMERA_TYPES } from "@/lib/constants/enums";
import { ipString, optionalSafeText, optionalString } from "./common";
import { V } from "@/lib/i18n/validation";

/**
 * The five unconstrained-string fields below used the
 * `.optional().or(z.literal("").transform())` idiom, which is exactly the case
 * `common.ts` warns about: an unconstrained `z.string()` *accepts* `""`, so the
 * first branch of the union wins and the empty value is stored as `""` rather
 * than NULL. They now use `optionalString`, whose trailing `.transform` runs
 * unconditionally. (`mgmt_ip` keeps the idiom — `ipString` has a regex, so `""`
 * is rejected by the first branch and correctly falls through.)
 */
export const recorderSchema = z.object({
  site_id: z.string().uuid(),
  brand: optionalString(80),
  model: optionalString(80),
  channels: z.coerce.number().int().positive().optional(),
  storage_tb: z.coerce.number().nonnegative().optional(),
  retention_days: z.coerce.number().int().nonnegative().optional(),
  firmware: optionalString(80),
  mgmt_ip: ipString.optional().or(z.literal("").transform(() => undefined)),
  location: optionalSafeText(160),
  notes: optionalSafeText(1000),
});
export type RecorderInput = z.infer<typeof recorderSchema>;

export const cameraSchema = z.object({
  recorder_id: z.string().uuid(),
  label: z.string().trim().min(1, V.label).max(120),
  location_desc: optionalSafeText(200),
  camera_type: z.enum(CAMERA_TYPES),
  resolution: optionalString(40),
  outdoor: z.boolean().default(false),
  status: z.enum(CAMERA_STATUSES),
  notes: optionalSafeText(1000),
});
export type CameraInput = z.infer<typeof cameraSchema>;
