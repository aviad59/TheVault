import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, rid, type VaultRow } from '../_lib/db.js';
import { ensureSchema } from '../_lib/migrate.js';
import { requireUser } from '../_lib/auth.js';
import { sealJSON, unsealJSON } from '../_lib/crypto.js';

const MAX_TITLE = 200;
const MAX_BODY = 20_000;

interface SerializedVault {
  id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: number;
  unlock_at: number;
  opened_at: number | null;
  postponed: boolean;
  notify_days_before: number;
  decryption_failed?: true;
}

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
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const message = typeof body.body === 'string' ? body.body.trim() : '';
      const unlockAt = Number(body.unlock_at);
      const notifyDaysBefore = Number.isFinite(Number(body.notify_days_before))
        ? Math.max(0, Math.min(60, Math.floor(Number(body.notify_days_before))))
        : 7;

      if (!title || title.length > MAX_TITLE) {
        res.status(400).json({ error: `title required, max ${MAX_TITLE} chars` });
        return;
      }
      if (!message || message.length > MAX_BODY) {
        res.status(400).json({ error: `body required, max ${MAX_BODY} chars` });
        return;
      }
      if (!Number.isFinite(unlockAt) || unlockAt <= Date.now()) {
        res.status(400).json({ error: 'unlock_at must be a future timestamp (ms)' });
        return;
      }

      const sealed = sealJSON({ title, body: message });
      const id = rid();
      const now = Date.now();

      await db().execute({
        sql: `INSERT INTO vaults (id, user_id, ciphertext, iv, created_at, unlock_at, opened_at, postponed, notify_days_before)
              VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?)`,
        args: [id, user.id, sealed.ciphertext, sealed.iv, now, unlockAt, notifyDaysBefore],
      });

      const out: SerializedVault = {
        id,
        user_id: user.id,
        title,
        body: message,
        created_at: now,
        unlock_at: unlockAt,
        opened_at: null,
        postponed: false,
        notify_days_before: notifyDaysBefore,
      };
      res.status(201).json(out);
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

function serialize(r: VaultRow): SerializedVault {
  const meta = {
    id: r.id,
    user_id: r.user_id,
    created_at: Number(r.created_at),
    unlock_at: Number(r.unlock_at),
    opened_at: r.opened_at == null ? null : Number(r.opened_at),
    postponed: !!r.postponed,
    notify_days_before: Number(r.notify_days_before),
  };
  try {
    const plain = unsealJSON<{ title: string; body: string }>({
      ciphertext: r.ciphertext,
      iv: r.iv,
    });
    return { ...meta, title: plain.title, body: plain.body };
  } catch {
    return { ...meta, title: '(unreadable)', body: '', decryption_failed: true };
  }
}
