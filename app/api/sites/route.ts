import { createResourceRoute } from "@/lib/api/create-resource-route";
import { siteSchema } from "@/lib/validation/site";

/**
 * Create a site (PRD Story 1). RLS-scoped: a country manager can only create
 * sites for their own country (enforced by the WITH CHECK policy). The shared
 * Zod schema runs the secrets guard on free-text fields before the write. See
 * `createResourceRoute` for the shared auth/parse/insert/error handling.
 */
export const POST = createResourceRoute("sites", siteSchema);
