import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { VaultListPage } from './routes/VaultList';
import { NewVaultPage } from './routes/NewVault';
import { OpenVaultPage } from './routes/OpenVault';
import { VaultMark } from './components/VaultMark';

export function App() {
  const location = useLocation();
  return (
    <div className="app">
      <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
        <VaultMark className="brand-mark" />
        <span className="brand-name">The Vault</span>
      </Link>
      <span className="brand-rule" />
      <div key={location.pathname} className="fade-in">
        <Routes>
          <Route path="/" element={<VaultListPage />} />
          <Route path="/new" element={<NewVaultPage />} />
          <Route path="/v/:id" element={<OpenVaultPage />} />
        </Routes>
      </div>
    </div>
  );
}
