import { db } from './db.js';

let migrated = false;

export async function ensureSchema(): Promise<void> {
  if (migrated) return;
  const c = db();
  await c.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        pwd_hash TEXT NOT NULL,
        enc_salt TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
      // Drop legacy plaintext table if present (early-development hard reset).
      `DROP TABLE IF EXISTS vaults`,
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
