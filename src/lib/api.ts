export interface Vault {
  id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: number;
  unlock_at: number;
  opened_at: number | null;
  postponed: boolean;
  notify_days_before: number;
  decryption_failed?: true;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const res = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  if (res.status === 401) {
    if (location.pathname !== '/login') {
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
  list(): Promise<Vault[]> {
    return req<Vault[]>('/api/vaults');
  },
  get(id: string): Promise<Vault> {
    return req<Vault>(`/api/vaults/${encodeURIComponent(id)}`);
  },
  create(input: {
    title: string;
    body: string;
    unlock_at: number;
    notify_days_before: number;
  }): Promise<Vault> {
    return req<Vault>('/api/vaults', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  open(id: string): Promise<Vault> {
    return req<Vault>(`/api/vaults/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'open' }),
    });
  },
  postpone(id: string): Promise<Vault> {
    return req<Vault>(`/api/vaults/${encodeURIComponent(id)}`, {
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
