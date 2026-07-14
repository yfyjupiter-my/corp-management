import { createResourceRoute } from "@/lib/api/create-resource-route";
import { vlanSchema } from "@/lib/validation/network";

/**
 * Create a VLAN for a site (PRD Story 2). RLS-scoped via the parent site's WITH
 * CHECK policy; `vlan_id` is bounded to the 802.1Q range by the schema. See
 * `createResourceRoute` for the shared auth/parse/insert/error handling.
 */
export const POST = createResourceRoute("vlans", vlanSchema);
