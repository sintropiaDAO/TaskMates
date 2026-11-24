import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { chatShareMessage } from '@/lib/mentions';

export const shareToConversation = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ conversationId: z.string().uuid(), title: z.string().min(1).max(500), url: z.string().url().startsWith('https://').max(2000) }).parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: own, error: accessError } = await db.from('conversation_participants').select('id')
      .eq('conversation_id', data.conversationId).eq('user_id', context.userId).maybeSingle();
    if (accessError || !own) throw new Error('Conversation unavailable');
    const id = crypto.randomUUID();
    const { error } = await db.from('messages').insert({ id, sender_id: context.userId, conversation_id: data.conversationId, content: chatShareMessage(data.title, data.url) });
    if (error) throw new Error('Could not share in chat');
    await db.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', data.conversationId);
    // Only notify members of the conversation the authenticated caller can access.
    try {
      const { data: members } = await db.from('conversation_participants').select('user_id').eq('conversation_id', data.conversationId).neq('user_id', context.userId);
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { sendPushToUser } = await import('@/lib/send-push.server');
      await Promise.all((members ?? []).map(async member => {
        const { data: blocks, error: blockError } = await supabaseAdmin.from('user_blocks').select('id')
          .or(`and(blocker_id.eq.${context.userId},blocked_id.eq.${member.user_id}),and(blocker_id.eq.${member.user_id},blocked_id.eq.${context.userId})`).limit(1);
        if (blockError || blocks?.length) return;
        const { data: profile } = await supabaseAdmin.from('profiles').select('preferred_language').eq('id', member.user_id).maybeSingle();
        const message = profile?.preferred_language === 'en' ? '💬 A link was shared in your chat.' : '💬 Um link foi compartilhado no seu chat.';
        const { error: notificationError } = await supabaseAdmin.from('notifications').insert({ user_id: member.user_id, type: 'new_message', message, conversation_id: data.conversationId });
        if (!notificationError) await sendPushToUser({ user_id: member.user_id, title: 'TaskMates', body: message, url: `/chat?conversation=${data.conversationId}`, tag: `chat-${data.conversationId}` });
      }));
    } catch (error) { console.error('Chat share notification failed', error); }
    return { id };
  });