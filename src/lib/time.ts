const DAY = 24 * 60 * 60 * 1000;

export function formatAbsolute(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(ts: number, now = Date.now()): string {
  const diff = ts - now;
  const past = diff < 0;
  const abs = Math.abs(diff);

  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / (60 * 60_000));
  const days = Math.round(abs / DAY);

  let value: string;
  if (abs < 60_000) value = 'moments';
  else if (minutes < 60) value = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  else if (hours < 24) value = `${hours} hour${hours === 1 ? '' : 's'}`;
  else if (days < 60) value = `${days} day${days === 1 ? '' : 's'}`;
  else if (days < 365) value = `${Math.round(days / 30)} months`;
  else value = `${(days / 365).toFixed(1)} years`;

  return past ? `${value} ago` : `in ${value}`;
}

export function toDatetimeLocalValue(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(s: string): number {
  return new Date(s).getTime();
}
