import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EXP_RULES, levelFromExp, expForLevel, rankFromExp, type RankLetter } from '@/lib/rpg';

export interface AdventurerStats {
  exp: number;
  level: number;
  levelStart: number;
  nextLevel: number;
  execution: number;
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
        supabase.from('tasks').select('id', head).eq('created_by', userId),
        supabase.from('products').select('id', head).eq('created_by', userId),
        supabase.from('polls').select('id', head).eq('created_by', userId),
        supabase.from('poll_votes').select('id', head).eq('user_id', userId),
        supabase.from('poll_comments').select('id', head).eq('user_id', userId),
        supabase.from('task_ratings').select('rating').eq('rated_user_id', userId),
        (supabase.rpc as any)('get_rank_sss_cutoff'),
      ]);
      const c = (r: { count: number | null }) => r.count ?? 0;
      const exec = c(completed);
      const coop = c(collab);
      const created = c(tasksCreated) + c(products) + c(polls);
      const exp =
        exec * EXP_RULES.questCompleted +
        coop * EXP_RULES.questCollaborated +
        c(fiveStars) * EXP_RULES.fiveStarRating +
        created * EXP_RULES.itemCreated;
      const rs = (ratings.data ?? []) as { rating: number }[];
      const avg = rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0;
      const level = levelFromExp(exp);
      const sssCutoff = Number(cutoff?.data ?? 0) || 0;
      const r = rankFromExp(exp, sssCutoff);
      if (!cancelled) {
        setStats({
          exp,
          level,
          levelStart: expForLevel(level),
          nextLevel: expForLevel(level + 1),
          execution: exec,
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
