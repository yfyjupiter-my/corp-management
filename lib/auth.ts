import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  locale: Locale | null; // null = follow the app default
}

/**
 * Resolve the signed-in user plus their profile. Returns null when
 * unauthenticated, or when the auth user has no profile row.
 *
 * Roles were removed in 0006_drop_roles.sql: every authenticated user has the
 * same full access, so there is nothing here for the UI to branch on any more.
 * RLS remains the boundary — it just draws the line at "signed in", not at
 * "signed in as X".
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, locale")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    locale: profile.locale,
  };
}
