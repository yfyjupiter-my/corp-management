import { createClient } from "@/lib/supabase/server";
import { RecorderForm } from "./RecorderForm";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Add a CCTV recorder (PRD Story 3). The site list is RLS-scoped, so a country
 * manager can only attach recorders to their own country's sites. `RecorderForm`
 * renders the page heading itself so its Cancel/Save actions sit on the title
 * line while staying inside the form element.
 */
export default async function NewRecorderPage() {
  const t = await getDictionary();
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, country_code")
    .is("archived_at", null)
    .order("name");

  return (
    <RecorderForm
      sites={sites ?? []}
      title={t.forms.pages.newRecorderTitle}
      subtitle={t.forms.pages.newRecorderSubtitle}
    />
  );
}
