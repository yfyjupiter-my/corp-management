import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isCountryCode, COUNTRIES } from "@/lib/constants/countries";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { isStale, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** Country-scoped site registry (PRD Story 1). RLS blocks other countries. */
export default async function CountryPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!isCountryCode(code)) notFound();

  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .eq("country_code", code)
    .order("name")
    .limit(50);

  const meta = COUNTRIES[code];

  return (
    <>
      <PageHead
        eyebrow={`${meta.code} · ${meta.timezone}`}
        title={`${meta.name} sites`}
        subtitle={`Offices and infrastructure locations in ${meta.name}.`}
        actions={
          <Link href="/network/new">
            <Button sm>+ New site</Button>
          </Link>
        }
      />

      <Panel>
        <PanelHeader title={`${sites?.length ?? 0} site(s)`} />
        {!sites || sites.length === 0 ? (
          <PanelEmpty>No sites registered yet for {meta.name}.</PanelEmpty>
        ) : (
          <Table>
            <Thead columns={["Site", "Contact", "Verified", "Status"]} />
            <tbody>
              {sites.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="font-medium">{s.name}</div>
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
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
