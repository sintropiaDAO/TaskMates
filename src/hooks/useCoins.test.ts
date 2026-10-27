import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/roll-lucky-star.functions', () => ({ rollLuckyStar: vi.fn() }));

import { COIN_DEFINITIONS } from './useCoins';

describe('journey completion scores', () => {
  it('recognizes JOURNEYS as a personal score, never a global total', () => {
    expect(COIN_DEFINITIONS.find(coin => coin.key === 'JOURNEYS')?.scope).toBe('user');
  });
});