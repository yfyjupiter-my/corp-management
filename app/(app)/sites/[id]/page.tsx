import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { CredentialRef } from "@/components/ui/CredentialRef";
import { ArchiveButton } from "../ArchiveButton";
import { isStale, formatDate, formatMoney } from "@/lib/utils/format";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Site detail (PRD Story 1 acceptance): the site plus the child inventory that
 * hangs off it — circuits, devices, IP scheme, VPN links, recorders. Everything
 * is RLS-scoped; requesting another country's site returns no row → 404.
 */
export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const t = await getDictionary();
  const supabase = await createClient();
  const { data: site } = await supabase.from("sites").select("*").eq("id", id).single();
  if (!site) notFound();

  const [circuits, devices, ipSchemes, vpnLinks, recorders] = await Promise.all([
    supabase.from("isp_circuits").select("id, provider, circuit_id, type, contract_end, monthly_cost").eq("site_id", id).order("provider"),
    supabase.from("network_devices").select("id, device_type, brand, model, hostname, mgmt_ip, credential_ref").eq("site_id", id).order("hostname"),
    supabase.from("ip_schemes").select("id, subnet, gateway, dns").eq("site_id", id).order("subnet"),
    supabase.from("vpn_links").select("id, peer, tunnel_type, status").eq("site_id", id).order("peer"),
    supabase.from("cctv_recorders").select("id, brand, model, channels, retention_days, location").eq("site_id", id).order("location"),
  ]);

  return (
    <>
      <PageHead
        eyebrow={`${site.country_code} · ${t.countries[site.country_code]}`}
        title={site.name}
        subtitle={site.address ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <ArchiveButton id={site.id} archived={Boolean(site.archived_at)} />
            <Link href={`/sites/${site.id}/edit`}>
              <Button sm>{t.common.edit}</Button>
            </Link>
          </div>
        }
      />

      {/* Metadata panel */}
      <Panel className="mb-3.5">
        <PanelHeader
          title={t.site.overview}
          actions={
            site.archived_at ? (
              <Chip tone="neutral">{t.common.archived}</Chip>
            ) : isStale(site.last_verified_at) ? (
              <Chip tone="warn">{t.common.stale}</Chip>
            ) : (
              <Chip tone="ok">{t.common.fresh}</Chip>
            )
          }
        />
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 p-[18px] text-[13px]">
          <Meta label={t.site.timezone} value={site.timezone} mono />
          <Meta label={t.site.currency} value={site.currency} mono />
          <Meta label={t.site.contact} value={site.contact_name ?? "—"} />
          <Meta label={t.site.phone} value={site.contact_phone ?? "—"} mono />
          <Meta label={t.site.email} value={site.contact_email ?? "—"} />
          <Meta label={t.site.lastVerified} value={formatDate(site.last_verified_at)} mono />
        </dl>
        {site.notes && (
          <div className="px-[18px] pb-[18px] text-[13px] text-fg-muted whitespace-pre-wrap">
            {site.notes}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChildPanel manage={t.site.manage} title={t.site.panelCircuits} count={circuits.data?.length} href="/network">
          {circuits.data?.length ? (
            <Table>
              <Thead
                columns={[t.columns.provider, t.site.colCircuit, t.columns.type, t.columns.contractEnd, t.site.colMonthly]}
              />
              <tbody>
                {circuits.data.map((c) => (
                  <Tr key={c.id}>
                    <Td>{c.provider}</Td>
                    <Td mono>{c.circuit_id ?? "—"}</Td>
                    <Td>{t.enums.circuitType[c.type]}</Td>
                    <Td mono>{formatDate(c.contract_end)}</Td>
                    <Td mono>{formatMoney(c.monthly_cost, site.currency)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <PanelEmpty>{t.site.noCircuits}</PanelEmpty>
          )}
        </ChildPanel>

        <ChildPanel manage={t.site.manage} title={t.site.panelDevices} count={devices.data?.length} href="/network">
          {devices.data?.length ? (
            <Table>
              <Thead
                columns={[t.columns.hostname, t.columns.type, t.columns.model, t.site.colMgmtIp, t.site.colCredential]}
              />
              <tbody>
                {devices.data.map((d) => (
                  <Tr key={d.id}>
                    <Td mono>{d.hostname ?? "—"}</Td>
                    <Td>{t.enums.deviceType[d.device_type]}</Td>
                    <Td>{d.brand} {d.model}</Td>
                    <Td mono>{d.mgmt_ip ?? "—"}</Td>
                    <Td><CredentialRef value={d.credential_ref} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <PanelEmpty>{t.site.noDevices}</PanelEmpty>
          )}
        </ChildPanel>

        <ChildPanel manage={t.site.manage} title={t.site.panelIpSchemes} count={ipSchemes.data?.length} href={`/sites/${site.id}/network`}>
          {ipSchemes.data?.length ? (
            <Table>
              <Thead columns={[t.site.colSubnet, t.site.colGateway, t.site.colDns]} />
              <tbody>
                {ipSchemes.data.map((s) => (
                  <Tr key={s.id}>
                    <Td mono>{s.subnet}</Td>
                    <Td mono>{s.gateway ?? "—"}</Td>
                    <Td mono>{s.dns ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <PanelEmpty>{t.site.noIpSchemes}</PanelEmpty>
          )}
        </ChildPanel>

        <ChildPanel manage={t.site.manage} title={t.site.panelVpn} count={vpnLinks.data?.length}>
          {vpnLinks.data?.length ? (
            <Table>
              <Thead columns={[t.site.colPeer, t.site.colTunnel, t.columns.status]} />
              <tbody>
                {vpnLinks.data.map((v) => (
                  <Tr key={v.id}>
                    <Td>{v.peer ?? "—"}</Td>
                    <Td>{v.tunnel_type ?? "—"}</Td>
                    <Td>
                      <Chip tone={v.status === "up" ? "ok" : v.status === "down" ? "danger" : "neutral"}>
                        {t.enums.vpnStatus[v.status]}
                      </Chip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <PanelEmpty>{t.site.noVpn}</PanelEmpty>
          )}
        </ChildPanel>

        <ChildPanel manage={t.site.manage} title={t.site.panelRecorders} count={recorders.data?.length} href="/cctv">
          {recorders.data?.length ? (
            <Table>
              <Thead columns={[t.columns.location, t.columns.model, t.columns.channels, t.columns.retention]} />
              <tbody>
                {recorders.data.map((r) => (
                  <Tr key={r.id}>
                    <Td>{r.location ?? "—"}</Td>
                    <Td>{r.brand} {r.model}</Td>
                    <Td mono>{r.channels ?? "—"}</Td>
                    <Td mono>{r.retention_days != null ? `${r.retention_days}d` : "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <PanelEmpty>{t.site.noRecorders}</PanelEmpty>
          )}
        </ChildPanel>
      </div>
    </>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-subtle">{label}</dt>
      <dd className={"mt-0.5 " + (mono ? "font-mono text-[12.5px]" : "")}>{value}</dd>
    </div>
  );
}

function ChildPanel({
  title,
  count,
  href,
  manage,
  children,
}: {
  title: string;
  count?: number;
  href?: string;
  manage: string;
  children: React.ReactNode;
}) {
  return (
    <Panel>
      <PanelHeader
        title={`${title}${count != null ? ` · ${count}` : ""}`}
        actions={
          href ? (
            <Link href={href as never} className="text-accent text-[12px] hover:underline">
              {manage}
            </Link>
          ) : undefined
        }
      />
      {children}
    </Panel>
  );
}
