import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EXP_RULES, rankFromExp, type RankLetter } from '@/lib/rpg';

export interface AdventurerStats {
  exp: number;
  execution: number;
  tasksParticipated: number;
  cooperation: number;
  wisdom: number;
  honor: number;
  rank: RankLetter;
  rankFloor: number;
  rankNext: number | null;
}

const head = { count: 'exact' as const, head: true };

export function useAdventurer(userId?: string) {
  const [stats, setStats] = useState<AdventurerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [completed, collab, fiveStars, tasksCreated, products, polls, votes, pollComments, ratings, cutoff] = await Promise.all([
        supabase.from('tasks').select('id', head).eq('created_by', userId).eq('status', 'completed'),
        supabase.from('task_collaborators').select('id', head).eq('user_id', userId).eq('approval_status', 'approved'),
        supabase.from('task_ratings').select('id', head).eq('rated_user_id', userId).eq('rating', 5),
        supabase.from('tasks').select('id').eq('created_by', userId),
        supabase.from('products').select('id', head).eq('created_by', userId),
        supabase.from('polls').select('id', head).eq('created_by', userId),
        supabase.from('poll_votes').select('id', head).eq('user_id', userId),
        supabase.from('poll_comments').select('id', head).eq('user_id', userId),
        supabase.from('task_ratings').select('rating').eq('rated_user_id', userId),
        (supabase.rpc as any)('get_rank_sss_cutoff'),
      ]);
      const c = (r: { count: number | null }) => r.count ?? 0;
      const createdList = (tasksCreated.data ?? []) as { id: string }[];
      // Execution (solo quests) and total participation in completed tasks
      const [ownDone, myCollabs, ownCollabRows] = await Promise.all([
        supabase.from('tasks').select('id, task_type').eq('created_by', userId).eq('status', 'completed'),
        supabase.from('task_collaborators').select('task_id, tasks!inner(status, task_type, created_by)')
          .eq('user_id', userId).eq('approval_status', 'approved').eq('tasks.status', 'completed'),
        createdList.length
          ? supabase.from('task_collaborators').select('task_id')
              .in('task_id', createdList.map(t => t.id))
              .eq('approval_status', 'approved').neq('user_id', userId)
          : Promise.resolve({ data: [] as { task_id: string }[] }),
      ]);
      const own = (ownDone.data ?? []) as { id: string; task_type: string }[];
      const collabRows = ((myCollabs.data ?? []) as any[]).filter(r => r.tasks?.created_by !== userId);
      const participated = new Set<string>([...own.map(t => t.id), ...collabRows.map(r => r.task_id)]);
      const requestIds = collabRows.filter(r => r.tasks?.task_type === 'request').map(r => r.task_id);
      const ownOfferIds = own.filter(t => t.task_type === 'offer').map(t => t.id);
      const checkIds = [...requestIds, ...ownOfferIds];
      const counts: Record<string, number> = {};
      if (checkIds.length) {
        const { data: others } = await supabase.from('task_collaborators').select('task_id, user_id')
          .in('task_id', checkIds).eq('approval_status', 'approved').neq('user_id', userId);
        (others ?? []).forEach((o: any) => { counts[o.task_id] = (counts[o.task_id] ?? 0) + 1; });
      }
      const exec =
        own.filter(t => t.task_type === 'personal').length +
        own.filter(t => t.task_type === 'offer' && !counts[t.id]).length +
        requestIds.filter(id => !counts[id]).length;
      void completed;
      const coop = c(collab);
      const createdList = (tasksCreated.data ?? []) as { id: string }[];
      const created = createdList.length + c(products) + c(polls);
      const exp =
        exec * EXP_RULES.questCompleted +
        coop * EXP_RULES.questCollaborated +
        c(fiveStars) * EXP_RULES.fiveStarRating +
        created * EXP_RULES.itemCreated;
      const rs = (ratings.data ?? []) as { rating: number }[];
      const avg = rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0;
      const sssCutoff = Number(cutoff?.data ?? 0) || 0;
      const r = rankFromExp(exp, sssCutoff);
      if (!cancelled) {
        setStats({
          exp,
          execution: exec,
          tasksParticipated: participated.size,
          cooperation: coop,
          wisdom: c(votes) + c(pollComments) + c(polls),
          honor: Math.round(avg * 20),
          rank: r.rank,
          rankFloor: r.floor,
          rankNext: r.next,
        });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return { stats, loading };
}
