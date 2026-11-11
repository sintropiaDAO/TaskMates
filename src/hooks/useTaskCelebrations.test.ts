import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), dispatch: vi.fn(), register: vi.fn(), roll: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, rpc: vi.fn() } }));
vi.mock('@/lib/completion-celebration', () => ({ dispatchCompletionCelebration: mocks.dispatch }));
vi.mock('@/lib/create-notification.functions', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/register-task-completion.functions', () => ({ registerTaskCompletion: mocks.register }));
vi.mock('@/lib/roll-lucky-star.functions', () => ({ rollLuckyStar: mocks.roll }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
import { completeTaskById } from './useTasks';

describe('task completion presentation', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  const database = (error: Error | null) => {
    mocks.from.mockReturnValue({
      update: vi.fn(() => ({ eq: async () => ({ error }) })),
      select: vi.fn(() => ({ eq: () => ({ single: async () => ({ data: { title: 'Plantar sementes', task_type: 'personal' } }) }) })),
    });
  };
  it('emits the saved task title only after completion succeeds', async () => {
    database(null);
    expect(await completeTaskById('task-1', 'https://taskmates.app/proof', 'link')).toMatchObject({ success: true });
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({ kind: 'task', id: 'task-1', title: 'Plantar sementes' });
  });
  it('does not celebrate a failed completion', async () => {
    database(new Error('Save failed'));
    expect(await completeTaskById('task-1', 'https://taskmates.app/proof', 'link')).toMatchObject({ success: false });
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.roll).not.toHaveBeenCalled();
  });
});