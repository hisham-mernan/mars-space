import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * Still the anon key, so RLS applies exactly as it does in the browser and on
 * mobile — one policy set governs all three. Use `createAdminClient` from
 * ./admin only for staff/ERP work that must bypass RLS.
 *
 * `cookies()` is async in Next 16, so this function is async and every call
 * site must await it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies. This is safe to ignore as
            // long as proxy.js refreshes the session on every request, which it
            // does — that is the write path for refreshed tokens.
          }
        },
      },
    }
  );
}

/**
 * The signed-in user, or null.
 *
 * Always reads through `getUser()`, which revalidates the JWT against the auth
 * server. `getSession()` returns whatever is in the cookie without verifying
 * it, so it must never be used for an authorization decision on the server.
 */
export async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

/**
 * The signed-in user's profile row, including platform_role, or null.
 */
export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data ?? null;
}

/**
 * Companies the signed-in user belongs to, with their permission flags.
 * Returns [] when signed out. Most member screens need exactly this.
 */
export async function getMemberships() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('company_members')
    .select('*, company:companies(*)')
    .eq('profile_id', user.id)
    .eq('status', 'active');

  return data ?? [];
}
