import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi } from "@/components/ui/Kpi";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Chip } from "@/components/ui/Chip";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import {
  COUNTRY_LIST,
  DEFAULT_MIN_RETENTION_DAYS,
  DEFAULT_REVIEW_CYCLE_MONTHS,
} from "@/lib/constants/countries";
import { daysUntil, formatDate, isStale } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Landing dashboard (PRD Story 3 & 5). Per-country cards + a renewals-soon
 * table. All queries are RLS-scoped, so a country manager sees only their
 * country; HQ admins see all four offices.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [sites, devices, cameras, recorders, circuits, settings] = await Promise.all([
    supabase.from("sites").select("id, country_code, last_verified_at").is("archived_at", null),
    supabase.from("network_devices").select("id, site_id, last_verified_at"),
    supabase.from("cctv_cameras").select("id, status, recorder_id, last_verified_at"),
    supabase
      .from("cctv_recorders")
      .select("id, retention_days, site_id, last_verified_at"),
    supabase.from("isp_circuits").select("id, contract_end, provider, site_id"),
    supabase
      .from("country_settings")
      .select("country_code, min_retention_days, review_cycle_months"),
  ]);

  // ROB-5: a query can resolve with `.error` instead of rejecting; surface a
  // "data unavailable" state per card rather than silently showing 0.
  const failed = {
    sites: !!sites.error,
    devices: !!devices.error || !!sites.error, // devices attribute to country via site
    cameras: !!cameras.error,
    // camera→country mapping needs both recorders and sites
    camerasByCountry: !!cameras.error || !!recorders.error || !!sites.error,
    recorders: !!recorders.error || !!sites.error, // retention check needs both
    circuits: !!circuits.error || !!sites.error,
    stale: !!sites.error || !!devices.error || !!recorders.error || !!cameras.error,
  };
  for (const [name, res] of Object.entries({ sites, devices, cameras, recorders, circuits, settings })) {
    if (res.error) console.error(`[dashboard] ${name} query failed:`, res.error);
  }

  const siteRows = sites.data ?? [];
  const deviceRows = devices.data ?? [];
  const cameraRows = cameras.data ?? [];
  const recorderRows = recorders.data ?? [];
  const circuitRows = circuits.data ?? [];

  // --- lookup maps (site → country, camera → recorder → site → country) ---
  const countryBySite = new Map(siteRows.map((s) => [s.id, s.country_code]));
  const siteByRecorder = new Map(recorderRows.map((r) => [r.id, r.site_id]));
  const countryByRecorder = (recorderId: string | null) => {
    const siteId = recorderId ? siteByRecorder.get(recorderId) : undefined;
    return siteId ? countryBySite.get(siteId) : undefined;
  };
  const countryByCamera = (c: (typeof cameraRows)[number]) => countryByRecorder(c.recorder_id);

  // BUS-5 / CODE-6: country_settings is authoritative; the TS constants are the
  // fallback only when a country has no row yet.
  const minByCountry = new Map<string, number>(
    (settings.data ?? []).map((s) => [s.country_code, s.min_retention_days]),
  );
  const reviewByCountry = new Map<string, number>(
    (settings.data ?? []).map((s) => [s.country_code, s.review_cycle_months]),
  );
  const minRetentionFor = (siteId: string | null): number => {
    const country = siteId ? countryBySite.get(siteId) : undefined;
    return (country ? minByCountry.get(country) : undefined) ?? DEFAULT_MIN_RETENTION_DAYS;
  };
  // 6.4: staleness uses the country's configured review cycle, not a hardcode.
  const reviewMonthsFor = (country: string | undefined): number =>
    (country ? reviewByCountry.get(country) : undefined) ?? DEFAULT_REVIEW_CYCLE_MONTHS;

  // --- global KPIs ---
  const activeCameras = cameraRows.filter((c) => c.status === "active").length;
  const faultyCameras = cameraRows.filter((c) => c.status !== "active").length;
  const belowMinRetention = recorderRows.filter(
    (r) => (r.retention_days ?? 0) < minRetentionFor(r.site_id),
  ).length;
  const expiringSoon = circuitRows
    .map((c) => ({ ...c, days: daysUntil(c.contract_end) }))
    .filter((c) => c.days != null && c.days <= 90)
    .sort((a, b) => a.days! - b.days!);

  // --- per-country aggregates (6.2 / 6.3) ---
  type Agg = {
    sites: number;
    devices: number;
    cameras: number;
    activeCameras: number;
    faultyCameras: number;
    recorders: number;
    belowRetention: number;
    expiringCircuits: number;
    stale: number;
  };
  const emptyAgg = (): Agg => ({
    sites: 0,
    devices: 0,
    cameras: 0,
    activeCameras: 0,
    faultyCameras: 0,
    recorders: 0,
    belowRetention: 0,
    expiringCircuits: 0,
    stale: 0,
  });
  const byCountry = new Map<string, Agg>(COUNTRY_LIST.map((c) => [c.code, emptyAgg()]));
  const bump = (country: string | undefined, fn: (a: Agg) => void) => {
    if (!country) return;
    const a = byCountry.get(country);
    if (a) fn(a);
  };

  for (const s of siteRows) {
    bump(s.country_code, (a) => {
      a.sites += 1;
      if (isStale(s.last_verified_at, reviewMonthsFor(s.country_code))) a.stale += 1;
    });
  }
  for (const d of deviceRows) {
    const country = countryBySite.get(d.site_id);
    bump(country, (a) => {
      a.devices += 1;
      if (isStale(d.last_verified_at, reviewMonthsFor(country))) a.stale += 1;
    });
  }
  for (const r of recorderRows) {
    const country = countryBySite.get(r.site_id);
    bump(country, (a) => {
      a.recorders += 1;
      if ((r.retention_days ?? 0) < minRetentionFor(r.site_id)) a.belowRetention += 1;
      if (isStale(r.last_verified_at, reviewMonthsFor(country))) a.stale += 1;
    });
  }
  for (const c of cameraRows) {
    const country = countryByCamera(c);
    bump(country, (a) => {
      a.cameras += 1;
      if (c.status === "active") a.activeCameras += 1;
      else a.faultyCameras += 1;
      if (isStale(c.last_verified_at, reviewMonthsFor(country))) a.stale += 1;
    });
  }
  for (const c of expiringSoon) {
    bump(countryBySite.get(c.site_id), (a) => {
      a.expiringCircuits += 1;
    });
  }

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
          const a = byCountry.get(c.code) ?? emptyAgg();
          return (
            <Panel key={c.code}>
              <PanelHeader
                title={
                  <Link
                    href={`/countries/${c.code}`}
                    className="flex items-center gap-2 hover:text-accent"
                  >
                    <span className="font-mono text-[11px] text-fg-subtle">{c.code}</span>
                    {c.name}
                  </Link>
                }
                actions={
                  <div className="flex items-center gap-1.5">
                    {!failed.recorders && a.belowRetention > 0 && (
                      <Chip tone="danger">{a.belowRetention} low retention</Chip>
                    )}
                    {c.code === "MY" && <Chip tone="info">Pilot</Chip>}
                  </div>
                }
              />
              <div className="grid grid-cols-3 gap-px bg-border">
                <Stat label="Sites" value={failed.sites ? "—" : a.sites} />
                <Stat label="Devices" value={failed.devices ? "—" : a.devices} />
                <Stat
                  label="Cameras"
                  value={failed.camerasByCountry ? "—" : a.activeCameras}
                  unit={failed.camerasByCountry ? undefined : `/ ${a.cameras}`}
                />
                <Stat
                  label="Faulty cams"
                  value={failed.camerasByCountry ? "—" : a.faultyCameras}
                  tone={!failed.camerasByCountry && a.faultyCameras > 0 ? "danger" : undefined}
                />
                <Stat
                  label="Circuits ≤90d"
                  value={failed.circuits ? "—" : a.expiringCircuits}
                  tone={!failed.circuits && a.expiringCircuits > 0 ? "warn" : undefined}
                />
                <Stat
                  label="Stale records"
                  value={failed.stale ? "—" : a.stale}
                  tone={!failed.stale && a.stale > 0 ? "warn" : undefined}
                />
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

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: "danger" | "warn";
}) {
  const toneClass =
    tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : undefined;
  return (
    <div className="bg-surface px-4 py-3.5">
      <div className="text-[11px] text-fg-subtle uppercase tracking-wide font-head font-bold">
        {label}
      </div>
      <div className={`font-head text-xl font-bold mt-1 tabular-nums ${toneClass ?? ""}`}>
        {value}
        {unit ? <span className="text-[13px] text-fg-subtle font-medium"> {unit}</span> : null}
      </div>
    </div>
  );
}
