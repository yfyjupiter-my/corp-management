import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Shown when a user is authenticated but has no `profiles` row. Without this,
 * the (app) layout would redirect to /login, the middleware would bounce the
 * still-valid session back to /dashboard, and the two would loop forever
 * (ERR_TOO_MANY_REDIRECTS). This is a plain, ungated route that ends the loop
 * and lets the user sign out.
 */
export default async function NoAccessPage() {
  const t = await getDictionary();
  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-8">
      <div className="w-[380px] bg-surface border border-border rounded shadow-md p-[26px]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-accent text-accent-fg grid place-items-center font-head font-bold">
            CM
          </div>
          <div className="leading-tight">
            <div className="font-head font-semibold text-[15px]">{t.auth.brand}</div>
            <div className="text-[11px] text-fg-subtle">{t.auth.tagline}</div>
          </div>
        </div>

        <h3 className="text-[17px] font-semibold font-head mb-1">{t.auth.noAccessTitle}</h3>
        <p className="text-[13px] text-fg-muted mb-5">
          {t.auth.noAccessBody}
        </p>

        <form action={signOut}>
          <Button type="submit" variant="ghost" className="w-full justify-center">
            {t.auth.signOut}
          </Button>
        </form>
      </div>
    </div>
  );
}
