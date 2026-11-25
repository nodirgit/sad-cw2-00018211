export const uzs = (n: number) => `${Math.round(n).toLocaleString('en-US')} UZS`;

export const num = (n: number, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits });

export const dayMonth = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const time = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export function ago(d: Date, now = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return dayMonth(d);
}

/** yyyy-mm-dd in local time, for <input type="date">. */
export function toInputDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Reads "1 500 000" or "1,500,000" typed by a person. */
export function parseNumber(text: string): number {
  const clean = text.replace(/[\s,]/g, '');
  return clean === '' ? NaN : Number(clean);
}
