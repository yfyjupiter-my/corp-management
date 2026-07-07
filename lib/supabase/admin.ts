import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Admin client — SERVICE ROLE, bypasses RLS. Server-only.
 *
 * Used EXCLUSIVELY by the invite route (app/api/invite) to create auth users and
 * their profile rows. Never import this into a Client Component or expose the key
 * to the browser (it is not NEXT_PUBLIC_*).
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
