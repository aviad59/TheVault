import 'dotenv/config';
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error('TURSO_DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const client = createClient({ url, authToken });

await client.batch(
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

console.log('Schema ready.');
process.exit(0);
