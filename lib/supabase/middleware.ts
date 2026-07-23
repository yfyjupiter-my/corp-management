import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Refreshes the Supabase session cookie on every matched request and gates the
 * authenticated area. Called from the root `middleware.ts`.
 *
 * Authorization (who-sees-what) is enforced by Postgres RLS; this only handles
 * authentication (is there a valid session) and routing.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/login" || pathname.startsWith("/auth");
  // Password recovery pages are public but must NOT bounce an authenticated
  // session away — the reset link grants a recovery session before /reset-password.
  const isRecoveryRoute =
    pathname === "/forgot-password" || pathname === "/reset-password";
  const isPublicAsset =
    pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  // Unauthenticated → send to login (except on auth / recovery routes / public assets).
  if (!user && !isAuthRoute && !isRecoveryRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting the login page → send to the app.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Locale seed (TASKS 13.11): precedence is cookie → profiles.locale → en.
  // Only runs when the cookie is absent, i.e. once per new browser, so
  // `getLocale()` stays a pure cookie read on every other request.
  if (user && !request.cookies.get(LOCALE_COOKIE)) {
    const { data } = await supabase
      .from("profiles")
      .select("locale")
      .eq("user_id", user.id)
      .single();

    if (isLocale(data?.locale)) {
      response.cookies.set(LOCALE_COOKIE, data.locale, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: ONE_YEAR_SECONDS,
      });
    }
  }

  return response;
}
