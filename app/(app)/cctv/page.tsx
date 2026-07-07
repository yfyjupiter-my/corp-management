import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi } from "@/components/ui/Kpi";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { DEFAULT_MIN_RETENTION_DAYS } from "@/lib/constants/countries";
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

  const [recorders, cameras] = await Promise.all([
    supabase
      .from("cctv_recorders")
      .select("id, brand, model, channels, retention_days, location")
      .order("brand")
      .limit(50),
    supabase
      .from("cctv_cameras")
      .select("id, label, location_desc, camera_type, resolution, outdoor, status")
      .order("label")
      .limit(50),
  ]);

  const recorderRows = recorders.data ?? [];
  const cameraRows = cameras.data ?? [];
  const active = cameraRows.filter((c) => c.status === "active").length;
  const faulty = cameraRows.filter((c) => c.status !== "active").length;

  return (
    <>
      <PageHead
        eyebrow="Module"
        title="CCTV"
        subtitle="Recorders, cameras, retention, and maintenance."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <Kpi label="Recorders" value={recorderRows.length} />
        <Kpi label="Cameras active" value={active} unit={`/ ${cameraRows.length}`} />
        <Kpi label="Faulty / offline" value={faulty} accent={faulty > 0 ? "danger" : "accent"} />
        <Kpi
          label="Below retention"
          value={recorderRows.filter((r) => (r.retention_days ?? 0) < DEFAULT_MIN_RETENTION_DAYS).length}
          accent="warn"
        />
      </div>

      <div className="flex flex-col gap-3.5">
        <Panel>
          <PanelHeader title={`Recorders · ${recorderRows.length}`} />
          {recorderRows.length === 0 ? (
            <PanelEmpty>No recorders recorded yet.</PanelEmpty>
          ) : (
            <Table>
              <Thead columns={["Model", "Channels", "Retention", "Location"]} />
              <tbody>
                {recorderRows.map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      {r.brand} {r.model}
                    </Td>
                    <Td mono>{r.channels ?? "—"}</Td>
                    <Td>
                      {r.retention_days != null &&
                      r.retention_days < DEFAULT_MIN_RETENTION_DAYS ? (
                        <Chip tone="danger">{r.retention_days}d</Chip>
                      ) : (
                        <span className="mono">{r.retention_days ?? "—"}d</span>
                      )}
                    </Td>
                    <Td>{r.location ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={`Cameras · ${cameraRows.length}`} />
          {cameraRows.length === 0 ? (
            <PanelEmpty>No cameras recorded yet.</PanelEmpty>
          ) : (
            <Table>
              <Thead columns={["Label", "Location", "Type", "Resolution", "Placement", "Status"]} />
              <tbody>
                {cameraRows.map((c) => (
                  <Tr key={c.id}>
                    <Td mono>{c.label}</Td>
                    <Td>{c.location_desc ?? "—"}</Td>
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
          )}
        </Panel>
      </div>
    </>
  );
}
