import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for browser/Client Components.
 *
 * Uses the anon key, so every query is subject to Row Level Security. That is
 * the intended security boundary — see supabase/migrations/*_rls.sql. Never
 * import the service-role client here; it would be bundled and shipped to the
 * browser.
 *
 * createBrowserClient memoises internally, so calling this on every render is
 * cheap and returns the same underlying client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
