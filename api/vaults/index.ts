import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, type VaultRow } from '../_lib/db.js';
import { ensureSchema } from '../_lib/migrate.js';
import { getUserId } from '../_lib/auth.js';

function rid(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();
  const userId = getUserId(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const result = await db().execute({
      sql: `SELECT id, user_id, title, body, created_at, unlock_at, opened_at, postponed, notify_days_before
            FROM vaults WHERE user_id = ? ORDER BY unlock_at ASC`,
      args: [userId],
    });
    const rows = result.rows as unknown as VaultRow[];
    res.status(200).json(rows.map(serialize));
    return;
  }

  if (req.method === 'POST') {
    const body = req.body ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.body === 'string' ? body.body.trim() : '';
    const unlockAt = Number(body.unlock_at);
    const notifyDaysBefore = Number.isFinite(Number(body.notify_days_before))
      ? Math.max(0, Math.min(60, Math.floor(Number(body.notify_days_before))))
      : 7;

    if (!title || title.length > 200) {
      res.status(400).json({ error: 'title required, max 200 chars' });
      return;
    }
    if (!message || message.length > 20000) {
      res.status(400).json({ error: 'body required, max 20000 chars' });
      return;
    }
    if (!Number.isFinite(unlockAt) || unlockAt <= Date.now()) {
      res.status(400).json({ error: 'unlock_at must be a future timestamp (ms)' });
      return;
    }

    const id = rid();
    const now = Date.now();
    await db().execute({
      sql: `INSERT INTO vaults (id, user_id, title, body, created_at, unlock_at, opened_at, postponed, notify_days_before)
            VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?)`,
      args: [id, userId, title, message, now, unlockAt, notifyDaysBefore],
    });

    res.status(201).json({
      id,
      user_id: userId,
      title,
      body: message,
      created_at: now,
      unlock_at: unlockAt,
      opened_at: null,
      postponed: false,
      notify_days_before: notifyDaysBefore,
    });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'method not allowed' });
}

function serialize(r: VaultRow) {
  return {
    id: r.id,
    user_id: r.user_id,
    title: r.title,
    body: r.body,
    created_at: Number(r.created_at),
    unlock_at: Number(r.unlock_at),
    opened_at: r.opened_at == null ? null : Number(r.opened_at),
    postponed: !!r.postponed,
    notify_days_before: Number(r.notify_days_before),
  };
}
