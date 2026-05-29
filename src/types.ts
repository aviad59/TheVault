export interface Vault {
  id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: number;
  unlock_at: number;
  opened_at: number | null;
  postponed: boolean;
  notify_days_before: number;
}

export type VaultStatus = 'locked' | 'ready' | 'postponed' | 'opened';

export function statusOf(v: Vault, now = Date.now()): VaultStatus {
  if (v.opened_at != null) return 'opened';
  if (now < v.unlock_at) return 'locked';
  if (v.postponed) return 'postponed';
  return 'ready';
}
