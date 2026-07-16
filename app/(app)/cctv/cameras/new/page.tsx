import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { recorderLabel } from "@/lib/utils/cctv";
import { CameraForm } from "./CameraForm";

export const dynamic = "force-dynamic";

/**
 * Add a CCTV camera (PRD Story 3), scoped to a recorder. The recorder list is
 * RLS-scoped, so a country manager can only attach cameras to recorders on
 * their own country's sites.
 */
export default async function NewCameraPage() {
  const supabase = await createClient();
  const { data: recorders } = await supabase
    .from("cctv_recorders")
    .select("id, brand, model, location")
    .order("location");

  const options = (recorders ?? []).map((r) => ({ id: r.id, label: recorderLabel(r) }));

  return (
    <>
      <PageHead
        eyebrow="CCTV"
        title="New camera"
        subtitle="Register a camera against a recorder."
      />
      <Panel className="max-w-3xl">
        <PanelHeader title="Camera details" />
        {options.length === 0 ? (
          <PanelEmpty>
            No recorders yet — <Link href="/cctv/recorders/new" className="text-accent">add a recorder</Link> first.
          </PanelEmpty>
        ) : (
          <CameraForm recorders={options} />
        )}
      </Panel>
    </>
  );
}
