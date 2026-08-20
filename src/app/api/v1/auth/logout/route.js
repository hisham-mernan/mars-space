import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Sign out. Supabase revokes the refresh token server-side and clears the
 * session cookies through the SSR cookie adapter, so this is a real logout
 * rather than the previous version's cookie deletion (which left nothing to
 * revoke, because the cookie itself was the whole "session").
 */
export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'LOGOUT_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
}
