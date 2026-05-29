import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture_url: string | null;
  created_at: number;
}

interface AuthState {
  user: User | null;
  initializing: boolean;
}

interface AuthCtx extends AuthState {
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

async function fetchMe(): Promise<User | null> {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: User | null };
  return data.user ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((u) => {
        if (!alive) return;
        setUser(u);
      })
      .finally(() => {
        if (alive) setInitializing(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setUser(await fetchMe());
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => undefined);
    setUser(null);
    if (location.pathname !== '/login') location.replace('/login');
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ user, initializing, logout, refresh }),
    [user, initializing, logout, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
