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

export interface VaultRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: number;
  unlock_at: number;
  opened_at: number | null;
  postponed: number;
  notify_days_before: number;
}
