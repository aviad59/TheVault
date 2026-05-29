import type { Vault } from '../types';

const DAY = 24 * 60 * 60 * 1000;

export async function ensurePermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

interface ShowOptionsWithTrigger extends NotificationOptions {
  showTrigger?: unknown;
}

export function supportsScheduling(): boolean {
  return typeof window !== 'undefined' && 'TimestampTrigger' in window;
}

export async function scheduleForVault(vault: Vault): Promise<void> {
  if (Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;

  const reg = await navigator.serviceWorker.ready;
  if (!supportsScheduling()) return;

  const TimestampTriggerCtor = (window as unknown as {
    TimestampTrigger: new (ts: number) => unknown;
  }).TimestampTrigger;

  const now = Date.now();
  const reminderAt = vault.unlock_at - vault.notify_days_before * DAY;

  const tasks: Promise<unknown>[] = [];

  if (vault.notify_days_before > 0 && reminderAt > now) {
    tasks.push(
      reg.showNotification('A vault is approaching', {
        body: `"${vault.title}" opens in ${vault.notify_days_before} day${vault.notify_days_before === 1 ? '' : 's'}.`,
        tag: `vault-reminder-${vault.id}`,
        data: { vaultId: vault.id, kind: 'reminder' },
        showTrigger: new TimestampTriggerCtor(reminderAt),
      } as ShowOptionsWithTrigger),
    );
  }

  if (vault.unlock_at > now) {
    tasks.push(
      reg.showNotification('The vault is ready to open', {
        body: `"${vault.title}" is now available.`,
        tag: `vault-open-${vault.id}`,
        data: { vaultId: vault.id, kind: 'open' },
        showTrigger: new TimestampTriggerCtor(vault.unlock_at),
      } as ShowOptionsWithTrigger),
    );
  }

  await Promise.all(tasks);
}

export async function cancelForVault(vaultId: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const notes = await reg.getNotifications({
    tag: `vault-open-${vaultId}`,
    includeTriggered: true,
  } as GetNotificationOptions & { includeTriggered: boolean });
  notes.forEach((n) => n.close());
  const reminders = await reg.getNotifications({
    tag: `vault-reminder-${vaultId}`,
    includeTriggered: true,
  } as GetNotificationOptions & { includeTriggered: boolean });
  reminders.forEach((n) => n.close());
}

/** Best-effort fallback: when the app opens, show a notification for anything that became ready while we were away. */
export async function fireDuePendingNotifications(vaults: Vault[]): Promise<void> {
  if (Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;

  const reg = await navigator.serviceWorker.ready;
  const now = Date.now();
  const seenKey = 'vault.notified';
  const seen = new Set<string>(JSON.parse(localStorage.getItem(seenKey) ?? '[]') as string[]);

  for (const v of vaults) {
    if (v.opened_at != null) continue;
    if (v.unlock_at > now) continue;
    if (seen.has(v.id)) continue;
    await reg.showNotification('The vault is ready to open', {
      body: `"${v.title}" is now available.`,
      tag: `vault-open-${v.id}`,
      data: { vaultId: v.id, kind: 'open' },
    });
    seen.add(v.id);
  }

  localStorage.setItem(seenKey, JSON.stringify([...seen]));
}
