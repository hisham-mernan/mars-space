import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Landing point for every emailed auth link: the admin invite, a password
 * reset, and email confirmation.
 *
 * Supabase sends the recipient here with a one-time `code`, which is exchanged
 * for a session. Once that succeeds the visitor is signed in and can set a
 * password at /auth/set-password.
 *
 * This is the redirect target configured in supabase/config.toml. The mobile
 * app registers marsspace://set-password for the same emails and handles the
 * exchange in-app instead.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/auth/set-password';
  const errorDescription = searchParams.get('error_description');

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Invite and reset links are single-use and time-limited, so an expired
    // link is the ordinary case here, not an edge case.
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent('This link has expired or has already been used. Please request a new one.')}`
    );
  }

  // Only same-origin paths: ?next= must not become an open redirect.
  const safeNext =
    next.startsWith('/') && !next.startsWith('//') ? next : '/auth/set-password';

  return NextResponse.redirect(`${origin}${safeNext}`);
}
