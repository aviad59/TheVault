import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, type UserRow } from '../_lib/db.js';
import { ensureSchema } from '../_lib/migrate.js';
import { verifyPassword } from '../_lib/passwords.js';
import { createSession, isValidEmail, isValidPassword } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'method not allowed' });
      return;
    }

    await ensureSchema();

    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) ?? {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;

    if (!isValidEmail(email) || !isValidPassword(password)) {
      res.status(400).json({ error: 'invalid credentials' });
      return;
    }

    const result = await db().execute({
      sql: `SELECT id, email, pwd_hash, enc_salt, created_at FROM users WHERE email = ? LIMIT 1`,
      args: [email],
    });
    const user = result.rows[0] as unknown as UserRow | undefined;
    if (!user) {
      res.status(401).json({ error: 'invalid credentials' });
      return;
    }

    const ok = await verifyPassword(password, user.pwd_hash);
    if (!ok) {
      res.status(401).json({ error: 'invalid credentials' });
      return;
    }

    const session = await createSession(user.id);
    res.status(200).json({
      session_token: session.token,
      expires_at: session.expires_at,
      user: {
        id: user.id,
        email: user.email,
        enc_salt: user.enc_salt,
        created_at: Number(user.created_at),
      },
    });
  } catch (err) {
    console.error('[api/auth/login] failed', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      where: 'api/auth/login',
    });
  }
}
