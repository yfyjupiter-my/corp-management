import { createResourceRoute } from "@/lib/api/create-resource-route";
import { cameraSchema } from "@/lib/validation/cctv";

/**
 * Create a CCTV camera (PRD Story 3), scoped to a recorder. RLS-scoped: a
 * country manager can only insert against a recorder on their own country's
 * sites (WITH CHECK via recorder → site). The shared Zod schema runs the
 * secrets guard before the write. See `createResourceRoute` for shared handling.
 */
export const POST = createResourceRoute("cctv_cameras", cameraSchema);
