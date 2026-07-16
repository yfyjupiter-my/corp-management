import { createResourceRoute } from "@/lib/api/create-resource-route";
import { vpnLinkSchema } from "@/lib/validation/network";

/**
 * Create a VPN/WAN link (PRD Story 2). RLS-scoped via the parent site. `peer` is
 * free-text (HQ / external) while `peer_site_id` optionally points at another
 * site. See `createResourceRoute` for the shared auth/parse/insert/error handling.
 */
export const POST = createResourceRoute("vpn_links", vpnLinkSchema);
