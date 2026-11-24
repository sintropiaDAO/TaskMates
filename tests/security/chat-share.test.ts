import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    let validate: (value: unknown) => unknown = value => value;
    const builder = {
      middleware: () => builder,
      inputValidator: (fn: (value: unknown) => unknown) => { validate = fn; return builder; },
      handler: (fn: (value: unknown) => unknown) => (args: { data: unknown; context: unknown }) => fn({ ...args, data: validate(args.data) }),
    };
    return builder;
  },
}));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));

import { shareToConversation } from '@/lib/chat-share.functions';

const invoke = shareToConversation as unknown as (args: { data: unknown; context: unknown }) => Promise<unknown>;
const conversationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('chat share authorization', () => {
  for (const caseName of ['not a member', 'membership lookup failed']) {
    it(`cannot send when ${caseName}`, async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: caseName === 'membership lookup failed' ? { message: 'Unavailable' } : null });
      const eq = vi.fn(); const query = { eq, maybeSingle }; eq.mockReturnValue(query);
      const select = vi.fn().mockReturnValue(query);
      const from = vi.fn().mockReturnValue({ select });
      await expect(invoke({ data: { conversationId, title: 'Horta', url: 'https://taskmates.app/share/task/123' }, context: { userId, supabase: { from } } })).rejects.toThrow('Conversation unavailable');
      expect(from.mock.calls).toEqual([['conversation_participants']]);
      expect(eq).toHaveBeenCalledWith('user_id', userId);
      expect(eq).toHaveBeenCalledWith('conversation_id', conversationId);
    });
  }
  it('rejects unsafe non-HTTPS links before reading or writing a conversation', async () => {
    const from = vi.fn();
    expect(() => invoke({ data: { conversationId, title: 'Horta', url: 'javascript:alert(1)' }, context: { userId, supabase: { from } } })).toThrow();
    expect(from).not.toHaveBeenCalled();
  });
});