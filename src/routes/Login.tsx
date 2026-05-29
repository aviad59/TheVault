import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="center" style={{ marginBottom: 24 }}>
        <div className="eyebrow">Welcome back</div>
        <h1 className="h1">Open the hall.</h1>
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
        <div className="form-field">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="notice warn">{error}</div>}

        <button type="submit" className="btn btn-gold btn-full" style={{ marginTop: 12 }} disabled={busy}>
          {busy ? 'Turning the key…' : 'Enter'}
        </button>

        <p className="muted center" style={{ marginTop: 18, fontSize: 13 }}>
          No account yet? <Link to="/signup">Forge a new one</Link>
        </p>
      </form>
    </div>
  );
}
