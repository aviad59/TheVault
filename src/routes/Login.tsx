import { VaultEmblem } from '../components/VaultEmblem';

export function LoginPage() {
  return (
    <div className="auth-wrap">
      <div className="center" style={{ marginBottom: 32 }}>
        <VaultEmblem className="vault-emblem" />
        <div className="eyebrow">Welcome</div>
        <h1 className="h1">A private hall, for you alone.</h1>
        <p className="muted" style={{ maxWidth: 460, margin: '12px auto 0' }}>
          Sign in to write to your future self.
        </p>
      </div>

      <div className="card center">
        <a className="btn btn-gold btn-full google-btn" href="/api/auth/google/start">
          <GoogleMark />
          Continue with Google
        </a>
        <p className="muted" style={{ marginTop: 18, fontSize: 12, lineHeight: 1.55 }}>
          By continuing you agree to let The Vault see your email, name, and
          profile picture — nothing more.
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        fill="#1a1300"
        d="M43.611 20.083H42V20H24v8h11.303C33.973 32.91 29.371 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c2.85 0 5.473.99 7.546 2.642l5.657-5.657C33.486 5.527 28.97 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20c11.045 0 20-8.954 20-20 0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
