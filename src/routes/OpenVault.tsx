import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { type Vault, statusOf } from '../types';
import { formatAbsolute, formatRelative } from '../lib/time';
import { VaultEmblem } from '../components/VaultEmblem';
import { cancelForVault } from '../lib/notifications';

type Stage = 'loading' | 'sealed' | 'gate' | 'revealed' | 'postponed' | 'error';

export function OpenVaultPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [vault, setVault] = useState<Vault | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get(id)
      .then((v) => {
        if (!alive) return;
        setVault(v);
        const s = statusOf(v);
        if (s === 'locked') setStage('sealed');
        else if (s === 'opened') setStage('revealed');
        else if (s === 'postponed') setStage('postponed');
        else setStage('gate');
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message ?? String(e));
        setStage('error');
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (stage === 'loading') {
    return <div className="muted center" style={{ padding: 48 }}>Approaching the vault…</div>;
  }

  if (stage === 'error' || !vault) {
    return (
      <>
        <button className="back-link" onClick={() => navigate('/')}>← Back</button>
        <div className="notice warn">
          {error ?? 'This vault could not be found.'}
        </div>
      </>
    );
  }

  return (
    <>
      <button className="back-link" onClick={() => navigate('/')}>← Back</button>
      {stage === 'sealed' && <SealedView vault={vault} onDelete={() => navigate('/')} />}
      {stage === 'gate' && (
        <GateView
          vault={vault}
          onConfirm={async () => {
            const opened = await api.open(vault.id);
            await cancelForVault(vault.id);
            setVault(opened);
            setStage('revealed');
          }}
          onPostpone={async () => {
            const postponed = await api.postpone(vault.id);
            setVault(postponed);
            setStage('postponed');
          }}
        />
      )}
      {stage === 'postponed' && (
        <PostponedView
          vault={vault}
          onResume={() => setStage('gate')}
          onDelete={async () => {
            await api.remove(vault.id);
            await cancelForVault(vault.id);
            navigate('/');
          }}
        />
      )}
      {stage === 'revealed' && <RevealedView vault={vault} />}
    </>
  );
}

function SealedView({ vault, onDelete }: { vault: Vault; onDelete: () => void }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <div className="vault-stage">
      <VaultEmblem className="vault-emblem" />
      <div className="eyebrow">Sealed</div>
      <h1 className="h1">{vault.title}</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Opens {formatRelative(vault.unlock_at)} · {formatAbsolute(vault.unlock_at)}
      </p>
      <div className="divider" />
      <p className="muted" style={{ maxWidth: 420 }}>
        The contents are not yours to read yet. Step away — your future self will receive them at the appointed hour.
      </p>

      {!confirmingDelete ? (
        <button className="btn btn-ghost" style={{ marginTop: 28 }} onClick={() => setConfirmingDelete(true)}>
          Discard this vault
        </button>
      ) : (
        <div className="btn-row" style={{ marginTop: 28 }}>
          <button className="btn btn-ghost" onClick={() => setConfirmingDelete(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={onDelete}>Permanently discard</button>
        </div>
      )}
    </div>
  );
}

function GateView({
  vault,
  onConfirm,
  onPostpone,
}: {
  vault: Vault;
  onConfirm: () => Promise<void>;
  onPostpone: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<'open' | 'hold' | null>(null);

  const handle = async (kind: 'open' | 'hold', fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="vault-stage">
      <VaultEmblem open className="vault-emblem" />
      <div className="eyebrow">The hour has arrived</div>
      <h1 className="h1">{vault.title}</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Sealed {formatRelative(vault.created_at)}
      </p>
      <div className="divider" />
      <p style={{ fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.6, maxWidth: 480 }}>
        Before you open this vault — are you the person it was written for?
        <br />
        If today truly meets the moment you imagined, step inside.
        If not, leave it sealed a while longer.
      </p>

      <div className="btn-row" style={{ marginTop: 32, justifyContent: 'center' }}>
        <button
          className="btn btn-ghost"
          onClick={() => handle('hold', onPostpone)}
          disabled={busy !== null}
        >
          {busy === 'hold' ? 'Holding…' : 'Hold it closed'}
        </button>
        <button
          className="btn btn-gold"
          onClick={() => handle('open', onConfirm)}
          disabled={busy !== null}
        >
          {busy === 'open' ? 'Opening…' : 'Open the vault'}
        </button>
      </div>
    </div>
  );
}

function PostponedView({
  vault,
  onResume,
  onDelete,
}: {
  vault: Vault;
  onResume: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <div className="vault-stage">
      <VaultEmblem className="vault-emblem" />
      <div className="eyebrow">Held back</div>
      <h1 className="h1">{vault.title}</h1>
      <p className="muted" style={{ marginTop: 8, maxWidth: 460 }}>
        You chose to keep this one closed. It will wait for you, quietly, until you are ready.
      </p>
      <div className="divider" />
      <div className="btn-row" style={{ marginTop: 12, justifyContent: 'center' }}>
        <button className="btn btn-gold" onClick={onResume}>Open it now</button>
        {!confirmingDelete ? (
          <button className="btn btn-ghost" onClick={() => setConfirmingDelete(true)}>Discard</button>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmingDelete(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={onDelete}>Permanently discard</button>
          </>
        )}
      </div>
    </div>
  );
}

function RevealedView({ vault }: { vault: Vault }) {
  return (
    <div className="vault-stage reveal-in">
      <VaultEmblem open className="vault-emblem" />
      <div className="eyebrow">From your past self</div>
      <h1 className="h1">{vault.title}</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Written {formatAbsolute(vault.created_at)}
      </p>
      <div className="divider" />
      <div className="vault-reveal">{vault.body}</div>
      <div className="divider" />
      <p className="muted">
        Opened {formatRelative(vault.opened_at ?? Date.now())}.
      </p>
    </div>
  );
}
