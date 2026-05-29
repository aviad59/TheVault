import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, type VaultRow } from '../_lib/db.js';
import { ensureSchema } from '../_lib/migrate.js';
import { requireUser } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureSchema();
    const user = await requireUser(req, res);
    if (!user) return;

    const id = String(req.query.id ?? '');
    if (!id) {
      res.status(400).json({ error: 'id required' });
      return;
    }

    if (req.method === 'GET') {
      const row = await fetchVault(id, user.id);
      if (!row) {
        res.status(404).json({ error: 'not found' });
        return;
      }
      res.status(200).json(serialize(row));
      return;
    }

    if (req.method === 'PATCH') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) ?? {};
      const action = String(body.action ?? '');
      const row = await fetchVault(id, user.id);
      if (!row) {
        res.status(404).json({ error: 'not found' });
        return;
      }

      if (action === 'open') {
        if (Date.now() < Number(row.unlock_at)) {
          res.status(403).json({ error: 'still locked' });
          return;
        }
        const now = Date.now();
        await db().execute({
          sql: `UPDATE vaults SET opened_at = ? WHERE id = ? AND user_id = ?`,
          args: [now, id, user.id],
        });
        res.status(200).json(serialize({ ...row, opened_at: now }));
        return;
      }

      if (action === 'postpone_indefinite') {
        await db().execute({
          sql: `UPDATE vaults SET postponed = 1 WHERE id = ? AND user_id = ?`,
          args: [id, user.id],
        });
        res.status(200).json(serialize({ ...row, postponed: 1 }));
        return;
      }

      res.status(400).json({ error: 'unknown action' });
      return;
    }

    if (req.method === 'DELETE') {
      await db().execute({
        sql: `DELETE FROM vaults WHERE id = ? AND user_id = ?`,
        args: [id, user.id],
      });
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('[api/vaults/:id] failed', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      where: 'api/vaults/:id',
    });
  }
}

async function fetchVault(id: string, userId: string): Promise<VaultRow | null> {
  const result = await db().execute({
    sql: `SELECT id, user_id, ciphertext, iv, created_at, unlock_at, opened_at, postponed, notify_days_before
          FROM vaults WHERE id = ? AND user_id = ? LIMIT 1`,
    args: [id, userId],
  });
  const rows = result.rows as unknown as VaultRow[];
  return rows[0] ?? null;
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
