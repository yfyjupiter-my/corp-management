import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SiteForm } from "../../SiteForm";
import type { SiteInput } from "@/lib/validation/site";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Edit an existing site (PRD Story 1). RLS returns no row for other countries → 404. */
export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const t = await getDictionary();

  const supabase = await createClient();
  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, updated_at, country_code, name, address, timezone, currency, contact_name, contact_phone, contact_email, notes",
    )
    .eq("id", id)
    .single();
  if (!site) notFound();

  // Map DB nulls to the form's optional strings. `updated_at` rides along for
  // BUS-6 optimistic concurrency — the form echoes it back on save.
  const initial: SiteInput & { id: string; updated_at: string } = {
    id: site.id,
    updated_at: site.updated_at,
    country_code: site.country_code,
    name: site.name,
    address: site.address ?? undefined,
    timezone: site.timezone,
    currency: site.currency,
    contact_name: site.contact_name ?? undefined,
    contact_phone: site.contact_phone ?? undefined,
    contact_email: site.contact_email ?? undefined,
    notes: site.notes ?? undefined,
  };

  return (
    <SiteForm
      site={initial}
      eyebrow={t.nav.sites}
      title={t.forms.pages.editSiteTitle(site.name)}
      subtitle={t.forms.pages.editSiteSubtitle}
    />
  );
}
