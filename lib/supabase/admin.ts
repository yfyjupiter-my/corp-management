import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Admin client — SERVICE ROLE, bypasses RLS. Server-only.
 *
 * Used EXCLUSIVELY by the invite route (app/api/invite) to create auth users and
 * their profile rows. Never import this into a Client Component or expose the key
 * to the browser (it is not NEXT_PUBLIC_*).
 *
 * BUS-3: because this client runs as the service role, `auth.uid()` is NULL, so
 * any inventory row created through it would record `created_by = NULL` (losing
 * actor attribution). Keep it to profile creation only — all inventory writes
 * MUST go through the user-scoped server client (`@/lib/supabase/server`) so
 * `created_by` defaults to the acting user.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (server-only).");
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
