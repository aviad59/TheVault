import { db } from './db.js';

let migrated = false;

export async function ensureSchema(): Promise<void> {
  if (migrated) return;
  const c = db();
  // Idempotent, non-destructive: this runs on every request (each API route
  // is its own serverless instance with separate module state, so a
  // drop/recreate here would wipe users between requests). For one-off
  // schema resets during early development, use `npm run db:push` instead.
  await c.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        google_sub TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT,
        picture_url TEXT,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
      `CREATE TABLE IF NOT EXISTS vaults (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        unlock_at INTEGER NOT NULL,
        opened_at INTEGER,
        postponed INTEGER NOT NULL DEFAULT 0,
        notify_days_before INTEGER NOT NULL DEFAULT 7
      )`,
      `CREATE INDEX IF NOT EXISTS idx_vaults_user_unlock ON vaults(user_id, unlock_at)`,
    ],
    'write',
  );
  migrated = true;
}
