// src/lib/useAdminAuth.ts
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// ASSUMPTION — flagged: admin status is checked against a
// `profiles` table (id = auth.users.id, `role` text column).
// If Meckury AI names this differently, change PROFILES_TABLE /
// ROLE_COLUMN here and in the matching SQL policy — nothing else
// in the admin flow needs to change.
const PROFILES_TABLE = 'profiles';
const ROLE_COLUMN = 'role';
const ADMIN_ROLE_VALUE = 'admin';

interface AdminAuthState {
  loading: boolean;
  session: Session | null;
  isAdmin: boolean;
  error: string | null;
}

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({
    loading: true,
    session: null,
    isAdmin: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin(session: Session | null) {
      if (!session) {
        if (!cancelled) setState({ loading: false, session: null, isAdmin: false, error: null });
        return;
      }

      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .select(ROLE_COLUMN)
        .eq('id', session.user.id)
        .single();

      if (cancelled) return;

      if (error) {
        setState({ loading: false, session, isAdmin: false, error: error.message });
        return;
      }

      const role = (data as Record<string, unknown> | null)?.[ROLE_COLUMN];
      setState({
        loading: false,
        session,
        isAdmin: role === ADMIN_ROLE_VALUE,
        error: null,
      });
    }

    supabase.auth.getSession().then(({ data }) => checkAdmin(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({ ...s, loading: true }));
      checkAdmin(session);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signInAdmin(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutAdmin() {
  return supabase.auth.signOut();
}
