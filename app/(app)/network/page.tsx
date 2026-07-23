import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { isStale, formatDate } from "@/lib/utils/format";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Network module (PRD Story 2): ISP circuits + devices. RLS-scoped. */
export default async function NetworkPage() {
  const t = await getDictionary();
  const supabase = await createClient();

  const [devices, circuits] = await Promise.all([
    supabase
      .from("network_devices")
      .select("id, device_type, brand, model, hostname, mgmt_ip, warranty_end, last_verified_at")
      .order("hostname")
      .limit(50),
    supabase
      .from("isp_circuits")
      .select("id, provider, circuit_id, bandwidth, type, contract_end, last_verified_at")
      .order("provider")
      .limit(50),
  ]);

  const deviceRows = devices.data ?? [];
  const circuitRows = circuits.data ?? [];

  return (
    <>
      <PageHead
        title={t.network.title}
        subtitle={t.network.subtitle}
        actions={
          <DropdownMenu
            label={t.common.new}
            sm
            variant="ghost"
            items={[
              { label: t.network.newCircuit, href: "/network/circuits/new" },
              { label: t.network.newFirewall, href: "/network/firewalls/new" },
            ]}
          />
        }
      />

      <div className="flex flex-col gap-3.5">
        <Panel>
          <PanelHeader title={`${t.network.panelDevices} · ${deviceRows.length}`} />
          {deviceRows.length === 0 ? (
            <PanelEmpty>{t.network.noDevices}</PanelEmpty>
          ) : (
            <Table>
              <Thead
                columns={[
                  t.columns.hostname,
                  t.columns.type,
                  t.columns.model,
                  t.site.colMgmtIp,
                  t.columns.warranty,
                  t.columns.status,
                  "",
                ]}
              />
              <tbody>
                {deviceRows.map((d) => (
                  <Tr key={d.id}>
                    <Td mono>{d.hostname ?? "—"}</Td>
                    <Td>
                      {t.enums.deviceType[d.device_type]}
                    </Td>
                    <Td>
                      {d.brand} {d.model}
                    </Td>
                    <Td mono>{d.mgmt_ip ?? "—"}</Td>
                    <Td mono>{formatDate(d.warranty_end)}</Td>
                    <Td>
                      {isStale(d.last_verified_at) ? (
                        <Chip tone="warn">{t.common.stale}</Chip>
                      ) : (
                        <Chip tone="ok">{t.common.fresh}</Chip>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/network/${d.id}/edit`}>
                          <Button sm variant="ghost">
                            {t.common.edit}
                          </Button>
                        </Link>
                        <DeleteButton
                          endpoint={`/api/devices/${d.id}`}
                          confirm={t.network.deleteConfirm(
                            d.hostname ?? `${d.brand} ${d.model}`,
                          )}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={`${t.network.panelCircuits} · ${circuitRows.length}`} />
          {circuitRows.length === 0 ? (
            <PanelEmpty>{t.network.noCircuits}</PanelEmpty>
          ) : (
            <Table>
              <Thead
                columns={[
                  t.columns.provider,
                  t.columns.circuitId,
                  t.columns.bandwidth,
                  t.columns.type,
                  t.columns.contractEnd,
                  "",
                ]}
              />
              <tbody>
                {circuitRows.map((c) => (
                  <Tr key={c.id}>
                    <Td>{c.provider}</Td>
                    <Td mono>{c.circuit_id ?? "—"}</Td>
                    <Td>{c.bandwidth ?? "—"}</Td>
                    <Td>
                      {t.enums.circuitType[c.type]}
                    </Td>
                    <Td mono>{formatDate(c.contract_end)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/network/circuits/${c.id}/edit`}>
                          <Button sm variant="ghost">
                            {t.common.edit}
                          </Button>
                        </Link>
                        <DeleteButton
                          endpoint={`/api/circuits/${c.id}`}
                          confirm={t.network.deleteCircuitConfirm(
                            c.circuit_id ? `${c.provider} · ${c.circuit_id}` : c.provider,
                          )}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
