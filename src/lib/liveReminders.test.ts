import { describe, it, expect } from 'vitest';
import { reminderKindFor } from './liveReminders';

describe('reminderKindFor', () => {
  const now = new Date('2026-01-01T10:00:00Z');
  it('warns 15 minutes before', () => expect(reminderKindFor('2026-01-01T10:15:00Z', now)).toBe('live_soon'));
  it('announces start', () => expect(reminderKindFor('2026-01-01T09:58:00Z', now)).toBe('live_started'));
  it('ignores far future and old lives', () => {
    expect(reminderKindFor('2026-01-01T10:30:00Z', now)).toBeNull();
    expect(reminderKindFor('2026-01-01T09:30:00Z', now)).toBeNull();
  });
});
