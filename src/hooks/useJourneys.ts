import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { JourneyStepInput } from '@/lib/journeys';

export interface JourneyRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_by: string;
  tag_ids: string[];
  is_ordered: boolean;
  is_starter: boolean;
  deadline: string | null;
  status: string;
  created_at: string;
}

export interface JourneySummary extends JourneyRow {
  steps_count: number;
  participants_count: number;
  completed_count: number;
  my_status: 'active' | 'completed' | null;
  my_done: number;
}

export interface MiniProfile { id: string; full_name: string | null; username: string; avatar_url: string | null }

const db = supabase as any;

export async function fetchProfiles(ids: string[]): Promise<Record<string, MiniProfile>> {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return {};
  const { data } = await db.from('profiles').select('id, full_name, username, avatar_url').in('id', uniq);
  return Object.fromEntries(((data ?? []) as MiniProfile[]).map(p => [p.id, p]));
}

async function summarize(journeys: JourneyRow[], userId?: string): Promise<JourneySummary[]> {
  if (!journeys.length) return [];
  const ids = journeys.map(j => j.id);
  const [{ data: steps }, { data: parts }] = await Promise.all([
    db.from('journey_steps').select('id, journey_id').in('journey_id', ids),
    db.from('journey_participants').select('id, journey_id, user_id, status').in('journey_id', ids),
  ]);
  const mine = ((parts ?? []) as any[]).filter(p => p.user_id === userId);
  let progress: any[] = [];
  if (mine.length) {
    const { data } = await db.from('journey_step_progress').select('participant_id').in('participant_id', mine.map(p => p.id));
    progress = data ?? [];
  }
  return journeys.map(j => {
    const ps = ((parts ?? []) as any[]).filter(p => p.journey_id === j.id);
    const me = mine.find(p => p.journey_id === j.id);
    return {
      ...j,
      steps_count: ((steps ?? []) as any[]).filter(s => s.journey_id === j.id).length,
      participants_count: ps.length,
      completed_count: ps.filter(p => p.status === 'completed').length,
      my_status: me?.status ?? null,
      my_done: me ? progress.filter(p => p.participant_id === me.id).length : 0,
    };
  });
}

/** Journeys linked to any of the given tags (RLS applies community privacy and blocks). */
export function useJourneysForTags(tagIds: string[], userId?: string, includeStarter = true, includeMine = false) {
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const key = tagIds.join(',');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = db.from('journeys').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(20);
      if (tagIds.length) q = q.overlaps('tag_ids', tagIds);
      const { data } = await q;
      let rows = (data ?? []) as JourneyRow[];
      if (includeMine && userId) {
        const { data: mine } = await db.from('journey_participants').select('journey_id').eq('user_id', userId);
        const extra = ((mine ?? []) as any[]).map(m => m.journey_id).filter((id: string) => !rows.some(r => r.id === id));
        if (extra.length) {
          const { data: more } = await db.from('journeys').select('*').in('id', extra).eq('status', 'active');
          rows = [...rows, ...((more ?? []) as JourneyRow[])];
        }
      }
      if (!includeStarter) rows = rows.filter(r => !r.is_starter);
      const s = await summarize(rows, userId);
      if (!cancelled) { setJourneys(s); setLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, userId, includeStarter, includeMine]);
  return { journeys, loading };
}

export function useMyJourneys(userId?: string) {
  const [participating, setParticipating] = useState<JourneySummary[]>([]);
  const [created, setCreated] = useState<JourneySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data: parts } = await db.from('journey_participants').select('journey_id').eq('user_id', userId);
    const ids = ((parts ?? []) as any[]).map(p => p.journey_id);
    const [{ data: pj }, { data: cj }] = await Promise.all([
      ids.length ? db.from('journeys').select('*').in('id', ids) : Promise.resolve({ data: [] }),
      db.from('journeys').select('*').eq('created_by', userId).order('created_at', { ascending: false }),
    ]);
    const [a, b] = await Promise.all([summarize((pj ?? []) as JourneyRow[], userId), summarize((cj ?? []) as JourneyRow[], userId)]);
    setParticipating(a);
    setCreated(b);
    setLoading(false);
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  return { participating, created, loading, reload: load };
}

export async function countCompletedJourneys(userId: string): Promise<number> {
  const { count } = await db.from('journey_participants').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'completed');
  return count ?? 0;
}

export async function evaluateJourney(journeyId: string) {
  const { data, error } = await db.rpc('evaluate_journey_progress', { _journey_id: journeyId });
  if (error) throw error;
  return data as { joined: boolean; done?: number; total?: number; completed?: boolean; just_completed?: boolean };
}

/** Re-check every active journey of the user after a key action (create, complete, vote, follow…). */
export async function evaluateMyActiveJourneys(userId: string) {
  const { data } = await db.from('journey_participants').select('journey_id').eq('user_id', userId).eq('status', 'active');
  const results = await Promise.all(((data ?? []) as any[]).map(p => evaluateJourney(p.journey_id).catch(() => null)));
  return results.filter(r => r?.just_completed).length;
}

export interface JourneyRewardInput { product_id?: string | null; description?: string | null }

export async function createJourney(input: {
  userId: string; title: string; description?: string | null; image_url?: string | null;
  tag_ids: string[]; is_ordered: boolean; deadline?: string | null;
  steps: JourneyStepInput[]; rewards: JourneyRewardInput[];
}, existingId?: string): Promise<string> {
  const base = {
    title: input.title, description: input.description || null, image_url: input.image_url || null,
    tag_ids: input.tag_ids, is_ordered: input.is_ordered, deadline: input.deadline || null,
  };
  let id = existingId;
  if (id) {
    const { error } = await db.from('journeys').update(base).eq('id', id);
    if (error) throw error;
    await Promise.all([
      db.from('journey_steps').delete().eq('journey_id', id),
      db.from('journey_rewards').delete().eq('journey_id', id),
    ]);
  } else {
    const { data, error } = await db.from('journeys').insert({ ...base, created_by: input.userId }).select('id').single();
    if (error) throw error;
    id = data.id as string;
  }
  if (input.steps.length) {
    const { error } = await db.from('journey_steps').insert(input.steps.map((s, i) => ({
      journey_id: id, position: i + 1, title: s.title || null, action: s.action,
      item_kind: s.item_kind || null, item_type: s.item_type || null, item_subtype: s.item_subtype || null,
      tag_category: s.tag_category || null, tag_ids: s.tag_ids ?? [], tag_match: s.tag_match ?? 'any',
      entity_id: s.entity_id || null, indicators: s.indicators ?? [],
    })));
    if (error) throw error;
  }
  const rewards = input.rewards.filter(r => r.product_id || r.description?.trim());
  if (rewards.length) {
    const { error } = await db.from('journey_rewards').insert(rewards.map(r => ({ journey_id: id, product_id: r.product_id || null, description: r.description || null })));
    if (error) throw error;
  }
  return id!;
}
