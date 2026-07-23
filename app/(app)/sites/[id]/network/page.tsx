import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { IpSchemeForm } from "./IpSchemeForm";
import { VlanForm } from "./VlanForm";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Per-site IP/VLAN editor (PRD Story 2, TASKS 4.5). IP schemes and VLANs define a
 * site's addressing, so they're edited in the context of one site rather than a
 * global picker. Everything is RLS-scoped: another country's site → 404, and the
 * child inserts inherit the site's WITH CHECK policy.
 */
export default async function SiteNetworkPage({
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
    .select("id, name, country_code")
    .eq("id", id)
    .single();
  if (!site) notFound();

  const [ipSchemes, vlans] = await Promise.all([
    supabase.from("ip_schemes").select("id, subnet, gateway, dns, dhcp_range, notes").eq("site_id", id).order("subnet"),
    supabase.from("vlans").select("id, vlan_id, name, subnet, purpose").eq("site_id", id).order("vlan_id"),
  ]);

  const ipRows = ipSchemes.data ?? [];
  const vlanRows = vlans.data ?? [];

  return (
    <>
      <PageHead
        eyebrow={`${site.country_code} · ${t.countries[site.country_code]} · ${site.name}`}
        title={t.site.networkTitle}
        subtitle={t.site.networkSubtitle}
        actions={
          <Link href={`/sites/${site.id}`}>
            <Button sm variant="ghost">{t.site.backToSite}</Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3.5">
        <Panel>
          <PanelHeader title={`${t.site.panelIpSchemes} · ${ipRows.length}`} />
          {ipRows.length === 0 ? (
            <PanelEmpty>{t.site.noIpSchemesYet}</PanelEmpty>
          ) : (
            <Table>
              <Thead
                columns={[t.site.colSubnet, t.site.colGateway, t.site.colDns, t.site.colDhcpRange, t.site.colNotes]}
              />
              <tbody>
                {ipRows.map((s) => (
                  <Tr key={s.id}>
                    <Td mono>{s.subnet}</Td>
                    <Td mono>{s.gateway ?? "—"}</Td>
                    <Td mono>{s.dns ?? "—"}</Td>
                    <Td mono>{s.dhcp_range ?? "—"}</Td>
                    <Td>{s.notes ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          <div className="border-t border-border">
            <IpSchemeForm siteId={site.id} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={`${t.site.panelVlans} · ${vlanRows.length}`} />
          {vlanRows.length === 0 ? (
            <PanelEmpty>{t.site.noVlansYet}</PanelEmpty>
          ) : (
            <Table>
              <Thead columns={[t.site.colVlan, t.site.colName, t.site.colSubnet, t.site.colPurpose]} />
              <tbody>
                {vlanRows.map((v) => (
                  <Tr key={v.id}>
                    <Td mono>{v.vlan_id}</Td>
                    <Td>{v.name ?? "—"}</Td>
                    <Td mono>{v.subnet ?? "—"}</Td>
                    <Td>{v.purpose ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          <div className="border-t border-border">
            <VlanForm siteId={site.id} />
          </div>
        </Panel>
      </div>
    </>
  );
}
