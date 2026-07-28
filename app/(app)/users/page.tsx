import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { CreateUserForm } from "./CreateUserForm";
import { LIST_PAGE_SIZE } from "@/lib/constants/limits";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Users (PRD Story 4, revised). Open to every authenticated user — roles were
 * removed in 0006_drop_roles.sql, so there is no admin tier left to gate on.
 */
export default async function UsersPage() {
  const t = await getDictionary();
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, created_at")
    .order("created_at", { ascending: false })
    .limit(LIST_PAGE_SIZE);

  return (
    <>
      <PageHead
        title={t.users.title}
        subtitle={t.users.subtitle}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3.5 items-start">
        <Panel>
          <PanelHeader title={t.users.userCount(profiles?.length ?? 0)} />
          {!profiles || profiles.length === 0 ? (
            <PanelEmpty>{t.users.none}</PanelEmpty>
          ) : (
            <Table>
              <Thead columns={[t.users.colName, t.users.colAdded]} />
              <tbody>
                {profiles.map((p) => (
                  <Tr key={p.user_id}>
                    <Td>{p.full_name ?? "—"}</Td>
                    <Td mono>{new Date(p.created_at).toLocaleDateString("en-GB")}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={t.users.createPanel} />
          <div className="p-4">
            <CreateUserForm />
          </div>
        </Panel>
      </div>
    </>
  );
}
