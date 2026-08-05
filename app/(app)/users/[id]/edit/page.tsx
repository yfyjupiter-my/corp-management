import { notFound } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditUserForm } from "../../EditUserForm";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Edit a user (PRD Story 4, revised).
 *
 * ⚠️ This page reads through the **service-role** client, because the email
 * lives in `auth.users`, which the anon key cannot see. That makes the
 * signed-in check below load-bearing rather than decorative — middleware
 * already gates `(app)`, and this is the second lock on the same door.
 *
 * Editing yourself is allowed (deleting yourself is not — see the DELETE route).
 */
export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const actor = await getCurrentUser();
  if (!actor) notFound();

  const t = await getDictionary();
  const admin = createAdminClient();

  const [{ data: authUser }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin.from("profiles").select("user_id, full_name").eq("user_id", id).maybeSingle(),
  ]);
  // An auth user with no profile is the orphan shape the app treats as
  // non-existent, so it is a 404 here too — same rule as the PATCH route.
  if (!authUser?.user || !profile) notFound();

  const name = profile.full_name ?? authUser.user.email ?? id;

  return (
    <EditUserForm
      user={{
        id,
        full_name: profile.full_name ?? "",
        email: authUser.user.email ?? "",
        password: undefined,
      }}
      title={t.users.editTitle(name)}
      subtitle={t.users.editSubtitle}
    />
  );
}
