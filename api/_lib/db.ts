import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;

export function db(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('TURSO_DATABASE_URL is not set');
  client = createClient({ url, authToken });
  return client;
}

export interface UserRow {
  id: string;
  google_sub: string;
  email: string;
  name: string | null;
  picture_url: string | null;
  created_at: number;
}

export interface SessionRow {
  token: string;
  user_id: string;
  created_at: number;
  expires_at: number;
}

export interface VaultRow {
  id: string;
  user_id: string;
  ciphertext: string;
  iv: string;
  created_at: number;
  unlock_at: number;
  opened_at: number | null;
  postponed: number;
  notify_days_before: number;
}

export function rid(byteLen = 16): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
