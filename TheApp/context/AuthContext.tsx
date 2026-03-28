import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { BACKEND_URL } from '../constants/config';
import { normalizeProfileRole } from '../constants/roles';

interface Profile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
  status: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

function normalizeRole(role: unknown): Profile['role'] {
  return normalizeProfileRole(role);
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) fetchProfile(data.session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) fetchProfile(s.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      async function fetchProfileFromBackend() {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          setProfile(null);
          return;
        }

        const meRes = await fetch(`${BACKEND_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meRes.ok) {
          setProfile(null);
          return;
        }

        const me = await meRes.json();
        setProfile({
          id: me.id ?? userId,
          email: me.email ?? '',
          username: me.username ?? '',
          full_name: me.full_name ?? me.fullname ?? '',
          role: normalizeRole(me.role),
          status: me.status ?? '',
        } as Profile);
      }

      if (error) {
        // Fallback: call backend `/api/me` to trigger backend token verification.
        // This usually ensures `profiles` exists so we can read `role/status`.
        try {
          await fetchProfileFromBackend();
          return;
        } catch (_) {
          setProfile(null);
          return;
        }
      }

      setProfile({
        ...(data as Profile),
        role: normalizeRole((data as Profile)?.role),
      });
    } catch (_) {
      // If the Supabase `profiles` query itself throws (not just returns an `error`),
      // still try the backend as a fallback.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          setProfile(null);
          return;
        }

        const meRes = await fetch(`${BACKEND_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meRes.ok) {
          setProfile(null);
          return;
        }

        const me = await meRes.json();
        setProfile({
          id: me.id ?? userId,
          email: me.email ?? '',
          username: me.username ?? '',
          full_name: me.full_name ?? me.fullname ?? '',
          role: normalizeRole(me.role),
          status: me.status ?? '',
        } as Profile);
      } catch (_) {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
