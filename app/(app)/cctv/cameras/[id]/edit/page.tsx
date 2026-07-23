import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recorderLabel } from "@/lib/utils/cctv";
import { CameraForm } from "../../new/CameraForm";
import { getDictionary } from "@/lib/i18n/server";

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
  const t = await getDictionary();
  const supabase = await createClient();

  const [{ data: camera }, { data: recorders }, { data: sites }] = await Promise.all([
    supabase
      .from("cctv_cameras")
      .select(
        "id, recorder_id, label, location_desc, camera_type, resolution, outdoor, status, notes, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("cctv_recorders").select("id, site_id, brand, model, location").order("location"),
    supabase.from("sites").select("id, name, country_code").order("name"),
  ]);

  if (!camera) notFound();

  const options = (recorders ?? []).map((r) => ({
    id: r.id,
    site_id: r.site_id,
    label: recorderLabel(r),
  }));

  return (
    <CameraForm
      sites={sites ?? []}
      recorders={options}
      camera={camera}
      eyebrow={t.nav.cctv}
      title={t.forms.pages.editCameraTitle}
      subtitle={camera.label}
    />
  );
}
