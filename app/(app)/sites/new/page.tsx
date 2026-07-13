import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { SiteForm } from "../SiteForm";

export const dynamic = "force-dynamic";

/**
 * Register a new site (PRD Story 1). RLS + the WITH CHECK policy ensure a country
 * manager can only create sites for their own country regardless of form input.
 */
export default function NewSitePage() {
  return (
    <>
      <PageHead
        eyebrow="Sites"
        title="New site"
        subtitle="Register an office or infrastructure location. All records hang off a site."
      />
      <Panel className="max-w-3xl">
        <PanelHeader title="Site details" />
        <SiteForm />
      </Panel>
    </>
  );
}
