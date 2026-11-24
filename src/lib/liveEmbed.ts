export type LiveProvider = 'youtube' | 'twitch' | 'vimeo' | 'other';
export type LiveStatus = 'scheduled' | 'live' | 'ended' | 'unscheduled';

export const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;
export const ROOM_OPEN_BEFORE_MS = 15 * 60 * 1000;

const PROVIDER_LABEL: Record<LiveProvider, string> = { youtube: 'YouTube', twitch: 'Twitch', vimeo: 'Vimeo', other: 'Link externo' };
export const providerLabel = (p: LiveProvider) => PROVIDER_LABEL[p];

function parse(url: string): URL | null {
  try { const u = new URL(url.trim()); return u.protocol === 'https:' || u.protocol === 'http:' ? u : null; } catch { return null; }
}

export function detectLiveProvider(url: string | null | undefined): LiveProvider | null {
  if (!url) return null;
  const u = parse(url);
  if (!u) return null;
  const h = u.hostname.replace(/^www\.|^m\./, '');
  if (h === 'youtube.com' || h === 'youtu.be' || h === 'youtube-nocookie.com') return 'youtube';
  if (h === 'twitch.tv') return 'twitch';
  if (h === 'vimeo.com' || h === 'player.vimeo.com') return 'vimeo';
  return 'other';
}

/** Returns an iframe src only for allow-listed providers; anything else opens externally. */
export function getLiveEmbedUrl(url: string | null | undefined, parentHost: string): string | null {
  const provider = detectLiveProvider(url);
  const u = url ? parse(url) : null;
  if (!u || !provider || provider === 'other') return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (provider === 'youtube') {
    let id: string | null = null;
    if (u.hostname.endsWith('youtu.be')) id = parts[0] ?? null;
    else if (parts[0] === 'watch') id = u.searchParams.get('v');
    else if (['live', 'embed', 'shorts'].includes(parts[0] ?? '')) id = parts[1] ?? null;
    else id = u.searchParams.get('v');
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (provider === 'twitch') {
    const parent = encodeURIComponent(parentHost);
    if (parts[0] === 'videos' && parts[1] && /^\d+$/.test(parts[1])) return `https://player.twitch.tv/?video=${parts[1]}&parent=${parent}&autoplay=false`;
    const ch = parts[0];
    return ch && /^\w{3,25}$/.test(ch) ? `https://player.twitch.tv/?channel=${ch}&parent=${parent}&autoplay=false` : null;
  }
  const vid = parts.find(p => /^\d+$/.test(p));
  return vid ? `https://player.vimeo.com/video/${vid}` : null;
}

export function getLiveStatus(start: string | Date | null | undefined, now: Date = new Date()): LiveStatus {
  if (!start) return 'unscheduled';
  const s = new Date(start).getTime();
  if (Number.isNaN(s)) return 'unscheduled';
  const n = now.getTime();
  if (n < s) return 'scheduled';
  if (n <= s + LIVE_WINDOW_MS) return 'live';
  return 'ended';
}

/** Room join is open from 15 min before the start until the live window ends; unscheduled rooms are always open. */
export function isRoomOpen(start: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!start) return true;
  const s = new Date(start).getTime();
  if (Number.isNaN(s)) return true;
  return now.getTime() >= s - ROOM_OPEN_BEFORE_MS && now.getTime() <= s + LIVE_WINDOW_MS;
}

export function newRoomName(): string {
  return `TaskMates-Roda-${crypto.randomUUID().replace(/-/g, '')}`;
}
