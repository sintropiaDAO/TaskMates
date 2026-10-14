import { supabase } from '@/integrations/supabase/client';

/**
 * Unique events where the user's presence was confirmed (checked in).
 * Excludes events the user created or collaborated on (already rewarded elsewhere),
 * so each event counts once and never doubles EXP.
 */
export async function fetchConfirmedAttendances(userId: string): Promise<number> {
  const [att, collab] = await Promise.all([
    supabase.from('task_attendees')
      .select('task_id, tasks!inner(created_by, task_subtype)')
      .eq('user_id', userId).eq('status', 'checked_in').eq('tasks.task_subtype', 'event'),
    supabase.from('task_collaborators').select('task_id').eq('user_id', userId).eq('approval_status', 'approved'),
  ]);
  const collabIds = new Set(((collab.data ?? []) as { task_id: string }[]).map(r => r.task_id));
  const ids = new Set<string>();
  for (const r of (att.data ?? []) as any[]) {
    if (r.tasks?.created_by === userId || collabIds.has(r.task_id)) continue;
    ids.add(r.task_id);
  }
  return ids.size;
}
