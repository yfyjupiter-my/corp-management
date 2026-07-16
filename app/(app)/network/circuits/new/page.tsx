import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { CircuitForm } from "./CircuitForm";

export const dynamic = "force-dynamic";

/**
 * Add an ISP circuit (PRD Story 2). The site list is RLS-scoped, so a country
 * manager can only attach circuits to their own country's sites.
 */
export default async function NewCircuitPage() {
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, country_code")
    .is("archived_at", null)
    .order("name");

  return (
    <>
      <PageHead
        eyebrow="Network"
        title="New ISP circuit"
        subtitle="Register a fiber, broadband, or LTE circuit and its contract details."
      />
      <Panel className="max-w-3xl">
        <PanelHeader title="Circuit details" />
        <CircuitForm sites={sites ?? []} />
      </Panel>
    </>
  );
}
