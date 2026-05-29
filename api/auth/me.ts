import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema } from '../_lib/migrate.js';
import { requireUser } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({ error: 'method not allowed' });
      return;
    }

    await ensureSchema();
    const user = await requireUser(req, res);
    if (!user) return;

    res.status(200).json({
      id: user.id,
      email: user.email,
      enc_salt: user.enc_salt,
      created_at: Number(user.created_at),
    });
  } catch (err) {
    console.error('[api/auth/me] failed', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      where: 'api/auth/me',
    });
  }
}
