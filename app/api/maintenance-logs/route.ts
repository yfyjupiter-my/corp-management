import { createResourceRoute } from "@/lib/api/create-resource-route";
import { maintenanceLogSchema } from "@/lib/validation/cctv";

/**
 * Log a maintenance event (PRD Story 3, TASKS 5.4). Polymorphic on
 * `target_table`/`target_id` — the target must be a network device, CCTV
 * recorder, or camera (enforced by the schema enum and the SQL check
 * constraint). RLS on `maintenance_logs` scopes inserts to rows the caller may
 * see via the target's site. See `createResourceRoute` for shared handling.
 */
export const POST = createResourceRoute("maintenance_logs", maintenanceLogSchema);
