import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, rid } from '../_lib/db.js';
import { ensureSchema } from '../_lib/migrate.js';
import { hashPassword } from '../_lib/passwords.js';
import {
  createSession,
  isValidEmail,
  isValidEncSalt,
  isValidPassword,
} from '../_lib/auth.js';

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
    const enc_salt = body.enc_salt;

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'invalid email' });
      return;
    }
    if (!isValidPassword(password)) {
      res.status(400).json({ error: 'password must be 8–256 characters' });
      return;
    }
    if (!isValidEncSalt(enc_salt)) {
      res.status(400).json({ error: 'invalid enc_salt' });
      return;
    }

    const existing = await db().execute({
      sql: `SELECT id FROM users WHERE email = ? LIMIT 1`,
      args: [email],
    });
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'email already in use' });
      return;
    }

    const id = rid();
    const pwd_hash = await hashPassword(password);
    const now = Date.now();

    await db().execute({
      sql: `INSERT INTO users (id, email, pwd_hash, enc_salt, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [id, email, pwd_hash, enc_salt, now],
    });

    const session = await createSession(id);
    res.status(201).json({
      session_token: session.token,
      expires_at: session.expires_at,
      user: { id, email, enc_salt, created_at: now },
    });
  } catch (err) {
    console.error('[api/auth/signup] failed', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      where: 'api/auth/signup',
    });
  }
}
