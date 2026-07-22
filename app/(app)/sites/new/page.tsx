import { SiteForm } from "../SiteForm";

export const dynamic = "force-dynamic";

/**
 * Register a new site (PRD Story 1). RLS + the WITH CHECK policy ensure a country
 * manager can only create sites for their own country regardless of form input.
 * The form owns the heading so Cancel/Save render on the title line.
 */
export default function NewSitePage() {
  return (
    <SiteForm
      title="New site"
      subtitle="Register an office or infrastructure location. All records hang off a site."
    />
  );
}
