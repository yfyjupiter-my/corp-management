import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  isCountryCode,
  COUNTRIES,
  DEFAULT_MIN_RETENTION_DAYS,
  DEFAULT_REVIEW_CYCLE_MONTHS,
} from "@/lib/constants/countries";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi } from "@/components/ui/Kpi";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { isBelowRetention } from "@/lib/utils/cctv";
import { isStale, formatDate, daysUntil } from "@/lib/utils/format";
import type { CameraStatus } from "@/lib/constants/enums";

export const dynamic = "force-dynamic";

/** Rows shown inline per module table before deferring to the module page. */
const PREVIEW_ROWS = 8;
/** 10.6: hard cap on any single fetch. */
const FETCH_CAP = 50;

const cameraTone: Record<CameraStatus, "ok" | "danger" | "warn"> = {
  active: "ok",
  faulty: "danger",
  offline: "warn",
};

/**
 * Country dashboard (PRD Story 1 & 5). Everything on this page is scoped to a
 * single country and grouped by the sidebar MODULES sections — Network, CCTV,
 * Renewals — plus the country's site registry. RLS is the real boundary: a
 * country manager requesting another country's code simply gets empty results.
 */
export default async function CountryPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!isCountryCode(code)) notFound();

  const meta = COUNTRIES[code];
  const supabase = await createClient();

  // --- sites for this country (the anchor for every child query) -------------
  const [sitesRes, settingsRes] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, address, contact_name, contact_phone, archived_at, last_verified_at")
      .eq("country_code", code)
      .order("name")
      .limit(FETCH_CAP),
    supabase
      .from("country_settings")
      .select("min_retention_days, review_cycle_months")
      .eq("country_code", code)
      .maybeSingle(),
  ]);

  const siteRows = sitesRes.data ?? [];
  const activeSites = siteRows.filter((s) => !s.archived_at);
  const siteIds = siteRows.map((s) => s.id);
  const siteNameById = new Map(siteRows.map((s) => [s.id, s.name]));

  // BUS-5: country_settings is authoritative; TS constants are the fallback.
  const minRetention = settingsRes.data?.min_retention_days ?? DEFAULT_MIN_RETENTION_DAYS;
  const reviewMonths = settingsRes.data?.review_cycle_months ?? DEFAULT_REVIEW_CYCLE_MONTHS;

  // --- module data, all scoped to this country's sites ----------------------
  const hasSites = siteIds.length > 0;
  const [devicesRes, circuitsRes, vpnRes, recordersRes] = hasSites
    ? await Promise.all([
        supabase
          .from("network_devices")
          .select("id, site_id, device_type, brand, model, hostname, mgmt_ip, warranty_end, last_verified_at")
          .in("site_id", siteIds)
          .order("hostname")
          .limit(FETCH_CAP),
        supabase
          .from("isp_circuits")
          .select("id, site_id, provider, circuit_id, bandwidth, type, contract_end")
          .in("site_id", siteIds)
          .order("provider")
          .limit(FETCH_CAP),
        supabase
          .from("vpn_links")
          .select("id, site_id, peer, tunnel_type, status")
          .in("site_id", siteIds)
          .limit(FETCH_CAP),
        supabase
          .from("cctv_recorders")
          .select("id, site_id, brand, model, channels, retention_days, location, last_verified_at")
          .in("site_id", siteIds)
          .order("brand")
          .limit(FETCH_CAP),
      ])
    : [null, null, null, null];

  const deviceRows = devicesRes?.data ?? [];
  const circuitRows = circuitsRes?.data ?? [];
  const vpnRows = vpnRes?.data ?? [];
  const recorderRows = recordersRes?.data ?? [];

  // Cameras hang off recorders, so they need the recorder ids first.
  const recorderIds = recorderRows.map((r) => r.id);
  const camerasRes = recorderIds.length
    ? await supabase
        .from("cctv_cameras")
        .select("id, recorder_id, label, camera_type, resolution, outdoor, status, last_verified_at")
        .in("recorder_id", recorderIds)
        .order("label")
        .limit(FETCH_CAP)
    : null;
  const cameraRows = camerasRes?.data ?? [];

  // ROB-5: a query can resolve with `.error` instead of throwing — show "—"
  // rather than a confident zero.
  const failed = {
    sites: !!sitesRes.error,
    devices: !!sitesRes.error || !!devicesRes?.error,
    circuits: !!sitesRes.error || !!circuitsRes?.error,
    vpn: !!sitesRes.error || !!vpnRes?.error,
    recorders: !!sitesRes.error || !!recordersRes?.error,
    cameras: !!sitesRes.error || !!recordersRes?.error || !!camerasRes?.error,
  };
  for (const [name, res] of Object.entries({
    sites: sitesRes,
    settings: settingsRes,
    devices: devicesRes,
    circuits: circuitsRes,
    vpn: vpnRes,
    recorders: recordersRes,
    cameras: camerasRes,
  })) {
    if (res?.error) console.error(`[country:${code}] ${name} query failed:`, res.error);
  }

  // --- derived module stats -------------------------------------------------
  const activeCameras = cameraRows.filter((c) => c.status === "active").length;
  const faultyCameras = cameraRows.filter((c) => c.status !== "active").length;
  const belowRetention = recorderRows.filter((r) =>
    isBelowRetention(r.retention_days, minRetention),
  ).length;

  const staleCount =
    siteRows.filter((s) => isStale(s.last_verified_at, reviewMonths)).length +
    deviceRows.filter((d) => isStale(d.last_verified_at, reviewMonths)).length +
    recorderRows.filter((r) => isStale(r.last_verified_at, reviewMonths)).length +
    cameraRows.filter((c) => isStale(c.last_verified_at, reviewMonths)).length;

  // Renewals module: circuit contracts + device warranties due within 90 days.
  const renewals = [
    ...circuitRows.map((c) => ({
      id: `circuit-${c.id}`,
      kind: "ISP circuit",
      label: c.provider,
      site: siteNameById.get(c.site_id) ?? "—",
      date: c.contract_end,
      days: daysUntil(c.contract_end),
    })),
    ...deviceRows.map((d) => ({
      id: `device-${d.id}`,
      kind: "Device warranty",
      label: d.hostname ?? ([d.brand, d.model].filter(Boolean).join(" ") || "Device"),
      site: siteNameById.get(d.site_id) ?? "—",
      date: d.warranty_end,
      days: daysUntil(d.warranty_end),
    })),
  ]
    .filter((r) => r.days != null && r.days <= 90)
    .sort((a, b) => a.days! - b.days!);
  const expiringCircuits = renewals.filter((r) => r.kind === "ISP circuit").length;

  return (
    <>
      <PageHead
        title={`${meta.name} dashboard`}
        subtitle={`Sites, network, CCTV, and renewals for ${meta.name} only.`}
      />

      {/* Country KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <Kpi label="Active sites" value={failed.sites ? "—" : activeSites.length} />
        <Kpi label="Network devices" value={failed.devices ? "—" : deviceRows.length} />
        <Kpi
          label="Cameras online"
          value={failed.cameras ? "—" : activeCameras}
          unit={failed.cameras ? undefined : `/ ${cameraRows.length}`}
          accent={!failed.cameras && faultyCameras > 0 ? "danger" : "accent"}
        />
        <Kpi
          label="Stale records"
          value={failed.sites ? "—" : staleCount}
          accent={!failed.sites && staleCount > 0 ? "warn" : "accent"}
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      <ModuleHead title="Network" href="/network" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded overflow-hidden mb-3.5">
        <Stat label="Devices" value={failed.devices ? "—" : deviceRows.length} />
        <Stat label="ISP circuits" value={failed.circuits ? "—" : circuitRows.length} />
        <Stat label="VPN links" value={failed.vpn ? "—" : vpnRows.length} />
        <Stat
          label="Circuits ≤90d"
          value={failed.circuits ? "—" : expiringCircuits}
          tone={!failed.circuits && expiringCircuits > 0 ? "warn" : undefined}
        />
      </div>

      <div className="flex flex-col gap-3.5 mb-6">
        <Panel>
          <PanelHeader title={`Devices · ${failed.devices ? "—" : deviceRows.length}`} />
          {failed.devices ? (
            <PanelEmpty>Device data temporarily unavailable.</PanelEmpty>
          ) : deviceRows.length === 0 ? (
            <PanelEmpty>No network devices recorded for {meta.name}.</PanelEmpty>
          ) : (
            <>
              <Table>
                <Thead columns={["Hostname", "Type", "Model", "Site", "Warranty", "Status"]} />
                <tbody>
                  {deviceRows.slice(0, PREVIEW_ROWS).map((d) => (
                    <Tr key={d.id}>
                      <Td mono>{d.hostname ?? "—"}</Td>
                      <Td>
                        <span className="capitalize">{d.device_type}</span>
                      </Td>
                      <Td>{[d.brand, d.model].filter(Boolean).join(" ") || "—"}</Td>
                      <Td>{siteNameById.get(d.site_id) ?? "—"}</Td>
                      <Td mono>{formatDate(d.warranty_end)}</Td>
                      <Td>
                        {isStale(d.last_verified_at, reviewMonths) ? (
                          <Chip tone="warn">Stale</Chip>
                        ) : (
                          <Chip tone="ok">Fresh</Chip>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <MoreRows total={deviceRows.length} href="/network" />
            </>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={`ISP circuits · ${failed.circuits ? "—" : circuitRows.length}`} />
          {failed.circuits ? (
            <PanelEmpty>Circuit data temporarily unavailable.</PanelEmpty>
          ) : circuitRows.length === 0 ? (
            <PanelEmpty>No ISP circuits recorded for {meta.name}.</PanelEmpty>
          ) : (
            <>
              <Table>
                <Thead columns={["Provider", "Circuit ID", "Bandwidth", "Type", "Site", "Contract end"]} />
                <tbody>
                  {circuitRows.slice(0, PREVIEW_ROWS).map((c) => (
                    <Tr key={c.id}>
                      <Td>{c.provider}</Td>
                      <Td mono>{c.circuit_id ?? "—"}</Td>
                      <Td>{c.bandwidth ?? "—"}</Td>
                      <Td>
                        <span className="capitalize">{c.type}</span>
                      </Td>
                      <Td>{siteNameById.get(c.site_id) ?? "—"}</Td>
                      <Td mono>{formatDate(c.contract_end)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <MoreRows total={circuitRows.length} href="/network" />
            </>
          )}
        </Panel>
      </div>

      {/* ---------------------------------------------------------------- */}
      <ModuleHead title="CCTV" href="/cctv" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded overflow-hidden mb-3.5">
        <Stat label="Recorders" value={failed.recorders ? "—" : recorderRows.length} />
        <Stat
          label="Cameras active"
          value={failed.cameras ? "—" : activeCameras}
          unit={failed.cameras ? undefined : `/ ${cameraRows.length}`}
        />
        <Stat
          label="Faulty / offline"
          value={failed.cameras ? "—" : faultyCameras}
          tone={!failed.cameras && faultyCameras > 0 ? "danger" : undefined}
        />
        <Stat
          label={`Below ${minRetention}d retention`}
          value={failed.recorders ? "—" : belowRetention}
          tone={!failed.recorders && belowRetention > 0 ? "danger" : undefined}
        />
      </div>

      <div className="flex flex-col gap-3.5 mb-6">
        <Panel>
          <PanelHeader title={`Recorders · ${failed.recorders ? "—" : recorderRows.length}`} />
          {failed.recorders ? (
            <PanelEmpty>Recorder data temporarily unavailable.</PanelEmpty>
          ) : recorderRows.length === 0 ? (
            <PanelEmpty>No recorders recorded for {meta.name}.</PanelEmpty>
          ) : (
            <>
              <Table>
                <Thead columns={["Model", "Channels", "Retention", "Location", "Site"]} />
                <tbody>
                  {recorderRows.slice(0, PREVIEW_ROWS).map((r) => {
                    const below = isBelowRetention(r.retention_days, minRetention);
                    return (
                      <Tr key={r.id}>
                        <Td>{[r.brand, r.model].filter(Boolean).join(" ") || "—"}</Td>
                        <Td mono>{r.channels ?? "—"}</Td>
                        <Td>
                          {r.retention_days == null ? (
                            <span className="font-mono">—</span>
                          ) : below ? (
                            <Chip tone="danger">{r.retention_days}d</Chip>
                          ) : (
                            <span className="font-mono">{r.retention_days}d</span>
                          )}
                        </Td>
                        <Td>{r.location ?? "—"}</Td>
                        <Td>{siteNameById.get(r.site_id) ?? "—"}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
              <MoreRows total={recorderRows.length} href="/cctv" />
            </>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={`Cameras · ${failed.cameras ? "—" : cameraRows.length}`} />
          {failed.cameras ? (
            <PanelEmpty>Camera data temporarily unavailable.</PanelEmpty>
          ) : cameraRows.length === 0 ? (
            <PanelEmpty>No cameras recorded for {meta.name}.</PanelEmpty>
          ) : (
            <>
              <Table>
                <Thead columns={["Label", "Type", "Resolution", "Placement", "Status"]} />
                <tbody>
                  {cameraRows.slice(0, PREVIEW_ROWS).map((c) => (
                    <Tr key={c.id}>
                      <Td mono>{c.label}</Td>
                      <Td>
                        <span className="capitalize">{c.camera_type}</span>
                      </Td>
                      <Td>{c.resolution ?? "—"}</Td>
                      <Td>{c.outdoor ? "Outdoor" : "Indoor"}</Td>
                      <Td>
                        <Chip tone={cameraTone[c.status]}>
                          <span className="capitalize">{c.status}</span>
                        </Chip>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <MoreRows total={cameraRows.length} href="/cctv" />
            </>
          )}
        </Panel>
      </div>

      {/* ---------------------------------------------------------------- */}
      <ModuleHead title="Renewals" href="/renewals" />
      <Panel className="mb-6">
        <PanelHeader title="Due within 90 days" />
        {failed.circuits || failed.devices ? (
          <PanelEmpty>Renewal data temporarily unavailable.</PanelEmpty>
        ) : renewals.length === 0 ? (
          <PanelEmpty>Nothing due in the next 90 days for {meta.name}.</PanelEmpty>
        ) : (
          <>
            <Table>
              <Thead columns={["Item", "Type", "Site", "Ends", "In"]} />
              <tbody>
                {renewals.slice(0, PREVIEW_ROWS).map((r) => (
                  <Tr key={r.id}>
                    <Td>{r.label}</Td>
                    <Td>{r.kind}</Td>
                    <Td>{r.site}</Td>
                    <Td mono>{formatDate(r.date)}</Td>
                    <Td>
                      <Chip tone={r.days! <= 30 ? "danger" : "warn"}>{r.days}d</Chip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <MoreRows total={renewals.length} href="/renewals" />
          </>
        )}
      </Panel>

      {/* ---------------------------------------------------------------- */}
      <ModuleHead title="Sites" />
      <Panel>
        <PanelHeader title={`${failed.sites ? "—" : siteRows.length} site(s)`} />
        {failed.sites ? (
          <PanelEmpty>Site data temporarily unavailable.</PanelEmpty>
        ) : siteRows.length === 0 ? (
          <PanelEmpty>No sites registered yet for {meta.name}.</PanelEmpty>
        ) : (
          <Table>
            <Thead columns={["Site", "Contact", "Verified", "Status"]} />
            <tbody>
              {siteRows.map((s) => (
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
                    ) : isStale(s.last_verified_at, reviewMonths) ? (
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

/** Section heading for one sidebar module, with a link to the full module. */
function ModuleHead({ title, href }: { title: string; href?: Route }) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <h4 className="font-head text-[13px] font-bold tracking-[0.08em] uppercase text-fg-subtle">
        {title}
      </h4>
      {href && (
        <Link href={href} className="ml-auto text-[12px] text-accent font-semibold hover:underline">
          Open module →
        </Link>
      )}
    </div>
  );
}

/** Compact stat cell used in the per-module strips. */
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
  const toneClass = tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : undefined;
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

/** Footer link shown when a module table is truncated to the preview rows. */
function MoreRows({ total, href }: { total: number; href: Route }) {
  if (total <= PREVIEW_ROWS) return null;
  return (
    <div className="px-4 py-2.5 border-t border-border text-[12px] text-fg-subtle">
      Showing {PREVIEW_ROWS} of {total} —{" "}
      <Link href={href} className="text-accent font-semibold hover:underline">
        view all
      </Link>
    </div>
  );
}
