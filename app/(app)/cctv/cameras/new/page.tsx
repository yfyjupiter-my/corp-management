import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelEmpty } from "@/components/ui/Panel";
import { recorderLabel } from "@/lib/utils/cctv";
import { CameraForm } from "./CameraForm";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Add a CCTV camera (PRD Story 3), scoped to a recorder. The recorder list is
 * RLS-scoped, so a country manager can only attach cameras to recorders on
 * their own country's sites.
 */
export default async function NewCameraPage() {
  const t = await getDictionary();
  const supabase = await createClient();
  const [{ data: recorders }, { data: sites }] = await Promise.all([
    supabase.from("cctv_recorders").select("id, site_id, brand, model, location").order("location"),
    supabase.from("sites").select("id, name, country_code").order("name"),
  ]);

  const options = (recorders ?? []).map((r) => ({
    id: r.id,
    site_id: r.site_id,
    label: recorderLabel(r),
  }));

  // With no recorder to attach to there is nothing to submit, so the heading is
  // rendered here instead (the form owns it in the normal case, to put
  // Cancel/Save on the title line).
  if (options.length === 0) {
    return (
      <>
        <PageHead
          title={t.forms.pages.newCameraTitle}
          subtitle={t.forms.pages.newCameraSubtitle}
        />
        <Panel>
          <PanelEmpty>
            {t.forms.pages.noRecordersYet}{" "}
            <Link href="/cctv/recorders/new" className="text-accent">
              {t.forms.pages.addRecorderFirst}
            </Link>
          </PanelEmpty>
        </Panel>
      </>
    );
  }

  return (
    <CameraForm
      sites={sites ?? []}
      recorders={options}
      title={t.forms.pages.newCameraTitle}
      subtitle={t.forms.pages.newCameraSubtitle}
    />
  );
}
