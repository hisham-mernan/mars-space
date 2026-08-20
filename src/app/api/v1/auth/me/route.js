import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * The signed-in user, their profile, and their company memberships.
 *
 * Replaces the previous implementation, which JSON.parse'd an unsigned
 * `mars_session` cookie and returned whatever it contained — so a caller could
 * hand themselves any identity and role they liked.
 *
 * Now the identity comes from getUser(), which revalidates the JWT against the
 * auth server, and every joined row is filtered by RLS.
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: memberships } = await supabase
    .from('company_members')
    .select(`
      id, role, status, job_title,
      can_book_rooms, can_view_invoices, can_submit_repairs, can_manage_employees,
      company:companies ( id, name, name_ar, status )
    `)
    .eq('profile_id', user.id)
    .eq('status', 'active');

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: profile?.full_name ?? null,
        nameAr: profile?.full_name_ar ?? null,
        phone: profile?.phone ?? null,
        avatar: profile?.avatar_url ?? null,
        language: profile?.preferred_language ?? 'ar',
        role: profile?.platform_role ?? 'member',
        status: profile?.status ?? 'active',
      },
      memberships: memberships ?? [],
    },
  });
}
