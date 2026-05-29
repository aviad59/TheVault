import type { Vault } from './lib/api';

export type { Vault };

export type VaultStatus = 'locked' | 'ready' | 'postponed' | 'opened';

export function statusOf(v: Vault, now = Date.now()): VaultStatus {
  if (v.opened_at != null) return 'opened';
  if (now < v.unlock_at) return 'locked';
  if (v.postponed) return 'postponed';
  return 'ready';
}
