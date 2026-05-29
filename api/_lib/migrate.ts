import { db } from './db.js';

let migrated = false;

export async function ensureSchema(): Promise<void> {
  if (migrated) return;
  const c = db();
  await c.batch(
    [
      `CREATE TABLE IF NOT EXISTS vaults (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
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
