import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { VaultListPage } from './routes/VaultList';
import { NewVaultPage } from './routes/NewVault';
import { OpenVaultPage } from './routes/OpenVault';
import { LoginPage } from './routes/Login';
import { SignupPage } from './routes/Signup';
import { UnlockPage } from './routes/Unlock';
import { VaultMark } from './components/VaultMark';
import { AuthProvider, useAuth } from './lib/auth';
import type { ReactNode } from 'react';

export function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const location = useLocation();
  const { user, logout, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="app">
        <div className="muted center" style={{ padding: 80 }}>Approaching the hall…</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="row-between" style={{ padding: '20px 0 8px' }}>
        <Link to={user ? '/' : '/login'} className="brand" style={{ textDecoration: 'none', padding: 0 }}>
          <VaultMark className="brand-mark" />
          <span className="brand-name">The Vault</span>
        </Link>
        {user && (
          <button className="link-btn muted" type="button" onClick={() => logout()} title={user.email}>
            Sign out
          </button>
        )}
      </header>
      <span className="brand-rule" />

      <div key={location.pathname} className="fade-in">
        <Routes>
          <Route path="/login" element={<Public><LoginPage /></Public>} />
          <Route path="/signup" element={<Public><SignupPage /></Public>} />
          <Route path="/unlock" element={<RequireSession><UnlockPage /></RequireSession>} />
          <Route path="/" element={<RequireAuth><VaultListPage /></RequireAuth>} />
          <Route path="/new" element={<RequireAuth><NewVaultPage /></RequireAuth>} />
          <Route path="/v/:id" element={<RequireAuth><OpenVaultPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function Public({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireSession({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, key, needsUnlock } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (needsUnlock || !key) return <Navigate to="/unlock" replace />;
  return <>{children}</>;
}
