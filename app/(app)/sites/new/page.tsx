import { SiteForm } from "../SiteForm";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Register a new site (PRD Story 1). RLS + the WITH CHECK policy ensure a country
 * manager can only create sites for their own country regardless of form input.
 * The form owns the heading so Cancel/Save render on the title line.
 */
export default async function NewSitePage() {
  const t = await getDictionary();
  return (
    <SiteForm
      title={t.forms.pages.newSiteTitle}
      subtitle={t.forms.pages.newSiteSubtitle}
    />
  );
}
