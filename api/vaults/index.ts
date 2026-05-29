import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, rid, type VaultRow } from '../_lib/db.js';
import { ensureSchema } from '../_lib/migrate.js';
import { requireUser } from '../_lib/auth.js';

const MAX_CIPHERTEXT_B64 = 64 * 1024; // ~48KB of plaintext after base64

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureSchema();
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const result = await db().execute({
        sql: `SELECT id, user_id, ciphertext, iv, created_at, unlock_at, opened_at, postponed, notify_days_before
              FROM vaults WHERE user_id = ? ORDER BY unlock_at ASC`,
        args: [user.id],
      });
      const rows = result.rows as unknown as VaultRow[];
      res.status(200).json(rows.map(serialize));
      return;
    }

    if (req.method === 'POST') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) ?? {};
      const ciphertext = typeof body.ciphertext === 'string' ? body.ciphertext : '';
      const iv = typeof body.iv === 'string' ? body.iv : '';
      const unlockAt = Number(body.unlock_at);
      const notifyDaysBefore = Number.isFinite(Number(body.notify_days_before))
        ? Math.max(0, Math.min(60, Math.floor(Number(body.notify_days_before))))
        : 7;

      if (!ciphertext || ciphertext.length > MAX_CIPHERTEXT_B64) {
        res.status(400).json({ error: 'ciphertext required, max 64KB base64' });
        return;
      }
      if (!iv || iv.length > 32) {
        res.status(400).json({ error: 'iv required' });
        return;
      }
      if (!Number.isFinite(unlockAt) || unlockAt <= Date.now()) {
        res.status(400).json({ error: 'unlock_at must be a future timestamp (ms)' });
        return;
      }

      const id = rid();
      const now = Date.now();
      await db().execute({
        sql: `INSERT INTO vaults (id, user_id, ciphertext, iv, created_at, unlock_at, opened_at, postponed, notify_days_before)
              VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?)`,
        args: [id, user.id, ciphertext, iv, now, unlockAt, notifyDaysBefore],
      });

      res.status(201).json({
        id,
        user_id: user.id,
        ciphertext,
        iv,
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
  } catch (err) {
    console.error('[api/vaults] failed', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      where: 'api/vaults',
    });
  }
}

function serialize(r: VaultRow) {
  return {
    id: r.id,
    user_id: r.user_id,
    ciphertext: r.ciphertext,
    iv: r.iv,
    created_at: Number(r.created_at),
    unlock_at: Number(r.unlock_at),
    opened_at: r.opened_at == null ? null : Number(r.opened_at),
    postponed: !!r.postponed,
    notify_days_before: Number(r.notify_days_before),
  };
}
