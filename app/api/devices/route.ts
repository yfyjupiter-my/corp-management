import { createResourceRoute } from "@/lib/api/create-resource-route";
import { networkDeviceSchema } from "@/lib/validation/network";

/**
 * Create a network device. RLS-scoped: a country manager can only insert against
 * their own country's sites (WITH CHECK via the parent site). The shared Zod
 * schema runs the secrets guard before the write. See `createResourceRoute` for
 * the shared auth/parse/insert/error handling.
 */
export const POST = createResourceRoute("network_devices", networkDeviceSchema);
