import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DeleteButton } from "@/components/ui/DeleteButton";
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
  // The caller's own row gets a "You" chip instead of a Delete button: the route
  // refuses self-deletion (it is what guarantees the last account can never be
  // removed), so offering the button would only ever produce an error.
  const me = await getCurrentUser();
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
              <Thead columns={[t.users.colName, t.users.colAdded, ""]} />
              <tbody>
                {profiles.map((p) => (
                  <Tr key={p.user_id}>
                    <Td>{p.full_name ?? "—"}</Td>
                    <Td mono>{new Date(p.created_at).toLocaleDateString("en-GB")}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit is offered on every row, own account included —
                            unlike Delete, there is nothing unsafe about it. */}
                        <Link href={`/users/${p.user_id}/edit`}>
                          <Button sm variant="ghost">
                            {t.common.edit}
                          </Button>
                        </Link>
                        {p.user_id === me?.id ? (
                          <Chip dot={false}>{t.users.you}</Chip>
                        ) : (
                          <DeleteButton
                            endpoint={`/api/users/${p.user_id}`}
                            confirm={t.users.deleteConfirm(p.full_name ?? p.user_id)}
                          />
                        )}
                      </div>
                    </Td>
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
