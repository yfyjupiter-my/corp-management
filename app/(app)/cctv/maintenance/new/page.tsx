import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { recorderLabel } from "@/lib/utils/cctv";
import { MaintenanceLogForm, type TargetOption } from "./MaintenanceLogForm";

export const dynamic = "force-dynamic";

/**
 * Log a maintenance event (PRD Story 3, TASKS 5.4). Targets span the three
 * check-constrained tables (devices, recorders, cameras); all three lists are
 * RLS-scoped, so only assets the caller may see appear in the picker.
 */
export default async function NewMaintenanceLogPage() {
  const supabase = await createClient();

  const [devices, recorders, cameras] = await Promise.all([
    supabase.from("network_devices").select("id, hostname, brand, model").order("hostname").limit(200),
    supabase.from("cctv_recorders").select("id, brand, model, location").order("location").limit(200),
    supabase.from("cctv_cameras").select("id, label, location_desc").order("label").limit(200),
  ]);

  const targets: TargetOption[] = [
    ...(devices.data ?? []).map((d) => ({
      value: `network_devices:${d.id}`,
      label: d.hostname ?? ([d.brand, d.model].filter(Boolean).join(" ") || d.id.slice(0, 8)),
      group: "Network devices",
    })),
    ...(recorders.data ?? []).map((r) => ({
      value: `cctv_recorders:${r.id}`,
      label: recorderLabel(r),
      group: "Recorders",
    })),
    ...(cameras.data ?? []).map((c) => ({
      value: `cctv_cameras:${c.id}`,
      label: c.location_desc ? `${c.label} · ${c.location_desc}` : c.label,
      group: "Cameras",
    })),
  ];

  return (
    <>
      <PageHead
        eyebrow="CCTV"
        title="Log maintenance"
        subtitle="Record a maintenance event against a device, recorder, or camera."
      />
      <Panel className="max-w-3xl">
        <PanelHeader title="Maintenance event" />
        {targets.length === 0 ? (
          <PanelEmpty>No devices, recorders, or cameras to log against yet.</PanelEmpty>
        ) : (
          <MaintenanceLogForm targets={targets} />
        )}
      </Panel>
    </>
  );
}
