import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Next.js 16 renamed Middleware to Proxy (see the version-16 upgrade guide).
 * This file replaces the old src/middleware.js, which did not authenticate
 * anything: it checked only that a `mars_session` cookie *existed*, and that
 * cookie held the user object as plain unsigned JSON, so anyone could edit
 * their own role to ERP_ADMIN.
 *
 * Two jobs here:
 *   1. Refresh the Supabase session and write the rotated tokens onto the
 *      response. Server Components cannot set cookies, so without this the
 *      session silently expires mid-visit.
 *   2. An OPTIMISTIC redirect for signed-out visitors.
 *
 * The Next docs are explicit that Proxy is not a session-management or
 * authorization layer, and that holds here. The real boundary is Row Level
 * Security in the database plus the per-route staff checks in
 * src/lib/supabase/admin.js. This is a redirect for convenience, not a lock.
 */

const PROTECTED_PAGES = ['/member', '/erp'];
const PROTECTED_APIS = ['/api/v1/member', '/api/v1/erp'];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() revalidates the token against the auth server. getSession() only
  // decodes the cookie and must not be used to make this decision.
  const { data: { user } } = await supabase.auth.getUser();

  const isProtectedPage = PROTECTED_PAGES.some((p) => pathname.startsWith(p));
  const isProtectedApi = PROTECTED_APIS.some((p) => pathname.startsWith(p));

  if (!user && (isProtectedPage || isProtectedApi)) {
    if (isProtectedApi) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to access this resource.',
          },
        },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Deliberately no platform_role check here. Reading the profile on every
  // request would put a database round-trip in front of every page, and the
  // /erp routes verify staff status themselves via requireStaffClient(). A
  // member who forces their way to /erp gets an empty screen and a 403 from
  // the API, not data.

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. The session has to be
     * refreshed on ordinary page loads too, not only on protected routes, or
     * tokens go stale for signed-in visitors browsing the public site.
     */
    '/((?!_next/static|_next/image|favicon.ico|assets|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|otf|pdf)$).*)',
  ],
};
