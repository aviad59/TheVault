import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Choose at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (!acknowledged) return setError('Please acknowledge the recovery notice.');
    setBusy(true);
    try {
      await signup(email.trim().toLowerCase(), password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-up failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="center" style={{ marginBottom: 24 }}>
        <div className="eyebrow">Create your vault</div>
        <h1 className="h1">A private hall, for you alone.</h1>
        <p className="muted" style={{ maxWidth: 460, margin: '12px auto 0' }}>
          Your messages are sealed with a key that only your password can summon.
          Even we cannot read them.
        </p>
      </div>

      <form onSubmit={submit} className="card">
        <div className="form-field">
          <label className="form-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="confirm">Confirm</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>
        </div>

        <div className="notice warn" style={{ marginTop: 4 }}>
          <div className="eyebrow" style={{ color: 'var(--gold-1)' }}>Heed this</div>
          <p style={{ margin: '8px 0 12px', fontSize: 14, lineHeight: 1.55 }}>
            Your password is the only key. If you forget it, your vaults remain sealed forever —
            we have no way to recover them. There is no reset.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span style={{ fontSize: 13 }}>I understand. I will remember my password.</span>
          </label>
        </div>

        {error && <div className="notice warn" style={{ marginTop: 8 }}>{error}</div>}

        <button type="submit" className="btn btn-gold btn-full" style={{ marginTop: 20 }} disabled={busy}>
          {busy ? 'Forging the key…' : 'Create my vault'}
        </button>

        <p className="muted center" style={{ marginTop: 18, fontSize: 13 }}>
          Already have an account? <Link to="/login">Enter the hall</Link>
        </p>
      </form>
    </div>
  );
}
