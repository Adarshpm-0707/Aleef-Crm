/**
 * lib/supabase/admin.ts
 *
 * Service-role Supabase client — NEVER import this in Client Components or
 * expose to the browser.  Used only in:
 *   - Route Handlers that need admin-level access (bypasses RLS)
 *   - Server Actions that operate on behalf of all users
 *   - Backend scripts / seed files
 *
 * The SUPABASE_SERVICE_ROLE_KEY is intentionally NOT prefixed with
 * NEXT_PUBLIC_ so it cannot accidentally leak to the client bundle.
 */

import { createClient as _createClient } from "@supabase/supabase-js";

let _adminClient: ReturnType<typeof _createClient> | null = null;

/**
 * Returns a cached service-role Supabase client.
 * Singleton pattern — safe to call multiple times server-side.
 */
export function createAdminClient() {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[supabase/admin] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }

  _adminClient = _createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
