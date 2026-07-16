import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { COUNTRY_LIST, isCountryCode } from "@/lib/constants/countries";
import { daysUntil, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const WINDOWS = [30, 60, 90] as const;

type Renewal = {
  kind: "ISP contract" | "Device warranty";
  label: string;
  country: string | undefined;
  end: string;
  days: number;
};

/**
 * Renewals view (PRD Story 6). ISP contract ends + device warranty ends inside
 * a 30/60/90-day window, sorted soonest-first and filterable by country.
 * Country is resolved through the parent site (circuit/device → site → country).
 * All queries are RLS-scoped, so a country manager only ever sees their own.
 */
export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; country?: string }>;
}) {
  const { window, country } = await searchParams;
  const days = WINDOWS.includes(Number(window) as (typeof WINDOWS)[number])
    ? Number(window)
    : 90;
  const countryFilter = country && isCountryCode(country) ? country : undefined;

  const user = await getCurrentUser();
  const isHq = user?.role === "hq_admin";

  const supabase = await createClient();
  const [sites, circuits, devices] = await Promise.all([
    supabase.from("sites").select("id, country_code"),
    supabase.from("isp_circuits").select("provider, circuit_id, contract_end, site_id"),
    supabase.from("network_devices").select("hostname, model, warranty_end, site_id"),
  ]);

  // ROB-5: a resolved-with-.error query shouldn't masquerade as "nothing due".
  const failed = !!sites.error || !!circuits.error || !!devices.error;
  for (const [name, res] of Object.entries({ sites, circuits, devices })) {
    if (res.error) console.error(`[renewals] ${name} query failed:`, res.error);
  }

  const countryBySite = new Map((sites.data ?? []).map((s) => [s.id, s.country_code]));

  const rows: Renewal[] = [];
  for (const c of circuits.data ?? []) {
    const d = daysUntil(c.contract_end);
    if (d != null && d <= days) {
      rows.push({
        kind: "ISP contract",
        label: c.provider + (c.circuit_id ? ` · ${c.circuit_id}` : ""),
        country: countryBySite.get(c.site_id),
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
        country: countryBySite.get(dev.site_id),
        end: dev.warranty_end!,
        days: d,
      });
    }
  }

  const filtered = countryFilter
    ? rows.filter((r) => r.country === countryFilter)
    : rows;
  filtered.sort((a, b) => a.days - b.days);

  // HQ can slice by any country; a country manager is already RLS-scoped to one.
  const countryTabs = isHq
    ? COUNTRY_LIST
    : COUNTRY_LIST.filter((c) => c.code === user?.countryCode);
  const withCountry = (params: { window?: number; country?: string | null }) => {
    const w = params.window ?? days;
    const c = params.country === undefined ? countryFilter : params.country;
    const qs = new URLSearchParams({ window: String(w) });
    if (c) qs.set("country", c);
    return `/renewals?${qs.toString()}`;
  };

  return (
    <>
      <PageHead
        eyebrow="Attention"
        title="Renewals"
        subtitle="ISP contracts and device warranties approaching their end date."
      />

      {/* Window selector */}
      <div className="flex gap-2 mb-3">
        {WINDOWS.map((w) => (
          <a
            key={w}
            href={withCountry({ window: w })}
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

      {/* Country filter — HQ only sees more than one tab */}
      {countryTabs.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <a
            href={withCountry({ country: null })}
            className={
              "px-3 py-1.5 rounded-pill text-[12px] font-semibold font-head border " +
              (!countryFilter
                ? "bg-primary text-primary-fg border-primary"
                : "bg-surface text-fg-muted border-border-strong hover:bg-surface-2")
            }
          >
            All countries
          </a>
          {countryTabs.map((c) => (
            <a
              key={c.code}
              href={withCountry({ country: c.code })}
              className={
                "px-3 py-1.5 rounded-pill text-[12px] font-semibold font-head border " +
                (countryFilter === c.code
                  ? "bg-primary text-primary-fg border-primary"
                  : "bg-surface text-fg-muted border-border-strong hover:bg-surface-2")
              }
            >
              {c.code}
            </a>
          ))}
        </div>
      )}

      <Panel>
        <PanelHeader
          title={
            failed
              ? "Renewal data unavailable"
              : `${filtered.length} item(s) within ${days} days${
                  countryFilter ? ` · ${countryFilter}` : ""
                }`
          }
        />
        {failed ? (
          <PanelEmpty>
            Renewal data is temporarily unavailable. Please try again.
          </PanelEmpty>
        ) : filtered.length === 0 ? (
          <PanelEmpty>
            Nothing expiring in the next {days} days
            {countryFilter ? ` in ${countryFilter}` : ""}.
          </PanelEmpty>
        ) : (
          <Table>
            <Thead columns={["Type", "Item", "Country", "Ends", "In"]} />
            <tbody>
              {filtered.map((r, i) => (
                <Tr key={i}>
                  <Td>
                    <Chip tone={r.kind === "ISP contract" ? "info" : "neutral"}>{r.kind}</Chip>
                  </Td>
                  <Td>{r.label}</Td>
                  <Td mono>{r.country ?? "—"}</Td>
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
