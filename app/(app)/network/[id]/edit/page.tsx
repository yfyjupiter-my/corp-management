import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DeviceForm } from "../../new/DeviceForm";
import type { NetworkDeviceInput } from "@/lib/validation/network";
import { getDictionary } from "@/lib/i18n/server";

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
  // Reject a non-uuid before it reaches Postgres (mirrors the site edit page and
  // PATCH /api/devices/[id]) — an invalid cast is a 404 here, not a db error.
  if (!z.string().uuid().safeParse(id).success) notFound();
  const t = await getDictionary();
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

  // Map DB nulls to the form's optional strings. `updated_at` rides along for
  // BUS-6 optimistic concurrency — the form echoes it back on save.
  const initial: NetworkDeviceInput & { id: string; updated_at: string } = {
    id: device.id,
    updated_at: device.updated_at,
    site_id: device.site_id,
    device_type: device.device_type,
    brand: device.brand ?? undefined,
    model: device.model ?? undefined,
    hostname: device.hostname ?? undefined,
    mgmt_ip: device.mgmt_ip ?? undefined,
    firmware: device.firmware ?? undefined,
    serial: device.serial ?? undefined,
    install_date: device.install_date ?? undefined,
    warranty_end: device.warranty_end ?? undefined,
    credential_ref: device.credential_ref ?? undefined,
    notes: device.notes ?? undefined,
  };

  // Devices have no single required label — hostname is optional — so fall back
  // to brand/model and finally the type, the same identity the list's delete
  // confirmation shows.
  const label =
    device.hostname ||
    [device.brand, device.model].filter(Boolean).join(" ") ||
    t.enums.deviceType[device.device_type];

  return (
    <DeviceForm
      sites={sites ?? []}
      device={initial}
      eyebrow={t.nav.network}
      title={t.forms.pages.editDeviceTitle(label)}
      subtitle={t.forms.pages.editDeviceSubtitle}
    />
  );
}
