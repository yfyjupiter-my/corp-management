import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { DiffCell } from "./DiffCell";

export const dynamic = "force-dynamic";

const actionTone = { insert: "ok", update: "info", delete: "danger" } as const;
const PER_PAGE = 50;

/**
 * Audit log (PRD Story 4) — HQ admin only, immutable, paginated.
 * Shows actor / action / table / record / diff / time, most recent first.
 * RLS restricts SELECT to hq_admin (0002_rls.sql) and there is no insert/update/
 * delete policy, so the log cannot be altered from the app.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role !== "hq_admin") redirect("/dashboard");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createClient();
  const { data: entries, count, error } = await supabase
    .from("audit_log")
    .select("id, actor, action, table_name, record_id, diff, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) console.error("[audit] query failed:", error);

  // Resolve actor UUIDs to names for the rows on this page (best-effort).
  const actorIds = [...new Set((entries ?? []).map((e) => e.actor).filter(Boolean))];
  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", actorIds as string[]);
    for (const p of profiles ?? []) {
      if (p.full_name) actorNames.set(p.user_id, p.full_name);
    }
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const start = total === 0 ? 0 : from + 1;
  const end = Math.min(from + PER_PAGE, total);

  return (
    <>
      <PageHead
        eyebrow="Administration"
        title="Audit log"
        subtitle="Every create, update, and delete — immutable, most recent first."
      />

      <Panel>
        <PanelHeader
          title={
            error
              ? "Audit log unavailable"
              : total === 0
                ? "No activity"
                : `${start}–${end} of ${total} event(s)`
          }
        />
        {error ? (
          <PanelEmpty>The audit log is temporarily unavailable. Please try again.</PanelEmpty>
        ) : !entries || entries.length === 0 ? (
          <PanelEmpty>No activity recorded yet.</PanelEmpty>
        ) : (
          <Table>
            <Thead columns={["When", "Action", "Table", "Record", "Actor", "Changes"]} />
            <tbody>
              {entries.map((e) => (
                <Tr key={e.id}>
                  <Td mono>{new Date(e.created_at).toLocaleString("en-GB")}</Td>
                  <Td>
                    <Chip tone={actionTone[e.action as keyof typeof actionTone] ?? "neutral"}>
                      <span className="capitalize">{e.action}</span>
                    </Chip>
                  </Td>
                  <Td mono>{e.table_name}</Td>
                  <Td mono className="text-fg-subtle">
                    {e.record_id?.slice(0, 8) ?? "—"}
                  </Td>
                  <Td className="text-fg-muted">
                    {e.actor
                      ? (actorNames.get(e.actor) ?? (
                          <span className="font-mono text-[12.5px] text-fg-subtle">
                            {e.actor.slice(0, 8)}
                          </span>
                        ))
                      : "system"}
                  </Td>
                  <Td>
                    <DiffCell diff={e.diff as Record<string, unknown> | null} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-[12px] text-fg-subtle">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <PageLink page={page - 1} disabled={page <= 1}>
              ← Newer
            </PageLink>
            <PageLink page={page + 1} disabled={page >= totalPages}>
              Older →
            </PageLink>
          </div>
        </div>
      )}
    </>
  );
}

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "px-3 py-1.5 rounded-sm text-[12px] font-semibold font-head border transition-colors";
  if (disabled) {
    return (
      <span className={cls + " text-fg-subtle border-border bg-surface-2 cursor-not-allowed"}>
        {children}
      </span>
    );
  }
  return (
    <a
      href={`/audit?page=${page}`}
      className={cls + " text-fg border-border-strong bg-surface hover:bg-surface-2"}
    >
      {children}
    </a>
  );
}
