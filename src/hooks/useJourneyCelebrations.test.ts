import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), getUser: vi.fn(), dispatch: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from, auth: { getUser: mocks.getUser } } }));
vi.mock('@/lib/completion-celebration', () => ({ dispatchCompletionCelebration: mocks.dispatch }));
import { evaluateJourney, evaluateMyActiveJourneys } from './useJourneys';

describe('celebrate only database-confirmed journey completions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'participant' } } });
    mocks.rpc.mockImplementation(async (name: string) => name === 'get_completed_journey_count'
      ? { data: 1, error: null }
      : { data: { joined: true, just_completed: true, total: 2, done: 2, completed: true }, error: null });
    mocks.from.mockImplementation((table: string) => {
      const query = {
        select: () => query, eq: () => query,
        maybeSingle: async () => ({ data: table === 'journeys' ? { title: 'Cultive conexões' } : { reward_delivered: false } }),
        then: (resolve: (data: unknown) => unknown) => Promise.resolve({ data: table === 'journey_rewards'
          ? [{ description: 'Combine a entrega', products: { title: 'Kit de sementes' } }]
          : [{ journey_id: 'journey-1' }] }).then(resolve),
      };
      return query;
    });
  });
  it('celebrates a fresh completion with actual title, x1.1 multiplier and unconfirmed reward delivery', async () => {
    await evaluateJourney('journey-1');
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({
      kind: 'journey', id: 'journey-1', title: 'Cultive conexões', steps: 2, multiplier: 1.1,
      rewards: [{ title: 'Kit de sementes', description: 'Combine a entrega' }], rewardDelivered: false,
    });
  });
  it('does not replay completion when refreshing an already finished journey', async () => {
    mocks.rpc.mockResolvedValue({ data: { joined: true, completed: true, just_completed: false }, error: null });
    await evaluateJourney('journey-1');
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it('does not celebrate incomplete steps', async () => {
    mocks.rpc.mockResolvedValue({ data: { joined: true, done: 1, total: 2 }, error: null });
    await evaluateJourney('journey-1');
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it('does not celebrate when evaluation fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('Evaluation failed') });
    await expect(evaluateJourney('journey-1')).rejects.toThrow('Evaluation failed');
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it('celebrates automatic evaluations too', async () => {
    expect(await evaluateMyActiveJourneys('participant')).toBe(1);
    expect(mocks.dispatch).toHaveBeenCalledOnce();
  });
  it('still celebrates without inventing a multiplier when decorative reads fail', async () => {
    mocks.from.mockImplementation(() => { throw new Error('Metadata unavailable'); });
    await evaluateJourney('journey-1');
    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({ kind: 'journey', multiplier: undefined, rewards: [] }));
  });
});