/**
 * lib/supabase/client.ts
 *
 * Browser-side Supabase client singleton.
 * Safe to import inside Client Components ("use client").
 * Uses the public anon key — Row Level Security enforced.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";
  return createBrowserClient(url, key);
}
