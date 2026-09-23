/**
 * lib/supabase/server.ts
 *
 * Server-side Supabase client for use inside:
 *   - Server Components
 *   - Route Handlers
 *   - Server Actions
 *
 * Uses @supabase/ssr createServerClient which reads/writes cookies via
 * the Next.js cookies() API.  Call `createClient()` once per request —
 * it is NOT a singleton.
 *
 * Security: uses the anon key with RLS enforced.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component where cookies cannot
            // be mutated.  The middleware is responsible for session refresh.
          }
        },
      },
    }
  );
}
