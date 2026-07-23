import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { DEFAULT_MIN_RETENTION_DAYS } from "@/lib/constants/countries";
import { isBelowRetention } from "@/lib/utils/cctv";
import type { CameraStatus } from "@/lib/constants/enums";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const cameraTone: Record<CameraStatus, "ok" | "danger" | "warn"> = {
  active: "ok",
  faulty: "danger",
  offline: "warn",
};

/** CCTV module (PRD Story 3): recorders + cameras. RLS-scoped. */
export default async function CctvPage() {
  const t = await getDictionary();
  const supabase = await createClient();

  const [recorders, cameras, settings] = await Promise.all([
    supabase
      .from("cctv_recorders")
      .select("id, brand, model, channels, retention_days, location, last_verified_at, sites(country_code)")
      .order("brand")
      .limit(50),
    supabase
      .from("cctv_cameras")
      .select("id, label, camera_type, resolution, outdoor, status, last_verified_at")
      .order("label")
      .limit(50),
    // 5.5: per-country retention minimums; fall back to the company default (30).
    supabase.from("country_settings").select("country_code, min_retention_days"),
  ]);

  const recorderRows = recorders.data ?? [];
  const cameraRows = cameras.data ?? [];
  const cameraCount = cameraRows.length;

  const minByCountry = new Map<string, number>(
    (settings.data ?? []).map((s) => [s.country_code, s.min_retention_days]),
  );
  // `sites` comes back as an object (single FK) but typed loosely by the join.
  const retentionMin = (r: (typeof recorderRows)[number]): number => {
    const site = r.sites as { country_code?: string } | { country_code?: string }[] | null;
    const code = Array.isArray(site) ? site[0]?.country_code : site?.country_code;
    return (code ? minByCountry.get(code) : undefined) ?? DEFAULT_MIN_RETENTION_DAYS;
  };
  return (
    <>
      <PageHead
        title={t.cctv.title}
        subtitle={t.cctv.subtitle}
        actions={
          <DropdownMenu
            label={t.common.new}
            sm
            variant="ghost"
            items={[
              { label: t.cctv.newRecorder, href: "/cctv/recorders/new" },
              { label: t.cctv.newCamera, href: "/cctv/cameras/new" },
            ]}
          />
        }
      />

      <div className="flex flex-col gap-3.5">
        <Panel>
          <PanelHeader title={`${t.cctv.panelRecorders} · ${recorderRows.length}`} />
          {recorderRows.length === 0 ? (
            <PanelEmpty>{t.cctv.noRecorders}</PanelEmpty>
          ) : (
            <Table>
              <Thead
                columns={[t.columns.model, t.columns.channels, t.columns.retention, t.columns.location, ""]}
              />
              <tbody>
                {recorderRows.map((r) => {
                  const below = isBelowRetention(r.retention_days, retentionMin(r));
                  return (
                    <Tr key={r.id}>
                      <Td>
                        {r.brand} {r.model}
                      </Td>
                      <Td mono>{r.channels ?? "—"}</Td>
                      <Td>
                        {r.retention_days == null ? (
                          <span className="mono">—</span>
                        ) : below ? (
                          <Chip tone="danger">{t.cctv.daysShort(r.retention_days)}</Chip>
                        ) : (
                          <span className="mono">{t.cctv.daysShort(r.retention_days)}</span>
                        )}
                      </Td>
                      <Td>{r.location ?? "—"}</Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/cctv/recorders/${r.id}/edit`}>
                            <Button sm variant="ghost">
                              {t.common.edit}
                            </Button>
                          </Link>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={`${t.cctv.panelCameras} · ${cameraCount}`} />
          {cameraCount === 0 ? (
            <PanelEmpty>{t.cctv.noCameras}</PanelEmpty>
          ) : (
            <Table>
              <Thead
                columns={[
                  t.columns.label,
                  t.columns.type,
                  t.columns.resolution,
                  t.columns.placement,
                  t.columns.status,
                  "",
                ]}
              />
              <tbody>
                {cameraRows.map((c) => (
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
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/cctv/cameras/${c.id}/edit`}>
                          <Button sm variant="ghost">
                            {t.common.edit}
                          </Button>
                        </Link>
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
