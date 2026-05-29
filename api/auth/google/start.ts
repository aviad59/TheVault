import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema } from '../../_lib/migrate.js';
import { setOauthStateCookie } from '../../_lib/cookies.js';
import { buildAuthUrl, newState, redirectUri } from '../../_lib/google.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({ error: 'method not allowed' });
      return;
    }

    await ensureSchema();

    const state = newState();
    setOauthStateCookie(res, state);

    const url = buildAuthUrl(state, redirectUri(req));
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, url);
  } catch (err) {
    console.error('[api/auth/google/start] failed', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      where: 'api/auth/google/start',
    });
  }
}
