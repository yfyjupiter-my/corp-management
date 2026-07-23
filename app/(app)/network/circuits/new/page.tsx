import { createClient } from "@/lib/supabase/server";
import { CircuitForm } from "./CircuitForm";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Add an ISP circuit (PRD Story 2). The site list is RLS-scoped, so a country
 * manager can only attach circuits to their own country's sites. The form owns
 * the heading so Cancel/Save render on the title line.
 */
export default async function NewCircuitPage() {
  const t = await getDictionary();
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, country_code")
    .is("archived_at", null)
    .order("name");

  return (
    <CircuitForm
      sites={sites ?? []}
      title={t.forms.pages.newCircuitTitle}
      subtitle={t.forms.pages.newCircuitSubtitle}
    />
  );
}
