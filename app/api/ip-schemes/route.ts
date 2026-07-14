import { createResourceRoute } from "@/lib/api/create-resource-route";
import { ipSchemeSchema } from "@/lib/validation/network";

/**
 * Create an IP scheme for a site (PRD Story 2). RLS-scoped via the parent site's
 * WITH CHECK policy. The shared Zod schema runs the secrets guard on `notes`. See
 * `createResourceRoute` for the shared auth/parse/insert/error handling.
 */
export const POST = createResourceRoute("ip_schemes", ipSchemeSchema);
