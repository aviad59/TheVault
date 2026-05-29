import { randomBytes } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export function googleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');
  if (!clientSecret) throw new Error('GOOGLE_CLIENT_SECRET is not set');
  return { clientId, clientSecret };
}

/** Derive the OAuth redirect URI from the request, or APP_BASE_URL env if provided. */
export function redirectUri(req: VercelRequest): string {
  const override = process.env.APP_BASE_URL;
  if (override) {
    return new URL('/api/auth/google/callback', override).toString();
  }
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host;
  if (!host) throw new Error('cannot determine host for redirect_uri');
  return `${proto}://${host}/api/auth/google/callback`;
}

export function buildAuthUrl(state: string, redirect: string): string {
  const { clientId } = googleEnv();
  const u = new URL(AUTH_URL);
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirect);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'openid email profile');
  u.searchParams.set('state', state);
  u.searchParams.set('access_type', 'online');
  u.searchParams.set('prompt', 'select_account');
  return u.toString();
}

export function newState(): string {
  return randomBytes(16).toString('hex');
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForToken(code: string, redirect: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = googleEnv();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirect,
    grant_type: 'authorization_code',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as TokenResponse;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google userinfo failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as GoogleProfile;
  if (!data.sub || !data.email) {
    throw new Error('Google userinfo missing sub/email');
  }
  return data;
}
