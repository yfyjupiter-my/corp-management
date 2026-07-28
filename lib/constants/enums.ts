/**
 * Domain enums — mirror the Postgres check constraints / types
 * (finalize.md Part C — Enums). Keep in sync with supabase/migrations.
 */
// `user_role` was dropped in 0006_drop_roles.sql — there is one flat tier of
// authenticated user now, so there is no role enum to mirror.

export const CIRCUIT_TYPES = ["fiber", "broadband", "lte"] as const;
export type CircuitType = (typeof CIRCUIT_TYPES)[number];

export const DEVICE_TYPES = ["router", "firewall", "switch", "ap", "other"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const CAMERA_TYPES = ["dome", "bullet", "ptz", "other"] as const;
export type CameraType = (typeof CAMERA_TYPES)[number];

export const CAMERA_STATUSES = ["active", "faulty", "offline"] as const;
export type CameraStatus = (typeof CAMERA_STATUSES)[number];

export const VPN_STATUSES = ["up", "down", "unknown"] as const;
export type VpnStatus = (typeof VPN_STATUSES)[number];

/** Tables the polymorphic maintenance_logs may target (check-constrained in SQL). */
export const MAINTENANCE_TARGETS = [
  "network_devices",
  "cctv_recorders",
  "cctv_cameras",
] as const;
export type MaintenanceTarget = (typeof MAINTENANCE_TARGETS)[number];
