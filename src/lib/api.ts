import { getToken } from './auth';

export interface VaultRecord {
  id: string;
  user_id: string;
  ciphertext: string;
  iv: string;
  created_at: number;
  unlock_at: number;
  opened_at: number | null;
  postponed: boolean;
  notify_days_before: number;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    // Session is gone — wipe and bounce to login.
    localStorage.removeItem('vault.session_token');
    localStorage.removeItem('vault.user');
    sessionStorage.removeItem('vault.mk');
    if (location.pathname !== '/login' && location.pathname !== '/signup') {
      location.replace('/login');
    }
    throw new Error('not authenticated');
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json()).error ?? '';
    } catch {
      // ignore
    }
    throw new Error(detail || `request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  list(): Promise<VaultRecord[]> {
    return req<VaultRecord[]>('/api/vaults');
  },
  get(id: string): Promise<VaultRecord> {
    return req<VaultRecord>(`/api/vaults/${encodeURIComponent(id)}`);
  },
  create(input: {
    ciphertext: string;
    iv: string;
    unlock_at: number;
    notify_days_before: number;
  }): Promise<VaultRecord> {
    return req<VaultRecord>('/api/vaults', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  open(id: string): Promise<VaultRecord> {
    return req<VaultRecord>(`/api/vaults/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'open' }),
    });
  },
  postpone(id: string): Promise<VaultRecord> {
    return req<VaultRecord>(`/api/vaults/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'postpone_indefinite' }),
    });
  },
  remove(id: string): Promise<void> {
    return req<void>(`/api/vaults/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
