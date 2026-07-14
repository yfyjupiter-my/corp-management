import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi } from "@/components/ui/Kpi";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Chip } from "@/components/ui/Chip";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { COUNTRY_LIST, DEFAULT_MIN_RETENTION_DAYS } from "@/lib/constants/countries";
import { daysUntil, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Landing dashboard (PRD Story 5). Per-country cards + a renewals-soon table.
 * All queries are RLS-scoped, so a country manager sees only their country.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [sites, cameras, recorders, circuits, settings] = await Promise.all([
    supabase.from("sites").select("id, country_code").is("archived_at", null),
    supabase.from("cctv_cameras").select("id, status"),
    supabase.from("cctv_recorders").select("id, retention_days, site_id"),
    supabase.from("isp_circuits").select("id, contract_end, provider, site_id"),
    supabase.from("country_settings").select("country_code, min_retention_days"),
  ]);

  // ROB-5: a query can resolve with `.error` instead of rejecting; surface a
  // "data unavailable" state per card rather than silently showing 0.
  const failed = {
    sites: !!sites.error,
    cameras: !!cameras.error,
    recorders: !!recorders.error || !!sites.error, // retention check needs both
    circuits: !!circuits.error,
  };
  for (const [name, res] of Object.entries({ sites, cameras, recorders, circuits, settings })) {
    if (res.error) console.error(`[dashboard] ${name} query failed:`, res.error);
  }

  const siteRows = sites.data ?? [];
  const cameraRows = cameras.data ?? [];
  const recorderRows = recorders.data ?? [];
  const circuitRows = circuits.data ?? [];

  // BUS-5 / CODE-6: compare each recorder against its country's configured
  // minimum (country_settings is authoritative); the TS constant is only a
  // fallback when a country has no row yet.
  const countryBySite = new Map(siteRows.map((s) => [s.id, s.country_code]));
  const minByCountry = new Map(
    (settings.data ?? []).map((s) => [s.country_code, s.min_retention_days]),
  );
  const minRetentionFor = (siteId: string) => {
    const country = countryBySite.get(siteId);
    return (country && minByCountry.get(country)) ?? DEFAULT_MIN_RETENTION_DAYS;
  };

  const activeCameras = cameraRows.filter((c) => c.status === "active").length;
  const faultyCameras = cameraRows.filter((c) => c.status !== "active").length;
  const belowMinRetention = recorderRows.filter(
    (r) => (r.retention_days ?? 0) < minRetentionFor(r.site_id),
  ).length;
  const expiringSoon = circuitRows
    .map((c) => ({ ...c, days: daysUntil(c.contract_end) }))
    .filter((c) => c.days != null && c.days <= 90)
    .sort((a, b) => (a.days! - b.days!));

  const isHq = user?.role === "hq_admin";
  const countries = isHq
    ? COUNTRY_LIST
    : COUNTRY_LIST.filter((c) => c.code === user?.countryCode);

  return (
    <>
      <PageHead
        eyebrow="Overview"
        title="Registry dashboard"
        subtitle={
          isHq
            ? "Infrastructure health across all four SEA offices."
            : `Infrastructure health for ${user?.countryCode}.`
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <Kpi label="Active sites" value={failed.sites ? "—" : siteRows.length} />
        <Kpi
          label="Cameras online"
          value={failed.cameras ? "—" : activeCameras}
          unit={failed.cameras ? undefined : `/ ${cameraRows.length}`}
        />
        <Kpi
          label="Cameras faulty/offline"
          value={failed.cameras ? "—" : faultyCameras}
          accent={!failed.cameras && faultyCameras > 0 ? "danger" : "accent"}
        />
        <Kpi
          label="Circuits expiring ≤90d"
          value={failed.circuits ? "—" : expiringSoon.length}
          accent={!failed.circuits && expiringSoon.length > 0 ? "warn" : "accent"}
        />
      </div>

      {/* Per-country cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
        {countries.map((c) => {
          const cSites = siteRows.filter((s) => s.country_code === c.code).length;
          return (
            <Panel key={c.code}>
              <PanelHeader
                title={
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-fg-subtle">{c.code}</span>
                    {c.name}
                  </span>
                }
                actions={
                  c.code === "MY" ? <Chip tone="info">Pilot</Chip> : undefined
                }
              />
              <div className="grid grid-cols-3 divide-x divide-border">
                <Stat label="Sites" value={cSites} />
                <Stat label="Timezone" value={c.timezone.split("/")[1]?.replace("_", " ") ?? "—"} small />
                <Stat label="Currency" value={c.currency} />
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Attention: retention + renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <Panel>
          <PanelHeader title="Recorders below retention minimum" />
          <div className="px-4 py-3.5 text-[13px]">
            {failed.recorders ? (
              <span className="text-fg-subtle">Retention data unavailable.</span>
            ) : belowMinRetention === 0 ? (
              <span className="text-fg-muted">
                All recorders meet their country&rsquo;s retention minimum.
              </span>
            ) : (
              <Chip tone="danger">
                {belowMinRetention} recorder(s) below their country&rsquo;s minimum
              </Chip>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Circuits expiring within 90 days" />
          {failed.circuits ? (
            <div className="px-4 py-6 text-[13px] text-fg-subtle">Renewal data unavailable.</div>
          ) : expiringSoon.length === 0 ? (
            <div className="px-4 py-6 text-[13px] text-fg-subtle">Nothing expiring soon.</div>
          ) : (
            <Table>
              <Thead columns={["Provider", "Ends", "In"]} />
              <tbody>
                {expiringSoon.slice(0, 6).map((c) => (
                  <Tr key={c.id}>
                    <Td>{c.provider}</Td>
                    <Td mono>{formatDate(c.contract_end)}</Td>
                    <Td>
                      <Chip tone={c.days! <= 30 ? "danger" : "warn"}>{c.days}d</Chip>
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

function Stat({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="px-4 py-3.5">
      <div className="text-[11px] text-fg-subtle uppercase tracking-wide font-head font-bold">
        {label}
      </div>
      <div className={small ? "text-[13px] mt-1" : "font-head text-xl font-bold mt-1 tabular-nums"}>
        {value}
      </div>
    </div>
  );
}
