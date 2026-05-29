import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema } from '../_lib/migrate.js';
import { loadUserFromRequest, publicUser } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({ error: 'method not allowed' });
      return;
    }

    await ensureSchema();
    const user = await loadUserFromRequest(req);
    if (!user) {
      res.status(401).json({ user: null });
      return;
    }
    res.status(200).json({ user: publicUser(user) });
  } catch (err) {
    console.error('[api/auth/me] failed', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      where: 'api/auth/me',
    });
  }
}
