import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COUNTRY_LIST } from "@/lib/constants/countries";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { isStale, formatDate, orDash } from "@/lib/utils/format";
import { getDictionary } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Shared column widths for every country panel. Each country renders its own
 * <table>, and auto layout would size each one to its own rows — a country with
 * one short site would draw visibly narrower columns than one with a long
 * address. Fixed widths keep the stacked panels reading as a single registry.
 */
const SITE_COL_WIDTHS = ["30%", "20%", "15%", "15%", "20%"];

/**
 * Site registry grouped by country with per-country counts (PRD Story 1).
 * Archived sites are never listed. RLS scopes the list, so a country manager
 * only sees their own country's sites.
 */
export default async function SitesPage() {
  const t = await getDictionary();
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select(
      "id, country_code, name, address, contact_name, contact_phone, last_verified_at",
    )
    .is("archived_at", null)
    .order("name")
    .limit(50);
  const rows = sites ?? [];

  /*
   * Which countries get a panel. HQ sees all four so the registry reads the
   * same shape whatever the data holds — a country with no sites yet shows an
   * empty panel rather than vanishing, which is indistinguishable from a
   * filtered-out or broken query. A country manager still sees only their own,
   * mirroring the Sidebar rule; RLS remains the actual boundary, so an
   * unexpected country here would render an empty panel, never other data.
   */
  const visible =
    user?.role === "hq_admin"
      ? COUNTRY_LIST
      : COUNTRY_LIST.filter((c) => c.code === user?.countryCode);

  const byCountry = visible.map((c) => ({
    meta: c,
    sites: rows.filter((s) => s.country_code === c.code),
  }));

  return (
    <>
      <PageHead
        title={t.sites.title}
        subtitle={t.sites.subtitle}
        actions={
          <Link href="/sites/new">
            <Button sm>{t.sites.newAction}</Button>
          </Link>
        }
      />

      {byCountry.length === 0 ? (
        <Panel>
          <PanelEmpty>
            {t.sites.noneYet}{" "}
            <Link href="/sites/new" className="text-accent underline">
              {t.sites.addFirst}
            </Link>
          </PanelEmpty>
        </Panel>
      ) : (
        <div className="flex flex-col gap-3.5">
          {byCountry.map(({ meta, sites }) => (
            <Panel key={meta.code}>
              <PanelHeader title={`${t.countries[meta.code]} · ${t.country.siteCount(sites.length)}`} />
              {sites.length === 0 ? (
                <PanelEmpty>
                  {t.country.noSites(t.countries[meta.code])}{" "}
                  <Link href="/sites/new" className="text-accent underline">
                    {t.sites.addFirst}
                  </Link>
                </PanelEmpty>
              ) : (
                <Table fixed>
                  <Thead
                    columns={[t.columns.site, t.columns.contact, t.columns.verified, t.columns.status, ""]}
                    widths={SITE_COL_WIDTHS}
                  />
                  <tbody>
                    {sites.map((s) => (
                      <Tr key={s.id}>
                        <Td>
                          <Link href={`/sites/${s.id}`} className="font-medium hover:text-accent">
                            {s.name}
                          </Link>
                          <div className="text-fg-subtle text-[11.5px]">{orDash(s.address)}</div>
                        </Td>
                        <Td>
                          <div>{orDash(s.contact_name)}</div>
                          <div className="text-fg-subtle text-[11.5px] font-mono">
                            {s.contact_phone ?? ""}
                          </div>
                        </Td>
                        <Td mono>{formatDate(s.last_verified_at)}</Td>
                        <Td>
                          {isStale(s.last_verified_at) ? (
                            <Chip tone="warn">{t.common.stale}</Chip>
                          ) : (
                            <Chip tone="ok">{t.common.fresh}</Chip>
                          )}
                        </Td>
                        <Td>
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/sites/${s.id}/edit`}>
                              <Button sm variant="ghost">
                                {t.common.edit}
                              </Button>
                            </Link>
                            <DeleteButton
                              endpoint={`/api/sites/${s.id}`}
                              confirm={t.sites.deleteConfirm(s.name)}
                            />
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
