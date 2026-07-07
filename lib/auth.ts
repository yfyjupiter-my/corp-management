import { createClient } from "@/lib/supabase/server";
import type { CountryCode } from "@/lib/constants/countries";
import type { UserRole } from "@/lib/constants/enums";

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  countryCode: CountryCode | null; // null for hq_admin
}

/**
 * Resolve the signed-in user plus their profile (role + country). Returns null
 * when unauthenticated. This is a convenience for UI decisions only — the
 * authorization boundary is RLS, not this function.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, country_code")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: profile.role,
    countryCode: profile.country_code,
  };
}

export function isHqAdmin(user: CurrentUser | null): boolean {
  return user?.role === "hq_admin";
}
