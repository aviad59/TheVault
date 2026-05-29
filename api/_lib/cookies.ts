import type { VercelRequest, VercelResponse } from '@vercel/node';

const SESSION_COOKIE = 'vault_session';
const STATE_COOKIE = 'vault_oauth_state';

export const COOKIE_NAMES = {
  session: SESSION_COOKIE,
  oauthState: STATE_COOKIE,
};

export function parseCookies(req: VercelRequest): Record<string, string> {
  const header = req.headers.cookie ?? '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!name) continue;
    out[name] = decodeURIComponent(value);
  }
  return out;
}

interface CookieOptions {
  maxAgeSec?: number;
  path?: string;
  httpOnly?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}

export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAgeSec !== undefined) parts.push(`Max-Age=${opts.maxAgeSec}`);
  parts.push(`Path=${opts.path ?? '/'}`);
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`);
  if (opts.secure !== false) parts.push('Secure');
  return parts.join('; ');
}

export function appendSetCookie(res: VercelResponse, cookie: string): void {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookie);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookie]);
  } else {
    res.setHeader('Set-Cookie', [String(existing), cookie]);
  }
}

export function setSessionCookie(res: VercelResponse, token: string, ttlSec: number): void {
  appendSetCookie(
    res,
    serializeCookie(SESSION_COOKIE, token, {
      maxAgeSec: ttlSec,
      httpOnly: true,
      sameSite: 'Lax',
      secure: true,
    }),
  );
}

export function clearSessionCookie(res: VercelResponse): void {
  appendSetCookie(
    res,
    serializeCookie(SESSION_COOKIE, '', {
      maxAgeSec: 0,
      httpOnly: true,
      sameSite: 'Lax',
      secure: true,
    }),
  );
}

export function setOauthStateCookie(res: VercelResponse, value: string): void {
  appendSetCookie(
    res,
    serializeCookie(STATE_COOKIE, value, {
      maxAgeSec: 10 * 60,
      httpOnly: true,
      sameSite: 'Lax',
      secure: true,
    }),
  );
}

export function clearOauthStateCookie(res: VercelResponse): void {
  appendSetCookie(
    res,
    serializeCookie(STATE_COOKIE, '', {
      maxAgeSec: 0,
      httpOnly: true,
      sameSite: 'Lax',
      secure: true,
    }),
  );
}
