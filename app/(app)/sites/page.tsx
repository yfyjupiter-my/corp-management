import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COUNTRY_LIST } from "@/lib/constants/countries";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { isStale, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Site registry grouped by country with per-country counts (PRD Story 1).
 * Archived sites are hidden by default and revealed via `?archived=1`. RLS scopes
 * the list, so a country manager only sees their own country's sites.
 */
export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";

  const supabase = await createClient();
  let query = supabase
    .from("sites")
    .select(
      "id, country_code, name, address, contact_name, contact_phone, last_verified_at, archived_at",
    )
    .order("name")
    .limit(50);
  if (!showArchived) query = query.is("archived_at", null);

  const { data: sites } = await query;
  const rows = sites ?? [];

  // Group visible sites by country; only render countries the user can see rows for.
  const byCountry = COUNTRY_LIST.map((c) => ({
    meta: c,
    sites: rows.filter((s) => s.country_code === c.code),
  })).filter((g) => g.sites.length > 0);

  return (
    <>
      <PageHead
        eyebrow="Registry"
        title="Sites"
        subtitle="Offices and infrastructure locations, grouped by country."
        actions={
          <div className="flex items-center gap-2">
            <Link href={showArchived ? "/sites" : "/sites?archived=1"}>
              <Button sm variant="subtle">
                {showArchived ? "Hide archived" : "Show archived"}
              </Button>
            </Link>
            <Link href="/sites/new">
              <Button sm>+ New site</Button>
            </Link>
          </div>
        }
      />

      {byCountry.length === 0 ? (
        <Panel>
          <PanelEmpty>
            No sites registered yet.{" "}
            <Link href="/sites/new" className="text-accent underline">
              Add the first site
            </Link>
            .
          </PanelEmpty>
        </Panel>
      ) : (
        <div className="flex flex-col gap-3.5">
          {byCountry.map(({ meta, sites }) => (
            <Panel key={meta.code}>
              <PanelHeader title={`${meta.name} · ${sites.length} site(s)`} />
              <Table>
                <Thead columns={["Site", "Contact", "Verified", "Status", ""]} />
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
                        {s.archived_at ? (
                          <Chip tone="neutral">Archived</Chip>
                        ) : isStale(s.last_verified_at) ? (
                          <Chip tone="warn">Stale</Chip>
                        ) : (
                          <Chip tone="ok">Fresh</Chip>
                        )}
                      </Td>
                      <Td>
                        <Link href={`/sites/${s.id}`} className="text-accent text-[12px] hover:underline">
                          View →
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
