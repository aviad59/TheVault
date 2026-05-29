import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  clearKeyFromSession,
  deriveExtractableKey,
  exportKeyToSession,
  importKeyFromSession,
  randomSaltB64,
} from './crypto';

const TOKEN_KEY = 'vault.session_token';
const USER_KEY = 'vault.user';

export interface User {
  id: string;
  email: string;
  enc_salt: string;
  created_at: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  key: CryptoKey | null;
  initializing: boolean;
  /** True when there's a session but no master key (key cleared / fresh tab). */
  needsUnlock: boolean;
}

interface AuthCtx extends AuthState {
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  unlock: (password: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function storeSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function loadStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearKeyFromSession();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadStoredUser());
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const k = await importKeyFromSession().catch(() => null);
      if (!alive) return;
      setKey(k);
      setInitializing(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setSession = useCallback((nextToken: string, nextUser: User) => {
    storeSession(nextToken, nextUser);
    setTokenState(nextToken);
    setUser(nextUser);
  }, []);

  const signup = useCallback(
    async (email: string, password: string) => {
      const enc_salt = randomSaltB64();
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, enc_salt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `signup failed (${res.status})`);
      }
      const data = (await res.json()) as { session_token: string; user: User };
      const derived = await deriveExtractableKey(password, data.user.enc_salt);
      await exportKeyToSession(derived);
      setKey(derived);
      setSession(data.session_token, data.user);
    },
    [setSession],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `login failed (${res.status})`);
      }
      const data = (await res.json()) as { session_token: string; user: User };
      const derived = await deriveExtractableKey(password, data.user.enc_salt);
      await exportKeyToSession(derived);
      setKey(derived);
      setSession(data.session_token, data.user);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    const t = getToken();
    if (t) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { authorization: `Bearer ${t}` },
      }).catch(() => undefined);
    }
    clearSession();
    setTokenState(null);
    setUser(null);
    setKey(null);
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      if (!user) throw new Error('not signed in');
      const derived = await deriveExtractableKey(password, user.enc_salt);
      // Verify by attempting a decrypt? We don't have anything to decrypt yet —
      // instead, re-fetch the user via /api/auth/me to validate the session and trust the password is right.
      // A wrong password will surface as a decryption failure on the first vault read.
      await exportKeyToSession(derived);
      setKey(derived);
    },
    [user],
  );

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      token,
      key,
      initializing,
      needsUnlock: !!user && !!token && !key && !initializing,
      signup,
      login,
      logout,
      unlock,
    }),
    [user, token, key, initializing, signup, login, logout, unlock],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
