import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui/PageHead";
import { Panel, PanelHeader, PanelEmpty } from "@/components/ui/Panel";
import { Table, Thead, Tr, Td } from "@/components/ui/Table";
import { Chip } from "@/components/ui/Chip";
import { InviteForm } from "./InviteForm";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Users & roles (PRD Story 4) — HQ admin only. */
export default async function UsersPage() {
  const user = await getCurrentUser();
  if (user?.role !== "hq_admin") redirect("/dashboard");

  const t = await getDictionary();
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, role, country_code, created_at")
    .order("created_at", { ascending: false });

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
              <Thead columns={[t.users.colName, t.users.colRole, t.users.colCountry, t.users.colAdded]} />
              <tbody>
                {profiles.map((p) => (
                  <Tr key={p.user_id}>
                    <Td>{p.full_name ?? "—"}</Td>
                    <Td>
                      <Chip tone={p.role === "hq_admin" ? "info" : "neutral"}>
                        {p.role === "hq_admin" ? t.users.roleHqAdmin : t.users.roleCountryManager}
                      </Chip>
                    </Td>
                    <Td mono>{p.country_code ?? t.users.allCountries}</Td>
                    <Td mono>{new Date(p.created_at).toLocaleDateString("en-GB")}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={t.users.invitePanel} />
          <div className="p-4">
            <InviteForm />
          </div>
        </Panel>
      </div>
    </>
  );
}
