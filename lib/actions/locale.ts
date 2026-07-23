"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Switches the UI language (TASKS.md 13.10).
 *
 * The cookie is the read path for every render; `profiles.locale` is the
 * durable copy that middleware (13.11) uses to seed the cookie on a browser
 * that arrives without one. Signed-out callers still get the cookie — the
 * login page is translated too — and the RPC is simply skipped.
 */
export async function setLocale(next: string): Promise<void> {
  // Validate before anything is written; the value comes from the client.
  if (!isLocale(next)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, next, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Column-scoped security definer RPC — profiles has no self-update policy
    // by design (see 0005_locale.sql). A failure here is not fatal: the cookie
    // already carries the choice for this browser.
    await supabase.rpc("set_my_locale", { p_locale: next });
  }

  revalidatePath("/", "layout");
}
