'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * The signed-in member, everywhere in the app.
 *
 * Replaces the `localStorage['mars-user']` read that was copy-pasted into 26
 * files. That pattern was not authentication — it was a JSON blob the user
 * could edit in devtools — and it also meant every page re-derived identity on
 * its own with no way to react to a sign-out in another tab.
 *
 * The `user` object keeps the field names the old blob used (name, email, id,
 * company) so existing screens need only swap their useEffect for useSession().
 *
 * This is convenience state, not a security boundary. What a member can
 * actually read or write is decided by Row Level Security in the database;
 * `hasPerm` here only decides what to show them.
 */

const SessionContext = createContext(null);

const EMPTY = {
  user: null,
  profile: null,
  memberships: [],
  activeCompany: null,
  loading: true,
  signOut: async () => {},
  hasPerm: () => false,
  isStaff: false,
};

export function SessionProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load(sessionUser) {
      if (!sessionUser) {
        if (!cancelled) {
          setAuthUser(null);
          setProfile(null);
          setMemberships([]);
          setLoading(false);
        }
        return;
      }

      const [{ data: prof }, { data: mems }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', sessionUser.id).single(),
        supabase
          .from('company_members')
          .select(`
            id, role, status, job_title,
            can_book_rooms, can_view_invoices, can_submit_repairs, can_manage_employees,
            company:companies ( id, name, name_ar, status )
          `)
          .eq('profile_id', sessionUser.id)
          .eq('status', 'active'),
      ]);

      if (cancelled) return;
      setAuthUser(sessionUser);
      setProfile(prof ?? null);
      setMemberships(mems ?? []);
      setLoading(false);
    }

    // getUser() revalidates against the auth server rather than trusting the
    // cookie, so a revoked session does not linger in the UI.
    supabase.auth.getUser().then(({ data }) => load(data?.user ?? null));

    // Keeps tabs in step: signing out in one signs out the rest.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        load(null);
      } else if (session?.user) {
        load(session.user);
      }
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    // Company membership is single in practice today, but the schema allows
    // several; take the first active one as the working context.
    const activeMembership = memberships[0] ?? null;
    const activeCompany = activeMembership?.company ?? null;
    const isStaff = ['staff', 'erp_admin'].includes(profile?.platform_role);

    const user = authUser
      ? {
          id: authUser.id,
          email: authUser.email,
          name: profile?.full_name ?? authUser.email?.split('@')[0] ?? '',
          nameAr: profile?.full_name_ar ?? null,
          phone: profile?.phone ?? null,
          avatar: profile?.avatar_url ?? null,
          language: profile?.preferred_language ?? 'ar',
          role: profile?.platform_role ?? 'member',
          company: activeCompany?.name ?? null,
          companyAr: activeCompany?.name_ar ?? null,
          companyId: activeCompany?.id ?? null,
        }
      : null;

    return {
      user,
      profile,
      memberships,
      activeMembership,
      activeCompany,
      loading,
      isStaff,

      /**
       * Whether the member holds a permission in their active company.
       * A company_admin implicitly holds all four, mirroring the
       * has_company_perm() function the RLS policies use.
       */
      hasPerm(perm) {
        if (isStaff) return true;
        if (!activeMembership) return false;
        if (activeMembership.role === 'company_admin') return true;
        return Boolean(
          {
            book_rooms: activeMembership.can_book_rooms,
            view_invoices: activeMembership.can_view_invoices,
            submit_repairs: activeMembership.can_submit_repairs,
            manage_employees: activeMembership.can_manage_employees,
          }[perm]
        );
      },

      async signOut() {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = '/auth/login';
      },
    };
  }, [authUser, profile, memberships, loading]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext) ?? EMPTY;
}
