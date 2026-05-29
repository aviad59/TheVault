import { useState } from 'react';
import { useAuth } from '../lib/auth';

export function UnlockPage() {
  const { user, unlock, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await unlock(password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unlock failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="center" style={{ marginBottom: 24 }}>
        <div className="eyebrow">Sealed for the moment</div>
        <h1 className="h1">Confirm your key.</h1>
        <p className="muted" style={{ maxWidth: 460, margin: '12px auto 0' }}>
          Signed in as <strong style={{ color: 'var(--ink)' }}>{user?.email}</strong>.
          Re-enter your password to unseal your vaults for this session.
        </p>
      </div>

      <form onSubmit={submit} className="card">
        <div className="form-field">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        </div>

        {error && <div className="notice warn">{error}</div>}

        <button type="submit" className="btn btn-gold btn-full" style={{ marginTop: 12 }} disabled={busy}>
          {busy ? 'Turning the key…' : 'Unseal'}
        </button>

        <p className="muted center" style={{ marginTop: 18, fontSize: 13 }}>
          Not you? <button className="link-btn" type="button" onClick={() => logout()}>Sign out</button>
        </p>
      </form>
    </div>
  );
}
