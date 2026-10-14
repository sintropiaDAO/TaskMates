import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TASK_SUBTYPES, type TaskSubtype } from '@/lib/taskSubtypes';

export interface SubtypeStats {
  created: number;
  completed: number;
  participated: number;
}

export interface PortfolioStats {
  bySubtype: Record<TaskSubtype, SubtypeStats>;
  meetingsWithNotes: number;
  eventCheckins: number;
}

const empty = (): PortfolioStats => ({
  bySubtype: Object.fromEntries(TASK_SUBTYPES.map(s => [s, { created: 0, completed: 0, participated: 0 }])) as Record<TaskSubtype, SubtypeStats>,
  meetingsWithNotes: 0,
  eventCheckins: 0,
});

/**
 * Aggregates a user's tasks by subtype (meeting/event/project/service) — the base
 * for the upcoming portfolio builder ("filter by meetings, events, projects, services").
 */
export async function fetchPortfolioStats(userId: string, opts?: { from?: string; to?: string }): Promise<PortfolioStats> {
  const stats = empty();
  let own = supabase.from('tasks').select('id, task_subtype, status, meeting_notes, created_at').eq('created_by', userId);
  if (opts?.from) own = own.gte('created_at', opts.from);
  if (opts?.to) own = own.lte('created_at', opts.to);

  const [ownRes, collabRes, attendRes] = await Promise.all([
    own,
    supabase.from('task_collaborators').select('task_id').eq('user_id', userId).eq('approval_status', 'approved'),
    supabase.from('task_attendees').select('task_id, status').eq('user_id', userId),
  ]);

  for (const t of ownRes.data || []) {
    const s = ((t as any).task_subtype || 'service') as TaskSubtype;
    stats.bySubtype[s].created++;
    if (t.status === 'completed') stats.bySubtype[s].completed++;
    if (s === 'meeting' && (t as any).meeting_notes) stats.meetingsWithNotes++;
  }

  const partIds = [...new Set([...(collabRes.data || []).map(c => c.task_id), ...(attendRes.data || []).map(a => a.task_id)])];
  if (partIds.length) {
    const { data } = await supabase.from('tasks').select('id, task_subtype').in('id', partIds).neq('created_by', userId);
    for (const t of data || []) stats.bySubtype[((t as any).task_subtype || 'service') as TaskSubtype].participated++;
  }
  stats.eventCheckins = (attendRes.data || []).filter(a => a.status === 'checked_in').length;
  return stats;
}

export function usePortfolioStats(userId?: string | null) {
  const [stats, setStats] = useState<PortfolioStats>(empty);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    fetchPortfolioStats(userId).then(s => { if (!cancelled) setStats(s); }).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [userId]);
  return { stats, loading };
}
