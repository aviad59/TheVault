import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, rid, type SessionRow, type UserRow } from './db.js';

const DAY = 24 * 60 * 60 * 1000;
const SESSION_TTL = 30 * DAY;

export async function createSession(userId: string): Promise<{ token: string; expires_at: number }> {
  const token = rid(32);
  const now = Date.now();
  const expires_at = now + SESSION_TTL;
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

export async function requireUser(
  req: VercelRequest,
  res: VercelResponse,
): Promise<UserRow | null> {
  const auth = req.headers.authorization ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) {
    res.status(401).json({ error: 'missing Authorization: Bearer header' });
    return null;
  }
  const token = m[1].trim();

  const sessionRes = await db().execute({
    sql: `SELECT token, user_id, created_at, expires_at FROM sessions WHERE token = ? LIMIT 1`,
    args: [token],
  });
  const session = (sessionRes.rows[0] as unknown as SessionRow | undefined) ?? null;
  if (!session) {
    res.status(401).json({ error: 'invalid session' });
    return null;
  }
  if (Number(session.expires_at) < Date.now()) {
    res.status(401).json({ error: 'session expired' });
    return null;
  }

  const userRes = await db().execute({
    sql: `SELECT id, email, pwd_hash, enc_salt, created_at FROM users WHERE id = ? LIMIT 1`,
    args: [session.user_id],
  });
  const user = (userRes.rows[0] as unknown as UserRow | undefined) ?? null;
  if (!user) {
    res.status(401).json({ error: 'user not found' });
    return null;
  }
  return user;
}

export function isValidEmail(s: unknown): s is string {
  return typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function isValidPassword(s: unknown): s is string {
  return typeof s === 'string' && s.length >= 8 && s.length <= 256;
}

export function isValidEncSalt(s: unknown): s is string {
  // base64 of 16 bytes ≈ 24 chars; allow up to 64 for safety
  return typeof s === 'string' && s.length >= 16 && s.length <= 64;
}
