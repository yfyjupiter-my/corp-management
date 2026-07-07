import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";

export const dynamic = "force-dynamic";

const actionTone = { insert: "ok", update: "info", delete: "danger" } as const;

/** Audit log (PRD Story 4) — HQ admin only, immutable. */
export default async function AuditPage() {
  const user = await getCurrentUser();
  if (user?.role !== "hq_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("audit_log")
    .select("id, actor, action, table_name, record_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      <PageHead
        eyebrow="Administration"
        title="Audit log"
        subtitle="Every create, update, and delete — immutable, most recent first."
      />

      <Panel>
        <PanelHeader title={`${entries?.length ?? 0} recent event(s)`} />
        {!entries || entries.length === 0 ? (
          <PanelEmpty>No activity recorded yet.</PanelEmpty>
        ) : (
          <Table>
            <Thead columns={["When", "Action", "Table", "Record", "Actor"]} />
            <tbody>
              {entries.map((e) => (
                <Tr key={e.id}>
                  <Td mono>{new Date(e.created_at).toLocaleString("en-GB")}</Td>
                  <Td>
                    <Chip tone={actionTone[e.action]}>
                      <span className="capitalize">{e.action}</span>
                    </Chip>
                  </Td>
                  <Td mono>{e.table_name}</Td>
                  <Td mono className="text-fg-subtle">
                    {e.record_id?.slice(0, 8) ?? "—"}
                  </Td>
                  <Td mono className="text-fg-subtle">
                    {e.actor?.slice(0, 8) ?? "system"}
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
