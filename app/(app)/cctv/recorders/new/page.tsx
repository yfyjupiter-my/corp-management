import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { RecorderForm } from "./RecorderForm";

export const dynamic = "force-dynamic";

/**
 * Add a CCTV recorder (PRD Story 3). The site list is RLS-scoped, so a country
 * manager can only attach recorders to their own country's sites.
 */
export default async function NewRecorderPage() {
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, country_code")
    .is("archived_at", null)
    .order("name");

  return (
    <>
      <PageHead
        eyebrow="CCTV"
        title="New recorder"
        subtitle="Register an NVR/DVR, its capacity, and retention window."
      />
      <Panel className="max-w-3xl">
        <PanelHeader title="Recorder details" />
        <RecorderForm sites={sites ?? []} />
      </Panel>
    </>
  );
}
