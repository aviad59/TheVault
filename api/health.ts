import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/db.js';
import { ensureSchema } from './_lib/migrate.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, unknown> = {};
  checks.has_TURSO_DATABASE_URL = !!process.env.TURSO_DATABASE_URL;
  checks.has_TURSO_AUTH_TOKEN = !!process.env.TURSO_AUTH_TOKEN;
  checks.has_GOOGLE_CLIENT_ID = !!process.env.GOOGLE_CLIENT_ID;
  checks.has_GOOGLE_CLIENT_SECRET = !!process.env.GOOGLE_CLIENT_SECRET;
  checks.has_MASTER_KEY = !!process.env.MASTER_KEY;
  checks.master_key_bytes = process.env.MASTER_KEY
    ? Buffer.from(process.env.MASTER_KEY, 'base64').length
    : 0;
  checks.url_scheme = process.env.TURSO_DATABASE_URL?.split(':')[0] ?? null;

  try {
    await ensureSchema();
    const r = await db().execute('SELECT count(*) as n FROM vaults');
    checks.connect = 'ok';
    checks.count = Number(r.rows[0]?.n ?? -1);
    res.status(200).json({ status: 'ok', checks });
  } catch (err) {
    checks.connect = 'fail';
    res.status(500).json({
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
      checks,
    });
  }
}
