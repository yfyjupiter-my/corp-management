import { z } from "zod";
import { CAMERA_STATUSES, CAMERA_TYPES } from "@/lib/constants/enums";
import { ipString, optionalDate, optionalSafeText } from "./common";

export const recorderSchema = z.object({
  site_id: z.string().uuid(),
  brand: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  model: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  channels: z.coerce.number().int().positive().optional(),
  storage_tb: z.coerce.number().nonnegative().optional(),
  retention_days: z.coerce.number().int().nonnegative().optional(),
  firmware: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  mgmt_ip: ipString.optional().or(z.literal("").transform(() => undefined)),
  location: z.string().max(160).optional().or(z.literal("").transform(() => undefined)),
  notes: optionalSafeText(1000),
});
export type RecorderInput = z.infer<typeof recorderSchema>;

export const cameraSchema = z.object({
  recorder_id: z.string().uuid(),
  label: z.string().trim().min(1, "Label is required").max(120),
  location_desc: optionalSafeText(200),
  camera_type: z.enum(CAMERA_TYPES),
  resolution: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  outdoor: z.boolean().default(false),
  status: z.enum(CAMERA_STATUSES),
  notes: optionalSafeText(1000),
});
export type CameraInput = z.infer<typeof cameraSchema>;

export const maintenanceLogSchema = z.object({
  target_table: z.enum(["network_devices", "cctv_recorders", "cctv_cameras"]),
  target_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  action: z.string().trim().min(1, "Describe the action").max(300),
  performed_by: z.string().max(120).optional().or(z.literal("").transform(() => undefined)),
  next_due: optionalDate,
});
export type MaintenanceLogInput = z.infer<typeof maintenanceLogSchema>;
