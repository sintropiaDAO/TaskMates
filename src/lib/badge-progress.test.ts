import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/sync-user-badges.functions', () => ({ syncUserBadges: vi.fn() }));
import { badgeProgress } from './badge-progress';

describe('persisted badge progress display', () => {
  it('uses 10 actions for the first badge milestone', () => expect(badgeProgress(0, 5)).toEqual({ target: 10, percent: 50 }));
  it('uses 100 actions after level 1, not a new award threshold', () => expect(badgeProgress(1, 25)).toEqual({ target: 100, percent: 25 }));
  it('shows diamond level 12 as the final milestone', () => expect(badgeProgress(12, 1000000)).toEqual({ target: null, percent: 100 }));
});