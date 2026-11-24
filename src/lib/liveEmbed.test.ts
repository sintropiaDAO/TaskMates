import { describe, it, expect } from 'vitest';
import { detectLiveProvider, getLiveEmbedUrl, getLiveStatus, isRoomOpen } from './liveEmbed';

describe('liveEmbed', () => {
  it('detects providers', () => {
    expect(detectLiveProvider('https://youtu.be/abcdefghijk')).toBe('youtube');
    expect(detectLiveProvider('https://www.twitch.tv/capy')).toBe('twitch');
    expect(detectLiveProvider('https://vimeo.com/123456')).toBe('vimeo');
    expect(detectLiveProvider('https://instagram.com/live')).toBe('other');
    expect(detectLiveProvider('javascript:alert(1)')).toBeNull();
  });
  it('builds embeds only for allow-listed providers', () => {
    expect(getLiveEmbedUrl('https://www.youtube.com/watch?v=abcdefghijk', 'taskmates.app')).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk');
    expect(getLiveEmbedUrl('https://www.youtube.com/live/abcdefghijk', 'x')).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk');
    expect(getLiveEmbedUrl('https://twitch.tv/capy', 'taskmates.app')).toBe('https://player.twitch.tv/?channel=capy&parent=taskmates.app&autoplay=false');
    expect(getLiveEmbedUrl('https://vimeo.com/123456', 'x')).toBe('https://player.vimeo.com/video/123456');
    expect(getLiveEmbedUrl('https://instagram.com/live', 'x')).toBeNull();
  });
  it('live status uses a 2h window from start', () => {
    const start = new Date('2026-01-01T10:00:00Z');
    expect(getLiveStatus(start, new Date('2026-01-01T09:59:00Z'))).toBe('scheduled');
    expect(getLiveStatus(start, new Date('2026-01-01T11:59:00Z'))).toBe('live');
    expect(getLiveStatus(start, new Date('2026-01-01T12:01:00Z'))).toBe('ended');
  });
  it('room opens 15 min before start', () => {
    const start = new Date('2026-01-01T10:00:00Z');
    expect(isRoomOpen(start, new Date('2026-01-01T09:44:00Z'))).toBe(false);
    expect(isRoomOpen(start, new Date('2026-01-01T09:46:00Z'))).toBe(true);
    expect(isRoomOpen(start, new Date('2026-01-01T12:01:00Z'))).toBe(false);
  });
});
