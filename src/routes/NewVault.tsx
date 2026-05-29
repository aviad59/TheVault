import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../lib/time';
import { ensurePermission, scheduleForVault, supportsScheduling } from '../lib/notifications';
import { encryptJSON } from '../lib/crypto';
import { useAuth } from '../lib/auth';

const DAY = 24 * 60 * 60 * 1000;

export function NewVaultPage() {
  const navigate = useNavigate();
  const { key } = useAuth();
  const defaultDate = useMemo(() => toDatetimeLocalValue(Date.now() + 60 * DAY), []);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [when, setWhen] = useState(defaultDate);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlockAt = fromDatetimeLocalValue(when);
  const isFuture = Number.isFinite(unlockAt) && unlockAt > Date.now() + 60_000;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('A vault needs a name.');
    if (!body.trim()) return setError('Write something to entrust.');
    if (!isFuture) return setError('Choose a moment at least a minute from now.');
    if (!key) return setError('Your encryption key is not available. Try signing in again.');

    setBusy(true);
    try {
      await ensurePermission();
      const payload = await encryptJSON(key, { title: title.trim(), body: body.trim() });
      const record = await api.create({
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        unlock_at: unlockAt,
        notify_days_before: days,
      });
      try {
        await scheduleForVault({
          ...record,
          title: title.trim(),
          body: body.trim(),
        });
      } catch {
        // best effort — silent
      }
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to seal the vault.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="back-link" onClick={() => navigate('/')}>← Back</button>

      <div className="center" style={{ marginBottom: 28 }}>
        <div className="eyebrow">A new vault</div>
        <h1 className="h1">Write to your future self.</h1>
        <p className="muted" style={{ maxWidth: 460, margin: '12px auto 0' }}>
          Whatever you write here will be sealed the moment you save it.
          Choose a date — and let time do the rest.
        </p>
      </div>

      <form onSubmit={submit} className="card">
        <div className="form-field">
          <label className="form-label" htmlFor="title">Name of the vault</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. My first weeks at the new job"
            maxLength={200}
            autoFocus
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="body">Your message</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="The worry, the question, the hope. Write it plainly. Your future self will know what to do with it."
            maxLength={20000}
          />
          <div className="form-help">Sealed and encrypted at save — even we cannot read it.</div>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="when">Open at</label>
            <input
              id="when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="days">Remind me, days before</label>
            <input
              id="days"
              type="number"
              min={0}
              max={60}
              value={days}
              onChange={(e) => setDays(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
            />
          </div>
        </div>

        {!supportsScheduling() && (
          <div className="notice" style={{ marginTop: 8 }}>
            Your browser cannot schedule notifications while closed. The Vault will still notify you on next open.
          </div>
        )}

        {error && (
          <div className="notice warn" style={{ marginTop: 8 }}>{error}</div>
        )}

        <div className="btn-row" style={{ marginTop: 20 }}>
          <button type="submit" className="btn btn-gold btn-full" disabled={busy}>
            {busy ? 'Sealing…' : 'Seal the vault'}
          </button>
        </div>
      </form>
    </>
  );
}
