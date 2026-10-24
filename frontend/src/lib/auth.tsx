import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True only when both public Supabase values are present at build time. */
export const AUTH_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export interface AuthState {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthState | null>(null);

function normalizeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Wait a few minutes and try again.';
  }
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Email or password is incorrect.';
  }
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Try signing in or resetting the password.';
  }
  if (lower.includes('email not confirmed')) {
    return 'This email address is not confirmed yet. Check your inbox for the confirmation link.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'The authentication service could not be reached. Check your connection and Supabase settings.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(AUTH_CONFIGURED);

  useEffect(() => {
    if (!AUTH_CONFIGURED) {
      setLoading(false);
      return;
    }
    // Effect-local cancellation avoids React StrictMode double-init leaks.
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      if (cancelled) return;
      const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      setClient(supabase);
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (cancelled) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback<AuthState['signIn']>(
    async (email, password) => {
      if (!client) return { error: 'Authentication is not configured.', needsConfirmation: false };
      const { error } = await client.auth.signInWithPassword({ email, password });
      return { error: error ? normalizeAuthError(error.message) : null, needsConfirmation: false };
    },
    [client],
  );

  const signUp = useCallback<AuthState['signUp']>(
    async (email, password) => {
      if (!client) return { error: 'Authentication is not configured.', needsConfirmation: false };
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) return { error: normalizeAuthError(error.message), needsConfirmation: false };
      return { error: null, needsConfirmation: !data.session };
    },
    [client],
  );

  const signOut = useCallback<AuthState['signOut']>(async () => {
    if (!client) return { error: 'Authentication is not configured.' };
    const { error } = await client.auth.signOut();
    return { error: error ? normalizeAuthError(error.message) : null };
  }, [client]);

  const requestPasswordReset = useCallback<AuthState['requestPasswordReset']>(
    async (email) => {
      if (!client) return { error: 'Authentication is not configured.' };
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error ? normalizeAuthError(error.message) : null };
    },
    [client],
  );

  const updatePassword = useCallback<AuthState['updatePassword']>(
    async (password) => {
      if (!client) return { error: 'Authentication is not configured.' };
      const { error } = await client.auth.updateUser({ password });
      return { error: error ? normalizeAuthError(error.message) : null };
    },
    [client],
  );

  const value = useMemo<AuthState>(
    () => ({
      configured: AUTH_CONFIGURED,
      loading,
      user,
      session,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [loading, user, session, signIn, signUp, signOut, requestPasswordReset, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
