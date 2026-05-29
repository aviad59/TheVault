import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema } from '../_lib/migrate.js';
import { deleteSession } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'method not allowed' });
      return;
    }

    await ensureSchema();

    const auth = req.headers.authorization ?? '';
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    if (m) {
      await deleteSession(m[1].trim());
    }
    res.status(204).end();
  } catch (err) {
    console.error('[api/auth/logout] failed', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      where: 'api/auth/logout',
    });
  }
}
