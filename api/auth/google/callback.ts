import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema } from '../../_lib/migrate.js';
import {
  COOKIE_NAMES,
  clearOauthStateCookie,
  parseCookies,
  setSessionCookie,
} from '../../_lib/cookies.js';
import { exchangeCodeForToken, fetchUserInfo, redirectUri } from '../../_lib/google.js';
import { createSession, SESSION_TTL_SEC, upsertGoogleUser } from '../../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({ error: 'method not allowed' });
      return;
    }

    await ensureSchema();

    const cookies = parseCookies(req);
    const expectedState = cookies[COOKIE_NAMES.oauthState];
    const givenState = String(req.query.state ?? '');
    const code = String(req.query.code ?? '');

    if (!expectedState || !givenState || expectedState !== givenState) {
      clearOauthStateCookie(res);
      res.status(400).json({ error: 'invalid OAuth state' });
      return;
    }
    if (!code) {
      clearOauthStateCookie(res);
      res.status(400).json({ error: 'missing code' });
      return;
    }
    if (req.query.error) {
      clearOauthStateCookie(res);
      res.status(400).json({ error: String(req.query.error) });
      return;
    }

    const tokenRes = await exchangeCodeForToken(code, redirectUri(req));
    const profile = await fetchUserInfo(tokenRes.access_token);
    const user = await upsertGoogleUser({
      sub: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });

    const session = await createSession(user.id);
    setSessionCookie(res, session.token, SESSION_TTL_SEC);
    clearOauthStateCookie(res);

    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, '/');
  } catch (err) {
    console.error('[api/auth/google/callback] failed', err);
    clearOauthStateCookie(res);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      where: 'api/auth/google/callback',
    });
  }
}
