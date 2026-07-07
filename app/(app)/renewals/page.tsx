import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { daysUntil, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type Renewal = {
  kind: "ISP contract" | "Device warranty";
  label: string;
  end: string;
  days: number;
};

/**
 * Renewals view (PRD Story 6). Contract ends + warranty ends inside a window.
 * Window defaults to 90 days; ?window=30|60|90 narrows it. In-app only (MVP).
 */
export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const { window } = await searchParams;
  const days = [30, 60, 90].includes(Number(window)) ? Number(window) : 90;

  const supabase = await createClient();
  const [circuits, devices] = await Promise.all([
    supabase.from("isp_circuits").select("provider, circuit_id, contract_end"),
    supabase.from("network_devices").select("hostname, model, warranty_end"),
  ]);

  const rows: Renewal[] = [];
  for (const c of circuits.data ?? []) {
    const d = daysUntil(c.contract_end);
    if (d != null && d <= days) {
      rows.push({
        kind: "ISP contract",
        label: c.provider + (c.circuit_id ? ` · ${c.circuit_id}` : ""),
        end: c.contract_end!,
        days: d,
      });
    }
  }
  for (const dev of devices.data ?? []) {
    const d = daysUntil(dev.warranty_end);
    if (d != null && d <= days) {
      rows.push({
        kind: "Device warranty",
        label: dev.hostname ?? dev.model ?? "device",
        end: dev.warranty_end!,
        days: d,
      });
    }
  }
  rows.sort((a, b) => a.days - b.days);

  return (
    <>
      <PageHead
        eyebrow="Attention"
        title="Renewals"
        subtitle="ISP contracts and device warranties approaching their end date."
      />

      <div className="flex gap-2 mb-4">
        {[30, 60, 90].map((w) => (
          <a
            key={w}
            href={`/renewals?window=${w}`}
            className={
              "px-3 py-1.5 rounded-pill text-[12px] font-semibold font-head border " +
              (w === days
                ? "bg-accent text-accent-fg border-accent"
                : "bg-surface text-fg-muted border-border-strong hover:bg-surface-2")
            }
          >
            Next {w} days
          </a>
        ))}
      </div>

      <Panel>
        <PanelHeader title={`${rows.length} item(s) within ${days} days`} />
        {rows.length === 0 ? (
          <PanelEmpty>Nothing expiring in the next {days} days.</PanelEmpty>
        ) : (
          <Table>
            <Thead columns={["Type", "Item", "Ends", "In"]} />
            <tbody>
              {rows.map((r, i) => (
                <Tr key={i}>
                  <Td>
                    <Chip tone={r.kind === "ISP contract" ? "info" : "neutral"}>{r.kind}</Chip>
                  </Td>
                  <Td>{r.label}</Td>
                  <Td mono>{formatDate(r.end)}</Td>
                  <Td>
                    <Chip tone={r.days <= 0 ? "danger" : r.days <= 30 ? "warn" : "neutral"}>
                      {r.days <= 0 ? "Expired" : `${r.days}d`}
                    </Chip>
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
