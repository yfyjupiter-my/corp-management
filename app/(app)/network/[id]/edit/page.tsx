import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeviceForm } from "../../new/DeviceForm";

export const dynamic = "force-dynamic";

/**
 * Edit a network device (PRD Story 2, TASKS 4.3). Both the device and the site
 * list are RLS-scoped — a device outside the caller's country returns not-found.
 */
export default async function EditDevicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: device }, { data: sites }] = await Promise.all([
    supabase
      .from("network_devices")
      .select(
        "id, site_id, device_type, brand, model, hostname, mgmt_ip, firmware, serial, install_date, warranty_end, credential_ref, notes, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("sites").select("id, name, country_code").is("archived_at", null).order("name"),
  ]);

  if (!device) notFound();

  return (
    <DeviceForm
      sites={sites ?? []}
      device={device}
      eyebrow="Network"
      title="Edit device"
      subtitle={device.hostname ?? "Update device details."}
      panelClassName="max-w-3xl"
    />
  );
}
