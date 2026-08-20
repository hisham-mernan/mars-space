import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Password sign-in.
 *
 * The previous implementation accepted ANY email with ANY password (it never
 * checked one — its `mockHash` helper was dead code), hardcoded three demo
 * accounts, auto-created a MEMBER for anything else, and stored the resulting
 * user object as unsigned JSON in a `mars_session` cookie. Editing that cookie
 * to `role: "ERP_ADMIN"` granted the whole ERP.
 *
 * Supabase now verifies the password and issues a signed JWT; @supabase/ssr
 * writes the session cookies. The web app signs in client-side via
 * supabase.auth.signInWithPassword — this route exists for the mobile app and
 * any other non-browser client.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_INPUT', message: 'Malformed request body.' } },
      { status: 400 }
    );
  }

  const { email, password } = body ?? {};

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_INPUT', message: 'Email and password are required.' } },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim(),
    password: String(password),
  });

  if (error || !data?.user) {
    // One generic message for both "no such account" and "wrong password".
    // Distinguishing them turns this endpoint into a membership oracle.
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, full_name_ar, phone, avatar_url, preferred_language, platform_role, status')
    .eq('id', data.user.id)
    .single();

  // A suspended member keeps valid credentials but must not get in.
  if (profile?.status === 'suspended') {
    await supabase.auth.signOut();
    return NextResponse.json(
      { success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'This account is suspended. Please contact Mars Space.' } },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.full_name ?? null,
        nameAr: profile?.full_name_ar ?? null,
        phone: profile?.phone ?? null,
        avatar: profile?.avatar_url ?? null,
        language: profile?.preferred_language ?? 'ar',
        role: profile?.platform_role ?? 'member',
      },
      // The mobile app stores these in expo-secure-store; browsers get cookies
      // from the SSR adapter and can ignore them.
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at,
      },
    },
  });
}
