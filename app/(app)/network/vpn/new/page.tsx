import { createClient } from "@/lib/supabase/server";
import { VpnForm } from "./VpnForm";

export const dynamic = "force-dynamic";

/**
 * Add a VPN/WAN link (PRD Story 2). The site list is RLS-scoped, so both the
 * owning site and any peer site are limited to what the caller may see. The form
 * owns the heading so Cancel/Save render on the title line.
 */
export default async function NewVpnPage() {
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, country_code")
    .is("archived_at", null)
    .order("name");

  return (
    <VpnForm
      sites={sites ?? []}
      title="New VPN / WAN link"
      subtitle="Record a site-to-site or site-to-HQ tunnel and its status."
    />
  );
}
