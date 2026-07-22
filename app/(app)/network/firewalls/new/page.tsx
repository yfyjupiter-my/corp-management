import { createClient } from "@/lib/supabase/server";
import { DeviceForm } from "../../new/DeviceForm";

export const dynamic = "force-dynamic";

/**
 * Add a firewall (PRD Story 2). A firewall is a `network_devices` row with
 * `device_type = 'firewall'`, so this is the shared device form with the type
 * pinned — same columns, same RLS-scoped site list, same `POST /api/devices`.
 */
export default async function NewFirewallPage() {
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, country_code")
    .is("archived_at", null)
    .order("name");

  return (
    <DeviceForm
      sites={sites ?? []}
      fixedType="firewall"
      title="New Firewall"
      subtitle="Register a perimeter firewall: model, management address, firmware, and support dates."
    />
  );
}
