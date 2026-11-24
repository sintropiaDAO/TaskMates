/** Pure windows for live reminders, run by a 5-minute schedule. */
export const SOON_AHEAD_MS = 16 * 60 * 1000;
export const STARTED_GRACE_MS = 10 * 60 * 1000;

export type ReminderKind = 'live_soon' | 'live_started';

export function reminderKindFor(start: string | Date, now: Date = new Date()): ReminderKind | null {
  const s = new Date(start).getTime();
  const n = now.getTime();
  if (Number.isNaN(s)) return null;
  if (s > n && s <= n + SOON_AHEAD_MS) return 'live_soon';
  if (s <= n && s > n - STARTED_GRACE_MS) return 'live_started';
  return null;
}

export function reminderMessage(kind: ReminderKind, title: string, pt: boolean): string {
  if (kind === 'live_soon') return pt ? `🌿 "${title}" começa em 15 minutos!` : `🌿 "${title}" starts in 15 minutes!`;
  return pt ? `🔴 "${title}" está ao vivo agora!` : `🔴 "${title}" is live now!`;
}
