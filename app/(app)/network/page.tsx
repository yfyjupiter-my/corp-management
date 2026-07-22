import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { VerifyButton } from "@/components/ui/VerifyButton";
import { isStale, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** Network module (PRD Story 2): ISP circuits + devices. RLS-scoped. */
export default async function NetworkPage() {
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
        title="Network"
        subtitle="ISP circuits, routers, firewalls, switches, and access points."
        actions={
          <DropdownMenu
            label="New"
            sm
            variant="ghost"
            items={[
              { label: "New circuit", href: "/network/circuits/new" },
              { label: "New VPN link", href: "/network/vpn/new" },
            ]}
          />
        }
      />

      <div className="flex flex-col gap-3.5">
        <Panel>
          <PanelHeader title={`Devices · ${deviceRows.length}`} />
          {deviceRows.length === 0 ? (
            <PanelEmpty>No network devices recorded yet.</PanelEmpty>
          ) : (
            <Table>
              <Thead
                columns={["Hostname", "Type", "Model", "Mgmt IP", "Warranty", "Status", ""]}
              />
              <tbody>
                {deviceRows.map((d) => (
                  <Tr key={d.id}>
                    <Td mono>{d.hostname ?? "—"}</Td>
                    <Td>
                      <span className="capitalize">{d.device_type}</span>
                    </Td>
                    <Td>
                      {d.brand} {d.model}
                    </Td>
                    <Td mono>{d.mgmt_ip ?? "—"}</Td>
                    <Td mono>{formatDate(d.warranty_end)}</Td>
                    <Td>
                      {isStale(d.last_verified_at) ? (
                        <Chip tone="warn">Stale</Chip>
                      ) : (
                        <Chip tone="ok">Fresh</Chip>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/network/${d.id}/edit`}>
                          <Button sm variant="ghost">
                            Edit
                          </Button>
                        </Link>
                        <VerifyButton table="network_devices" id={d.id} />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={`ISP circuits · ${circuitRows.length}`} />
          {circuitRows.length === 0 ? (
            <PanelEmpty>No ISP circuits recorded yet.</PanelEmpty>
          ) : (
            <Table>
              <Thead columns={["Provider", "Circuit ID", "Bandwidth", "Type", "Contract end"]} />
              <tbody>
                {circuitRows.map((c) => (
                  <Tr key={c.id}>
                    <Td>{c.provider}</Td>
                    <Td mono>{c.circuit_id ?? "—"}</Td>
                    <Td>{c.bandwidth ?? "—"}</Td>
                    <Td>
                      <span className="capitalize">{c.type}</span>
                    </Td>
                    <Td mono>{formatDate(c.contract_end)}</Td>
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
