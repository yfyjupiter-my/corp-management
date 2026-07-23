import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COUNTRY_LIST } from "@/lib/constants/countries";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { isStale, formatDate } from "@/lib/utils/format";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Site registry grouped by country with per-country counts (PRD Story 1).
 * Archived sites are never listed. RLS scopes the list, so a country manager
 * only sees their own country's sites.
 */
export default async function SitesPage() {
  const t = await getDictionary();
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

  // Group visible sites by country; only render countries the user can see rows for.
  const byCountry = COUNTRY_LIST.map((c) => ({
    meta: c,
    sites: rows.filter((s) => s.country_code === c.code),
  })).filter((g) => g.sites.length > 0);

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
              <Table>
                <Thead
                  columns={[t.columns.site, t.columns.contact, t.columns.verified, t.columns.status, ""]}
                />
                <tbody>
                  {sites.map((s) => (
                    <Tr key={s.id}>
                      <Td>
                        <Link href={`/sites/${s.id}`} className="font-medium hover:text-accent">
                          {s.name}
                        </Link>
                        <div className="text-fg-subtle text-[11.5px]">{s.address ?? "—"}</div>
                      </Td>
                      <Td>
                        <div>{s.contact_name ?? "—"}</div>
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
                        <Link href={`/sites/${s.id}`} className="text-accent text-[12px] hover:underline">
                          {t.sites.view}
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
