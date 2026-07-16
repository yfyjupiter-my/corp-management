import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { recorderLabel } from "@/lib/utils/cctv";
import { CameraForm } from "../../new/CameraForm";

export const dynamic = "force-dynamic";

/**
 * Edit a CCTV camera (PRD Story 3). Both the camera and the recorder list are
 * RLS-scoped — a camera outside the caller's country returns not-found.
 */
export default async function EditCameraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: camera }, { data: recorders }] = await Promise.all([
    supabase
      .from("cctv_cameras")
      .select(
        "id, recorder_id, label, location_desc, camera_type, resolution, outdoor, status, notes, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("cctv_recorders").select("id, brand, model, location").order("location"),
  ]);

  if (!camera) notFound();

  const options = (recorders ?? []).map((r) => ({ id: r.id, label: recorderLabel(r) }));

  return (
    <>
      <PageHead eyebrow="CCTV" title="Edit camera" subtitle={camera.label} />
      <Panel className="max-w-3xl">
        <PanelHeader title="Camera details" />
        <CameraForm recorders={options} camera={camera} />
      </Panel>
    </>
  );
}
