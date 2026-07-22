import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi } from "@/components/ui/Kpi";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { VerifyButton } from "@/components/ui/VerifyButton";
import { DEFAULT_MIN_RETENTION_DAYS } from "@/lib/constants/countries";
import { isBelowRetention } from "@/lib/utils/cctv";
import type { CameraStatus } from "@/lib/constants/enums";

export const dynamic = "force-dynamic";

const cameraTone: Record<CameraStatus, "ok" | "danger" | "warn"> = {
  active: "ok",
  faulty: "danger",
  offline: "warn",
};

/** CCTV module (PRD Story 3): recorders + cameras. RLS-scoped. */
export default async function CctvPage() {
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
  const active = cameraRows.filter((c) => c.status === "active").length;
  const faulty = cameraRows.filter((c) => c.status !== "active").length;

  const minByCountry = new Map<string, number>(
    (settings.data ?? []).map((s) => [s.country_code, s.min_retention_days]),
  );
  // `sites` comes back as an object (single FK) but typed loosely by the join.
  const retentionMin = (r: (typeof recorderRows)[number]): number => {
    const site = r.sites as { country_code?: string } | { country_code?: string }[] | null;
    const code = Array.isArray(site) ? site[0]?.country_code : site?.country_code;
    return (code ? minByCountry.get(code) : undefined) ?? DEFAULT_MIN_RETENTION_DAYS;
  };
  const belowRetention = recorderRows.filter((r) =>
    isBelowRetention(r.retention_days, retentionMin(r)),
  ).length;

  return (
    <>
      <PageHead
        title="CCTV"
        subtitle="Recorders, cameras, and retention."
        actions={
          <DropdownMenu
            label="New"
            sm
            variant="ghost"
            items={[
              { label: "New recorder", href: "/cctv/recorders/new" },
              { label: "New camera", href: "/cctv/cameras/new" },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <Kpi label="Recorders" value={recorderRows.length} />
        <Kpi label="Cameras active" value={active} unit={`/ ${cameraCount}`} />
        <Kpi label="Faulty / offline" value={faulty} accent={faulty > 0 ? "danger" : "accent"} />
        <Kpi label="Below retention" value={belowRetention} accent={belowRetention > 0 ? "warn" : "accent"} />
      </div>

      <div className="flex flex-col gap-3.5">
        <Panel>
          <PanelHeader title={`Recorders · ${recorderRows.length}`} />
          {recorderRows.length === 0 ? (
            <PanelEmpty>No recorders recorded yet.</PanelEmpty>
          ) : (
            <Table>
              <Thead columns={["Model", "Channels", "Retention", "Location", ""]} />
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
                          <Chip tone="danger">{r.retention_days}d</Chip>
                        ) : (
                          <span className="mono">{r.retention_days}d</span>
                        )}
                      </Td>
                      <Td>{r.location ?? "—"}</Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/cctv/recorders/${r.id}/edit`}>
                            <Button sm variant="ghost">
                              Edit
                            </Button>
                          </Link>
                          <VerifyButton table="cctv_recorders" id={r.id} />
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
          <PanelHeader title={`Cameras · ${cameraCount}`} />
          {cameraCount === 0 ? (
            <PanelEmpty>No cameras recorded yet.</PanelEmpty>
          ) : (
            <Table>
              <Thead columns={["Label", "Type", "Resolution", "Placement", "Status", ""]} />
              <tbody>
                {cameraRows.map((c) => (
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
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/cctv/cameras/${c.id}/edit`}>
                          <Button sm variant="ghost">
                            Edit
                          </Button>
                        </Link>
                        <VerifyButton table="cctv_cameras" id={c.id} />
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
