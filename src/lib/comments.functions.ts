import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const input = z.object({
  kind: z.enum(['task', 'poll', 'product', 'journey']), entityId: z.string().uuid(), content: z.string().max(5000),
  attachment: z.object({ url: z.string().url().startsWith('https://'), type: z.enum(['image', 'file']), name: z.string().max(255) }).optional(),
}).refine(d => !!d.content.trim() || !!d.attachment);

export const addComment = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data)).handler(async ({ data, context }) => {
    const id = crypto.randomUUID();
    const common = { id, user_id: context.userId, content: data.content.trim() };
    const attachment = { attachment_url: data.attachment?.url ?? null, attachment_type: data.attachment?.type ?? null, attachment_name: data.attachment?.name ?? null };
    const db = context.supabase;
    const result = data.kind === 'task' ? await db.from('task_comments').insert({ ...common, ...attachment, task_id: data.entityId })
      : data.kind === 'poll' ? await db.from('poll_comments').insert({ ...common, ...attachment, poll_id: data.entityId })
      : data.kind === 'product' ? await db.from('product_comments').insert({ ...common, ...attachment, product_id: data.entityId })
      : await db.from('journey_comments').insert({ ...common, journey_id: data.entityId });
    if (result.error) throw new Error('Could not save comment');
    // The caller just persisted this comment through RLS; only its trigger-created notices are delivered.
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { data: notices } = await supabaseAdmin.from('notifications').select('user_id, message')
        .eq('source_comment_id', id).eq('source_comment_kind', data.kind);
      const { sendPushToUser } = await import('@/lib/send-push.server');
      const url = data.kind === 'journey' ? `/journeys/${data.entityId}` : `/dashboard?${data.kind}=${data.entityId}`;
      await Promise.all((notices ?? []).map(n => sendPushToUser({ user_id: n.user_id, title: 'TaskMates', body: n.message, url, tag: `mention-${id}` })));
    } catch (error) { console.error('Mention push delivery failed', error); }
    return { id };
  });