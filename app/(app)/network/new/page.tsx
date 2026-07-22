import { createClient } from "@/lib/supabase/server";
import { DeviceForm } from "./DeviceForm";

export const dynamic = "force-dynamic";

/**
 * Add a network device (PRD Story 2). The site list is RLS-scoped, so a country
 * manager can only attach devices to their own country's sites. `DeviceForm`
 * renders the page heading itself so its Cancel/Save actions sit on the title
 * line while staying inside the form element.
 */
export default async function NewDevicePage() {
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, country_code")
    .is("archived_at", null)
    .order("name");

  return (
    <DeviceForm
      sites={sites ?? []}
      title="New device"
      subtitle="Register a router, firewall, switch, or access point."
    />
  );
}
