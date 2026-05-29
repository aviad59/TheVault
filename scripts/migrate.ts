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
    // Destructive: this is early development. Wipes users and vaults so the
    // schema lines up with the current Google-OAuth + server-encryption model.
    `DROP TABLE IF EXISTS users`,
    `DROP TABLE IF EXISTS vaults`,
    `CREATE TABLE users (
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
    `CREATE TABLE vaults (
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

console.log('Schema ready (Google-OAuth users + sessions + server-encrypted vaults).');
console.log('Existing user and vault rows were dropped.');
process.exit(0);
