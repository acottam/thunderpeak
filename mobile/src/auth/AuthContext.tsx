import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, apiFetch } from '@/api/client';
import { clearSession, loadSession, saveSession, type Session, type User } from '@/auth/sessionStore';

// For signed-in requests (visits, score). A 401 signs the person out (docs/api.md, Tokens).
export type AuthFetch = <T>(path: string, options?: { method?: 'GET' | 'POST'; body?: unknown }) => Promise<T>;

type AuthValue = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  signIn: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  authFetch: AuthFetch;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthValue['status']>('loading');
  const [session, setSession] = useState<Session | null>(null);

  const signOut = useCallback(async () => {
    setSession(null);
    setStatus('signedOut');
    await clearSession();
  }, []);

  // Restore the saved session right away, then check the token with GET /me.
  // Only a 401 signs out: a sleeping or unreachable server keeps the person signed in.
  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await loadSession();
      if (!active) return;
      if (!saved) {
        setStatus('signedOut');
        return;
      }
      setSession(saved);
      setStatus('signedIn');
      try {
        const user = await apiFetch<User>('/me', { token: saved.token });
        if (active) setSession({ token: saved.token, user });
      } catch (error) {
        if (active && error instanceof ApiError && error.status === 401) await signOut();
      }
    })();
    return () => {
      active = false;
    };
  }, [signOut]);

  const start = useCallback(async (path: '/auth/login' | '/auth/register', username: string, password: string) => {
    const next = await apiFetch<Session>(path, { method: 'POST', body: { username, password } });
    await saveSession(next);
    setSession(next);
    setStatus('signedIn');
  }, []);

  const signIn = useCallback((u: string, p: string) => start('/auth/login', u, p), [start]);
  const register = useCallback((u: string, p: string) => start('/auth/register', u, p), [start]);

  const token = session?.token ?? null;
  const authFetch = useCallback(
    async <T,>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}) => {
      if (!token) throw new ApiError('Sign in required', 401);
      try {
        return await apiFetch<T>(path, { ...options, token });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await signOut();
        throw error;
      }
    },
    [token, signOut],
  );

  const value = useMemo<AuthValue>(
    () => ({ status, user: session?.user ?? null, signIn, register, signOut, authFetch }),
    [status, session, signIn, register, signOut, authFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
