import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { RecorderForm } from "../../new/RecorderForm";

export const dynamic = "force-dynamic";

/**
 * Edit a CCTV recorder (PRD Story 3). Both the recorder and the site list are
 * RLS-scoped — a recorder outside the caller's country returns not-found.
 */
export default async function EditRecorderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: recorder }, { data: sites }] = await Promise.all([
    supabase
      .from("cctv_recorders")
      .select(
        "id, site_id, brand, model, channels, storage_tb, retention_days, firmware, mgmt_ip, location, notes, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("sites").select("id, name, country_code").is("archived_at", null).order("name"),
  ]);

  if (!recorder) notFound();

  return (
    <>
      <PageHead
        eyebrow="CCTV"
        title="Edit recorder"
        subtitle={[recorder.brand, recorder.model].filter(Boolean).join(" ") || "Update recorder details."}
      />
      <Panel className="max-w-3xl">
        <PanelHeader title="Recorder details" />
        <RecorderForm sites={sites ?? []} recorder={recorder} />
      </Panel>
    </>
  );
}
