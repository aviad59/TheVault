import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { type Vault, statusOf } from '../types';
import { formatRelative, formatAbsolute } from '../lib/time';
import { ensurePermission, fireDuePendingNotifications } from '../lib/notifications';

const STATUS_LABEL: Record<string, string> = {
  locked: 'Sealed',
  ready: 'Awaiting you',
  postponed: 'Held back',
  opened: 'Opened',
};

export function VaultListPage() {
  const [vaults, setVaults] = useState<Vault[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    api
      .list()
      .then((list) => {
        if (!alive) return;
        setVaults(list);
        fireDuePendingNotifications(list).catch(() => undefined);
      })
      .catch((e) => alive && setError(String(e.message ?? e)));

    if ('Notification' in window && Notification.permission === 'default') {
      setNeedsPermission(true);
    }
    return () => {
      alive = false;
    };
  }, []);

  const requestPermission = async () => {
    const result = await ensurePermission();
    if (result !== 'default') setNeedsPermission(false);
  };

  if (error) {
    return (
      <div className="notice warn">
        <strong>Could not load vaults.</strong>
        <div className="muted" style={{ marginTop: 6 }}>{error}</div>
      </div>
    );
  }

  if (vaults === null) {
    return <div className="muted center" style={{ padding: 48 }}>Opening the gallery…</div>;
  }

  return (
    <>
      {needsPermission && (
        <div className="notice warn">
          <div className="row-between">
            <div>
              <div className="eyebrow">Notifications</div>
              <div style={{ marginTop: 4 }}>
                Permit notifications so your vaults can summon you when their hour arrives.
              </div>
            </div>
            <button className="btn btn-ghost" onClick={requestPermission}>Allow</button>
          </div>
        </div>
      )}

      {vaults.length === 0 ? (
        <div className="empty">
          <div className="eyebrow">No vaults yet</div>
          <h2 className="h2" style={{ marginTop: 12 }}>Entrust a question to your future self.</h2>
          <p className="muted" style={{ maxWidth: 360, margin: '14px auto 24px' }}>
            Whatever weighs on you today — write it down, seal it, and let time deliver the answer.
          </p>
          <button className="btn btn-gold" onClick={() => navigate('/new')}>
            Create the first vault
          </button>
        </div>
      ) : (
        <div className="list">
          {vaults.map((v) => (
            <Link key={v.id} to={`/v/${v.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <VaultRow vault={v} />
            </Link>
          ))}
        </div>
      )}

      <button
        className="fab"
        aria-label="New vault"
        onClick={() => navigate('/new')}
      >
        +
      </button>
    </>
  );
}

function VaultRow({ vault }: { vault: Vault }) {
  const status = statusOf(vault);
  const subtitle =
    status === 'opened'
      ? `Opened ${formatRelative(vault.opened_at!)}`
      : status === 'ready'
        ? 'Ready since ' + formatRelative(vault.unlock_at)
        : status === 'postponed'
          ? 'Held back — open whenever you are ready'
          : `Opens ${formatRelative(vault.unlock_at)} · ${formatAbsolute(vault.unlock_at)}`;

  return (
    <article className="card">
      <div className="card-row">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">{STATUS_LABEL[status]}</div>
          <h3 className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vault.title}
          </h3>
          <div className="muted" style={{ marginTop: 8 }}>{subtitle}</div>
        </div>
        <span className={`vault-status ${status}`}>
          <span className="dot" />
          {status === 'ready' ? 'Ready' : status === 'locked' ? 'Sealed' : status === 'opened' ? 'Opened' : 'Held'}
        </span>
      </div>
    </article>
  );
}
