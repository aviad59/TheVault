import type { VaultRecord } from './lib/api';

/** A vault decrypted on the client. The plaintext title/body never live on the server. */
export interface Vault extends VaultRecord {
  title: string;
  body: string;
  /** True if decryption failed (wrong key / corrupted record). title/body will be empty. */
  decryption_failed?: boolean;
}

export type VaultStatus = 'locked' | 'ready' | 'postponed' | 'opened';

export function statusOf(v: VaultRecord, now = Date.now()): VaultStatus {
  if (v.opened_at != null) return 'opened';
  if (now < v.unlock_at) return 'locked';
  if (v.postponed) return 'postponed';
  return 'ready';
}
