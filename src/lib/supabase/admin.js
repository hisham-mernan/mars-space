import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * `import 'server-only'` makes the build fail if this module is ever pulled
 * into a Client Component, which is the guard that keeps the service-role key
 * out of the browser bundle. It must never be imported from anything under a
 * 'use client' boundary, and never from the mobile app.
 *
 * Legitimate uses:
 *   - /erp routes, after verifying the caller's platform_role server-side
 *   - inviting a member (auth.admin.inviteUserByEmail)
 *   - scheduled jobs and webhooks that act with no end-user session
 *
 * Everything a member does should go through the anon client so RLS applies.
 * Reaching for this client to "make a query work" is how tenant isolation gets
 * lost — if a member-facing query needs it, the policy is wrong.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (never NEXT_PUBLIC_).'
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Guard for staff-only server code.
 *
 * Verifies the *caller's* identity with the anon client (so RLS and the JWT
 * check still apply) and only then hands back the admin client. Import the
 * request-scoped client lazily to keep this module free of next/headers at the
 * top level.
 *
 * Throws if the caller is not staff, so route handlers can let it bubble to a
 * 403 rather than silently returning data.
 */
export async function requireStaffClient() {
  const { createClient: createServerClient } = await import('./server');
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('platform_role, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status !== 'active' ||
      !['staff', 'erp_admin'].includes(profile.platform_role)) {
    const err = new Error('Staff access required');
    err.status = 403;
    throw err;
  }

  return { admin: createAdminClient(), user, profile };
}
