import 'server-only';
import { NextResponse } from 'next/server';
import { requireStaffClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * ============================================================================
 * ROUTE-LEVEL AUTHORIZATION FOR /api/v1
 * ============================================================================
 *
 * src/repositories/BaseRepository.js queries with the SERVICE-ROLE client, so
 * Row Level Security is not consulted for anything the ERP services read or
 * write. Every route that reaches a repository is therefore only as safe as its
 * own check: with no check it is an unauthenticated dump of the whole database
 * across every tenant.
 *
 * src/proxy.js is NOT that check. Next's own docs say Proxy is not an
 * authorization layer, and this one deliberately does not read platform_role —
 * it only 401s a request with no session at all. A signed-in *member* sails
 * straight through it. The role decision has to happen here.
 *
 * These helpers do not throw. The existing handlers wrap their bodies in
 * `try { ... } catch { 500 }`, so an exception raised inside that block would
 * be laundered into a 500 and — worse — into a body carrying the raw error
 * message. Instead each helper returns either
 *
 *     { ok: true,  ... }                       // caller may proceed
 *     { ok: false, response: NextResponse }    // caller must `return` it
 *
 * and is called BEFORE the try block, so the status code it chose is the one
 * that reaches the client.
 */

/** Shape every failure the same way the routes shape their own errors. */
function fail(status, code, message) {
  return {
    ok: false,
    response: NextResponse.json(
      { success: false, error: { code, message } },
      { status }
    ),
  };
}

/**
 * Translate a requireStaffClient() rejection into an HTTP response.
 *
 * requireStaffClient() marks its own two failures with `err.status` (401 for no
 * session, 403 for a signed-in non-staff caller). Anything else is a genuine
 * fault — a missing SUPABASE_SERVICE_ROLE_KEY, an unreachable auth server — and
 * must NOT be reported as 403: that would tell an operator "you lack access"
 * when the truth is "the server is misconfigured". Those become a 500 with a
 * generic body, the detail going to the server log only.
 */
function toAuthFailure(error) {
  if (error?.status === 401) {
    return fail(
      401,
      'UNAUTHORIZED',
      'Authentication required to access this resource.'
    );
  }
  if (error?.status === 403) {
    return fail(403, 'FORBIDDEN', 'Staff access required.');
  }

  console.error('[api/guards] authorization check failed:', error);
  return fail(500, 'AUTH_CHECK_FAILED', 'Could not verify your access.');
}

/**
 * Staff gate for /api/v1/erp/* and /api/v1/search.
 *
 * 401 when signed out, 403 when signed in as a non-staff member — a status,
 * never a redirect, because these are JSON endpoints and a 30x would be parsed
 * as a successful response by every caller that fetches them.
 *
 * Usage, at the very top of the handler and outside its try block:
 *
 *     const gate = await requireStaff();
 *     if (!gate.ok) return gate.response;
 *
 * On success `gate.admin` is the service-role client, `gate.user` the verified
 * auth user and `gate.profile` their profile row. Routes that go through the
 * service layer ignore all three and just use the gate for its side effect of
 * having verified the caller.
 */
export async function requireStaff() {
  try {
    const { admin, user, profile } = await requireStaffClient();
    return { ok: true, admin, user, profile };
  } catch (error) {
    return toAuthFailure(error);
  }
}

/**
 * Session gate for member-facing routes.
 *
 * Returns the caller's own anon-key client — RLS applies to everything done
 * with it — together with the identity the database will enforce. The point is
 * that `user.id` comes from a JWT the auth server revalidated, so a handler has
 * no reason to read an id out of a query string or a JSON body. It must not:
 * those are attacker-controlled.
 *
 * 401 when signed out. There is no 403 branch — any active account may use a
 * member route; which *rows* it may see is RLS's decision, not this function's.
 */
export async function requireMember() {
  let supabase;
  try {
    supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return fail(
        401,
        'UNAUTHORIZED',
        'Authentication required to access this resource.'
      );
    }

    return { ok: true, supabase, user };
  } catch (error) {
    console.error('[api/guards] session check failed:', error);
    return fail(500, 'AUTH_CHECK_FAILED', 'Could not verify your session.');
  }
}
