import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { InviteForm } from "./InviteForm";

export const dynamic = "force-dynamic";

/** Users & roles (PRD Story 4) — HQ admin only. */
export default async function UsersPage() {
  const user = await getCurrentUser();
  if (user?.role !== "hq_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, role, country_code, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHead
        eyebrow="Administration"
        title="Users & roles"
        subtitle="Invite users and assign a role and country. Public sign-up is disabled."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3.5 items-start">
        <Panel>
          <PanelHeader title={`${profiles?.length ?? 0} user(s)`} />
          {!profiles || profiles.length === 0 ? (
            <PanelEmpty>No users yet.</PanelEmpty>
          ) : (
            <Table>
              <Thead columns={["Name", "Role", "Country", "Added"]} />
              <tbody>
                {profiles.map((p) => (
                  <Tr key={p.user_id}>
                    <Td>{p.full_name ?? "—"}</Td>
                    <Td>
                      <Chip tone={p.role === "hq_admin" ? "info" : "neutral"}>
                        {p.role === "hq_admin" ? "HQ Admin" : "Country Manager"}
                      </Chip>
                    </Td>
                    <Td mono>{p.country_code ?? "ALL"}</Td>
                    <Td mono>{new Date(p.created_at).toLocaleDateString("en-GB")}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Invite a user" />
          <div className="p-4">
            <InviteForm />
          </div>
        </Panel>
      </div>
    </>
  );
}
