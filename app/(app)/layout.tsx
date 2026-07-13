import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { COUNTRY_CODES } from "@/lib/constants/countries";

/**
 * Authenticated app shell (DESIGN.md §4): fixed navy rail + fluid main.
 * Session presence is also enforced by middleware; this is defense in depth.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Distinguish "no session" from "session but no profile". Both make
  // getCurrentUser() null, but sending a still-authenticated user to /login just
  // loops against the middleware — route them to /no-access instead.
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/no-access");

  // Per-country site counts for the rail. RLS ensures a country manager only
  // ever gets their own country's rows, so their other counts render as 0.
  const siteCounts: Record<string, number> = Object.fromEntries(
    COUNTRY_CODES.map((c) => [c, 0]),
  );
  const { data: sites } = await supabase
    .from("sites")
    .select("country_code")
    .is("archived_at", null);
  for (const row of sites ?? []) {
    siteCounts[row.country_code] = (siteCounts[row.country_code] ?? 0) + 1;
  }

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar user={user} siteCounts={siteCounts} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} />
        <main className="p-[22px] overflow-auto flex-1 bg-bg fadein">{children}</main>
      </div>
    </div>
  );
}
