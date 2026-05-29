import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, rid, type SessionRow, type UserRow } from './db.js';
import { COOKIE_NAMES, parseCookies } from './cookies.js';

const DAY = 24 * 60 * 60 * 1000;
export const SESSION_TTL_MS = 30 * DAY;
export const SESSION_TTL_SEC = SESSION_TTL_MS / 1000;

export async function createSession(userId: string): Promise<{ token: string; expires_at: number }> {
  const token = rid(32);
  const now = Date.now();
  const expires_at = now + SESSION_TTL_MS;
  await db().execute({
    sql: `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    args: [token, userId, now, expires_at],
  });
  return { token, expires_at };
}

export async function deleteSession(token: string): Promise<void> {
  await db().execute({
    sql: `DELETE FROM sessions WHERE token = ?`,
    args: [token],
  });
}

export async function loadUserFromRequest(req: VercelRequest): Promise<UserRow | null> {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAMES.session];
  if (!token) return null;

  const sessionRes = await db().execute({
    sql: `SELECT token, user_id, created_at, expires_at FROM sessions WHERE token = ? LIMIT 1`,
    args: [token],
  });
  const session = (sessionRes.rows[0] as unknown as SessionRow | undefined) ?? null;
  if (!session) return null;
  if (Number(session.expires_at) < Date.now()) return null;

  const userRes = await db().execute({
    sql: `SELECT id, google_sub, email, name, picture_url, created_at FROM users WHERE id = ? LIMIT 1`,
    args: [session.user_id],
  });
  return (userRes.rows[0] as unknown as UserRow | undefined) ?? null;
}

export async function requireUser(
  req: VercelRequest,
  res: VercelResponse,
): Promise<UserRow | null> {
  const user = await loadUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'not authenticated' });
    return null;
  }
  return user;
}

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    picture_url: u.picture_url,
    created_at: Number(u.created_at),
  };
}

export async function upsertGoogleUser(profile: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<UserRow> {
  const c = db();
  const existing = await c.execute({
    sql: `SELECT id, google_sub, email, name, picture_url, created_at FROM users WHERE google_sub = ? LIMIT 1`,
    args: [profile.sub],
  });
  const row = existing.rows[0] as unknown as UserRow | undefined;
  if (row) {
    // refresh email/name/picture in case they changed
    await c.execute({
      sql: `UPDATE users SET email = ?, name = ?, picture_url = ? WHERE id = ?`,
      args: [profile.email, profile.name ?? null, profile.picture ?? null, row.id],
    });
    return {
      ...row,
      email: profile.email,
      name: profile.name ?? null,
      picture_url: profile.picture ?? null,
    };
  }

  const id = rid();
  const now = Date.now();
  await c.execute({
    sql: `INSERT INTO users (id, google_sub, email, name, picture_url, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, profile.sub, profile.email, profile.name ?? null, profile.picture ?? null, now],
  });
  return {
    id,
    google_sub: profile.sub,
    email: profile.email,
    name: profile.name ?? null,
    picture_url: profile.picture ?? null,
    created_at: now,
  };
}
