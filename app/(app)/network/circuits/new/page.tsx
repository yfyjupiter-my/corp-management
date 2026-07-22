import { createClient } from "@/lib/supabase/server";
import { CircuitForm } from "./CircuitForm";

export const dynamic = "force-dynamic";

/**
 * Add an ISP circuit (PRD Story 2). The site list is RLS-scoped, so a country
 * manager can only attach circuits to their own country's sites. The form owns
 * the heading so Cancel/Save render on the title line.
 */
export default async function NewCircuitPage() {
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, country_code")
    .is("archived_at", null)
    .order("name");

  return (
    <CircuitForm
      sites={sites ?? []}
      title="New ISP circuit"
      subtitle="Register a fiber, broadband, or LTE circuit and its contract details."
    />
  );
}
