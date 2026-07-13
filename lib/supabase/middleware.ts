import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

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

  return response;
}
