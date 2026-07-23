import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  isCountryCode,
  DEFAULT_MIN_RETENTION_DAYS,
  DEFAULT_REVIEW_CYCLE_MONTHS,
} from "@/lib/constants/countries";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi } from "@/components/ui/Kpi";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { isBelowRetention } from "@/lib/utils/cctv";
import { isStale, formatDate, daysUntil, orDash } from "@/lib/utils/format";
import type { CameraStatus } from "@/lib/constants/enums";
import { getDictionary } from "@/lib/i18n/server";

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

  const t = await getDictionary();
  const countryName = t.countries[code];
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
      kind: t.country.kindCircuit,
      label: c.provider,
      site: siteNameById.get(c.site_id) ?? "—",
      date: c.contract_end,
      days: daysUntil(c.contract_end),
    })),
    ...deviceRows.map((d) => ({
      id: `device-${d.id}`,
      kind: t.country.kindWarranty,
      label: d.hostname ?? ([d.brand, d.model].filter(Boolean).join(" ") || t.country.unnamedDevice),
      site: siteNameById.get(d.site_id) ?? "—",
      date: d.warranty_end,
      days: daysUntil(d.warranty_end),
    })),
  ]
    .filter((r) => r.days != null && r.days <= 90)
    .sort((a, b) => a.days! - b.days!);
  const expiringCircuits = renewals.filter((r) => r.kind === t.country.kindCircuit).length;

  return (
    <>
      <PageHead
        title={t.country.title(countryName)}
        subtitle={t.country.subtitle(countryName)}
      />

      {/* Country KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <Kpi label={t.country.kpiActiveSites} value={failed.sites ? "—" : activeSites.length} />
        <Kpi label={t.country.kpiNetworkDevices} value={failed.devices ? "—" : deviceRows.length} />
        <Kpi
          label={t.country.kpiCamerasOnline}
          value={failed.cameras ? "—" : activeCameras}
          unit={failed.cameras ? undefined : `/ ${cameraRows.length}`}
          accent={!failed.cameras && faultyCameras > 0 ? "danger" : "accent"}
        />
        <Kpi
          label={t.country.staleRecords}
          value={failed.sites ? "—" : staleCount}
          accent={!failed.sites && staleCount > 0 ? "warn" : "accent"}
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      <ModuleHead title={t.nav.network} href="/network" linkLabel={t.country.openModule} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded overflow-hidden mb-3.5">
        <Stat label={t.country.statDevices} value={failed.devices ? "—" : deviceRows.length} />
        <Stat label={t.country.statCircuits} value={failed.circuits ? "—" : circuitRows.length} />
        <Stat label={t.country.statVpn} value={failed.vpn ? "—" : vpnRows.length} />
        <Stat
          label={t.country.statCircuits90d}
          value={failed.circuits ? "—" : expiringCircuits}
          tone={!failed.circuits && expiringCircuits > 0 ? "warn" : undefined}
        />
      </div>

      <div className="flex flex-col gap-3.5 mb-6">
        <Panel>
          <PanelHeader title={`${t.country.panelDevices} · ${failed.devices ? "—" : deviceRows.length}`} />
          {failed.devices ? (
            <PanelEmpty>{t.country.deviceDataUnavailable}</PanelEmpty>
          ) : deviceRows.length === 0 ? (
            <PanelEmpty>{t.country.noDevices(countryName)}</PanelEmpty>
          ) : (
            <>
              <Table>
                <Thead
                  columns={[
                    t.columns.hostname,
                    t.columns.type,
                    t.columns.model,
                    t.columns.site,
                    t.columns.warranty,
                    t.columns.status,
                  ]}
                />
                <tbody>
                  {deviceRows.slice(0, PREVIEW_ROWS).map((d) => (
                    <Tr key={d.id}>
                      <Td mono>{d.hostname ?? "—"}</Td>
                      <Td>
                        {t.enums.deviceType[d.device_type]}
                      </Td>
                      <Td>{[d.brand, d.model].filter(Boolean).join(" ") || "—"}</Td>
                      <Td>{siteNameById.get(d.site_id) ?? "—"}</Td>
                      <Td mono>{formatDate(d.warranty_end)}</Td>
                      <Td>
                        {isStale(d.last_verified_at, reviewMonths) ? (
                          <Chip tone="warn">{t.common.stale}</Chip>
                        ) : (
                          <Chip tone="ok">{t.common.fresh}</Chip>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <MoreRows
                total={deviceRows.length}
                href="/network"
                showing={t.country.showing}
                viewAll={t.common.viewAll}
              />
            </>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={`${t.country.panelCircuits} · ${failed.circuits ? "—" : circuitRows.length}`} />
          {failed.circuits ? (
            <PanelEmpty>{t.country.circuitDataUnavailable}</PanelEmpty>
          ) : circuitRows.length === 0 ? (
            <PanelEmpty>{t.country.noCircuits(countryName)}</PanelEmpty>
          ) : (
            <>
              <Table>
                <Thead
                  columns={[
                    t.columns.provider,
                    t.columns.circuitId,
                    t.columns.bandwidth,
                    t.columns.type,
                    t.columns.site,
                    t.columns.contractEnd,
                  ]}
                />
                <tbody>
                  {circuitRows.slice(0, PREVIEW_ROWS).map((c) => (
                    <Tr key={c.id}>
                      <Td>{c.provider}</Td>
                      <Td mono>{c.circuit_id ?? "—"}</Td>
                      <Td>{c.bandwidth ?? "—"}</Td>
                      <Td>
                        {t.enums.circuitType[c.type]}
                      </Td>
                      <Td>{siteNameById.get(c.site_id) ?? "—"}</Td>
                      <Td mono>{formatDate(c.contract_end)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <MoreRows
                total={circuitRows.length}
                href="/network"
                showing={t.country.showing}
                viewAll={t.common.viewAll}
              />
            </>
          )}
        </Panel>
      </div>

      {/* ---------------------------------------------------------------- */}
      <ModuleHead title={t.nav.cctv} href="/cctv" linkLabel={t.country.openModule} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded overflow-hidden mb-3.5">
        <Stat label={t.country.statRecorders} value={failed.recorders ? "—" : recorderRows.length} />
        <Stat
          label={t.country.statCamerasActive}
          value={failed.cameras ? "—" : activeCameras}
          unit={failed.cameras ? undefined : `/ ${cameraRows.length}`}
        />
        <Stat
          label={t.country.statFaultyOffline}
          value={failed.cameras ? "—" : faultyCameras}
          tone={!failed.cameras && faultyCameras > 0 ? "danger" : undefined}
        />
        <Stat
          label={t.country.statBelowRetention(minRetention)}
          value={failed.recorders ? "—" : belowRetention}
          tone={!failed.recorders && belowRetention > 0 ? "danger" : undefined}
        />
      </div>

      <div className="flex flex-col gap-3.5 mb-6">
        <Panel>
          <PanelHeader title={`${t.country.panelRecorders} · ${failed.recorders ? "—" : recorderRows.length}`} />
          {failed.recorders ? (
            <PanelEmpty>{t.country.recorderDataUnavailable}</PanelEmpty>
          ) : recorderRows.length === 0 ? (
            <PanelEmpty>{t.country.noRecorders(countryName)}</PanelEmpty>
          ) : (
            <>
              <Table>
                <Thead
                  columns={[
                    t.columns.model,
                    t.columns.channels,
                    t.columns.retention,
                    t.columns.location,
                    t.columns.site,
                  ]}
                />
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
              <MoreRows
                total={recorderRows.length}
                href="/cctv"
                showing={t.country.showing}
                viewAll={t.common.viewAll}
              />
            </>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={`${t.country.panelCameras} · ${failed.cameras ? "—" : cameraRows.length}`} />
          {failed.cameras ? (
            <PanelEmpty>{t.country.cameraDataUnavailable}</PanelEmpty>
          ) : cameraRows.length === 0 ? (
            <PanelEmpty>{t.country.noCameras(countryName)}</PanelEmpty>
          ) : (
            <>
              <Table>
                <Thead
                  columns={[
                    t.columns.label,
                    t.columns.type,
                    t.columns.resolution,
                    t.columns.placement,
                    t.columns.status,
                  ]}
                />
                <tbody>
                  {cameraRows.slice(0, PREVIEW_ROWS).map((c) => (
                    <Tr key={c.id}>
                      <Td mono>{c.label}</Td>
                      <Td>
                        {t.enums.cameraType[c.camera_type]}
                      </Td>
                      <Td>{c.resolution ?? "—"}</Td>
                      <Td>{c.outdoor ? t.country.outdoor : t.country.indoor}</Td>
                      <Td>
                        <Chip tone={cameraTone[c.status]}>
                          {t.enums.cameraStatus[c.status]}
                        </Chip>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <MoreRows
                total={cameraRows.length}
                href="/cctv"
                showing={t.country.showing}
                viewAll={t.common.viewAll}
              />
            </>
          )}
        </Panel>
      </div>

      {/* ---------------------------------------------------------------- */}
      <ModuleHead title={t.nav.renewals} href="/renewals" linkLabel={t.country.openModule} />
      <Panel className="mb-6">
        <PanelHeader title={t.country.panelDue} />
        {failed.circuits || failed.devices ? (
          <PanelEmpty>{t.country.renewalDataUnavailable}</PanelEmpty>
        ) : renewals.length === 0 ? (
          <PanelEmpty>{t.country.nothingDue(countryName)}</PanelEmpty>
        ) : (
          <>
            <Table>
              <Thead
              columns={[t.columns.item, t.columns.type, t.columns.site, t.columns.ends, t.columns.in]}
            />
              <tbody>
                {renewals.slice(0, PREVIEW_ROWS).map((r) => (
                  <Tr key={r.id}>
                    <Td>{r.label}</Td>
                    <Td>{r.kind}</Td>
                    <Td>{r.site}</Td>
                    <Td mono>{formatDate(r.date)}</Td>
                    <Td>
                      <Chip tone={r.days! <= 30 ? "danger" : "warn"}>
                        {t.dashboard.daysShort(r.days!)}
                      </Chip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <MoreRows
                total={renewals.length}
                href="/renewals"
                showing={t.country.showing}
                viewAll={t.common.viewAll}
              />
          </>
        )}
      </Panel>

      {/* ---------------------------------------------------------------- */}
      <ModuleHead title={t.nav.sites} linkLabel={t.country.openModule} />
      <Panel>
        <PanelHeader title={`${t.nav.sites} · ${failed.sites ? "—" : siteRows.length}`} />
        {failed.sites ? (
          <PanelEmpty>{t.country.siteDataUnavailable}</PanelEmpty>
        ) : siteRows.length === 0 ? (
          <PanelEmpty>{t.country.noSites(countryName)}</PanelEmpty>
        ) : (
          <Table>
            <Thead
              columns={[t.columns.site, t.columns.contact, t.columns.verified, t.columns.status]}
            />
            <tbody>
              {siteRows.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <Link href={`/sites/${s.id}`} className="font-medium hover:text-accent">
                      {s.name}
                    </Link>
                    <div className="text-fg-subtle text-[11.5px]">{orDash(s.address)}</div>
                  </Td>
                  <Td>
                    <div>{orDash(s.contact_name)}</div>
                    <div className="text-fg-subtle text-[11.5px] font-mono">
                      {s.contact_phone ?? ""}
                    </div>
                  </Td>
                  <Td mono>{formatDate(s.last_verified_at)}</Td>
                  <Td>
                    {s.archived_at ? (
                      <Chip tone="neutral">{t.common.archived}</Chip>
                    ) : isStale(s.last_verified_at, reviewMonths) ? (
                      <Chip tone="warn">{t.common.stale}</Chip>
                    ) : (
                      <Chip tone="ok">{t.common.fresh}</Chip>
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
function ModuleHead({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: Route;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <h4 className="font-head text-[13px] font-bold tracking-[0.08em] uppercase text-fg-subtle">
        {title}
      </h4>
      {href && (
        <Link href={href} className="ml-auto text-[12px] text-accent font-semibold hover:underline">
          {linkLabel}
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
function MoreRows({
  total,
  href,
  showing,
  viewAll,
}: {
  total: number;
  href: Route;
  showing: (shown: number, total: number) => string;
  viewAll: string;
}) {
  if (total <= PREVIEW_ROWS) return null;
  return (
    <div className="px-4 py-2.5 border-t border-border text-[12px] text-fg-subtle">
      {showing(PREVIEW_ROWS, total)}
      <Link href={href} className="text-accent font-semibold hover:underline">
        {viewAll}
      </Link>
    </div>
  );
}
