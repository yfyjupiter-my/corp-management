import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { DeviceForm } from "./DeviceForm";

export const dynamic = "force-dynamic";

/**
 * Add a network device (PRD Story 2). The site list is RLS-scoped, so a country
 * manager can only attach devices to their own country's sites.
 */
export default async function NewDevicePage() {
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, country_code")
    .is("archived_at", null)
    .order("name");

  return (
    <>
      <PageHead eyebrow="Network" title="New device" subtitle="Register a router, firewall, switch, or access point." />
      <Panel className="max-w-3xl">
        <PanelHeader title="Device details" />
        <DeviceForm sites={sites ?? []} />
      </Panel>
    </>
  );
}
