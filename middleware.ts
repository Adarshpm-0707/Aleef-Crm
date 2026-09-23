/**
 * middleware.ts
 *
 * Supabase session refresh middleware.
 * Runs on every matched request to keep the user session alive.
 * Add role-based redirects here as your auth system grows.
 *
 * Docs: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // In local development / mock mode without Supabase credentials, allow requests
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("<your-project-ref>")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not remove this line.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Role-based route guards ─────────────────────────────────────────────
  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes
  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/manager") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/portal");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal/dashboard"; // default client portal route
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
