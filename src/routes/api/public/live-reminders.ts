import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';
import { reminderKindFor, reminderMessage, SOON_AHEAD_MS, STARTED_GRACE_MS } from '@/lib/liveReminders';

export const Route = createFileRoute('/api/public/live-reminders')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { adminClient } = await import('@/lib/supabase-server');
        const { sendPushToUser } = await import('@/lib/send-push.server');
        const admin = adminClient();
        const now = new Date();
        const { data: tasks, error } = await admin
          .from('tasks')
          .select('id, title, deadline, created_by, live_url, room_name, status')
          .in('task_subtype', ['meeting', 'event'])
          .neq('status', 'completed')
          .gte('deadline', new Date(now.getTime() - STARTED_GRACE_MS).toISOString())
          .lte('deadline', new Date(now.getTime() + SOON_AHEAD_MS).toISOString())
          .or('live_url.not.is.null,room_name.not.is.null');
        if (error) return new Response('query failed', { status: 500 });
        let sent = 0;
        for (const t of tasks || []) {
          const kind = reminderKindFor(t.deadline as string, now);
          if (!kind) continue;
          const [{ data: collabs }, { data: attendees }] = await Promise.all([
            admin.from('task_collaborators').select('user_id').eq('task_id', t.id),
            admin.from('task_attendees').select('user_id').eq('task_id', t.id),
          ]);
          const users = new Set<string>([t.created_by, ...(collabs || []).map(r => r.user_id), ...(attendees || []).map(r => r.user_id)]);
          // Idempotency: skip users already notified of this kind for this task.
          const { data: already } = await admin.from('notifications').select('user_id').eq('task_id', t.id).eq('type', kind);
          for (const r of already || []) users.delete(r.user_id);
          if (!users.size) continue;
          const { data: profiles } = await admin.from('profiles').select('id, preferred_language').in('id', [...users]);
          const lang = new Map((profiles || []).map(p => [p.id, p.preferred_language]));
          for (const uid of users) {
            const message = reminderMessage(kind, t.title, lang.get(uid) !== 'en');
            const { error: insErr } = await admin.from('notifications').insert({ user_id: uid, type: kind, message, task_id: t.id });
            if (insErr) continue;
            try { await sendPushToUser({ user_id: uid, title: 'TaskMates', body: message, url: `/dashboard?task=${t.id}`, tag: `live-${t.id}` }); sent++; }
            catch (e) { console.error('live push failed', e); }
          }
        }
        return Response.json({ ok: true, sent });
      },
    },
  },
});
