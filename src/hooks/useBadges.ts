import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type BadgeCategory =
  | 'taskmates'
  | 'habits'
  | 'communities'
  | 'leadership'
  | 'collaboration'
  | 'positive_impact'
  | 'sociability'
  | 'reliability'
  | 'consistency';

export interface UserBadge {
  id: string;
  user_id: string;
  category: BadgeCategory;
  level: number; // 1-9, 10=silver, 11=gold, 12=diamond
  entity_id: string | null;
  entity_name: string | null;
  metric_value: number;
  earned_at: string;
  notified: boolean;
  created_at: string;
  updated_at: string;
}

export const LEVEL_THRESHOLDS = [10, 100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 500000, 1000000];

export function getLevelName(level: number, language: 'pt' | 'en' = 'pt'): string {
  if (level <= 9) return `${language === 'pt' ? 'Nível' : 'Level'} ${level}`;
  if (level === 10) return language === 'pt' ? 'Nível Prata' : 'Silver Level';
  if (level === 11) return language === 'pt' ? 'Nível Ouro' : 'Gold Level';
  if (level === 12) return language === 'pt' ? 'Nível Diamante' : 'Diamond Level';
  return `${language === 'pt' ? 'Nível' : 'Level'} ${level}`;
}

export function getThresholdForLevel(level: number): number {
  return LEVEL_THRESHOLDS[level - 1] ?? 1000000;
}

export function getLevelForMetric(value: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (value >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 0;
}

export function useBadges(targetUserId?: string) {
  const { user } = useAuth();
  const userId = targetUserId || user?.id;

  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('level', { ascending: false });
    if (!error && data) {
      setBadges(data as UserBadge[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchBadges(); }, [fetchBadges]);

  // Compute and sync all badge metrics for the current user
  const computeAndSyncBadges = useCallback(async () => {
    if (!user?.id) return;
    const uid = user.id;

    // ---- 1. TASKMATES ----
    const { data: myTasks } = await supabase.from('tasks').select('id').eq('created_by', uid);
    const myTaskIds = myTasks?.map(t => t.id) || [];

    // Get all completed tasks I was involved in (any role)
    const { data: myCollabs } = await supabase
      .from('task_collaborators')
      .select('task_id, user_id, status, approval_status')
      .eq('approval_status', 'approved');

    // Get completed tasks
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('id, created_by')
      .eq('status', 'completed');

    const completedTaskIds = new Set(completedTasks?.map(t => t.id) || []);

    // Tasks I was involved in (as creator or collaborator/requester)
    const myInvolvedTaskIds = new Set<string>([
      ...myTaskIds.filter(id => completedTaskIds.has(id)),
      ...(myCollabs?.filter(c => c.user_id === uid && completedTaskIds.has(c.task_id)).map(c => c.task_id) || [])
    ]);

    // Count shared completed tasks with each other user
    const teammateCount: Record<string, number> = {};
    for (const taskId of myInvolvedTaskIds) {
      const task = completedTasks?.find(t => t.id === taskId);
      // All people involved in this task
      const involvedPeople = new Set<string>();
      if (task?.created_by && task.created_by !== uid) involvedPeople.add(task.created_by);
      myCollabs?.filter(c => c.task_id === taskId && c.user_id !== uid && c.approval_status === 'approved').forEach(c => involvedPeople.add(c.user_id));
      for (const personId of involvedPeople) {
        teammateCount[personId] = (teammateCount[personId] || 0) + 1;
      }
    }

    // ---- 2. HABITS (skill tags) + 3. COMMUNITIES (community tags) ----
    const { data: allTaskTags } = await supabase.from('task_tags').select('task_id, tag_id');
    const { data: allTags } = await supabase.from('tags').select('id, name, category');

    const tagCompletedCount: Record<string, number> = {};
    for (const taskId of myInvolvedTaskIds) {
      const taskTagIds = allTaskTags?.filter(tt => tt.task_id === taskId).map(tt => tt.tag_id) || [];
      for (const tagId of taskTagIds) {
        tagCompletedCount[tagId] = (tagCompletedCount[tagId] || 0) + 1;
      }
    }

    // ---- 4. LEADERSHIP ----
    const { data: allCollabsForLeadership } = await supabase
      .from('task_collaborators')
      .select('task_id, user_id, status, approval_status')
      .eq('approval_status', 'approved');

    const leadershipMax: Record<string, number> = {};
    for (const taskId of myTaskIds) {
      const count = allCollabsForLeadership?.filter(c => c.task_id === taskId).length || 0;
      leadershipMax[taskId] = count;
    }
    const leadershipValue = Math.max(0, ...Object.values(leadershipMax));

    // ---- 5. COLLABORATION ----
    const collabCompletedCount = myCollabs?.filter(
      c => c.user_id === uid && c.status === 'collaborator' && completedTaskIds.has(c.task_id)
    ).length || 0;

    // ---- 6. POSITIVE IMPACT ----
    // Max likes on a single completed task created by user
    const { data: myCompletedCreatedTasks } = await supabase
      .from('tasks')
      .select('id, likes')
      .eq('created_by', uid)
      .eq('status', 'completed');

    const positiveImpactMax = Math.max(0, ...(myCompletedCreatedTasks?.map(t => t.likes || 0) || [0]));
    const positiveImpactTaskId = myCompletedCreatedTasks?.find(t => (t.likes || 0) === positiveImpactMax)?.id || null;
    // Get tags from that task
    let positiveImpactTagId: string | null = null;
    if (positiveImpactTaskId) {
      const taskTagData = allTaskTags?.filter(tt => tt.task_id === positiveImpactTaskId) || [];
      positiveImpactTagId = taskTagData[0]?.tag_id || null;
    }

    // ---- 7. SOCIABILITY ----
    const { count: followerCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', uid);

    // ---- 8. RELIABILITY ----
    // Consecutive max ratings
    const { data: myRatings } = await supabase
      .from('task_ratings')
      .select('rating, created_at')
      .eq('rated_user_id', uid)
      .order('created_at', { ascending: true });

    let maxConsecutive = 0;
    let currentStreak = 0;
    const MAX_RATING = 5;
    for (const r of (myRatings || [])) {
      if (r.rating >= MAX_RATING) {
        currentStreak++;
        maxConsecutive = Math.max(maxConsecutive, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // ---- 9. CONSISTENCY ----
    // Max streak on any repeated task
    const { data: myRepeatTasks } = await supabase
      .from('tasks')
      .select('id, streak_count')
      .eq('created_by', uid)
      .not('repeat_type', 'is', null);

    const consistencyMax = Math.max(0, ...(myRepeatTasks?.map(t => t.streak_count || 0) || [0]));
    const consistencyTaskId = myRepeatTasks?.find(t => (t.streak_count || 0) === consistencyMax)?.id || null;
    let consistencyTagId: string | null = null;
    if (consistencyTaskId) {
      const taskTagData = allTaskTags?.filter(tt => tt.task_id === consistencyTaskId) || [];
      consistencyTagId = taskTagData[0]?.tag_id || null;
    }

    // ---- Upsert badges ----
    const badgesToProcess: Array<{
      category: BadgeCategory;
      entity_id: string | null;
      entity_name: string | null;
      metric_value: number;
    }> = [];

    // Taskmates
    for (const [personId, count] of Object.entries(teammateCount)) {
      if (count >= 10) {
        // Get name
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', personId).single();
        badgesToProcess.push({ category: 'taskmates', entity_id: personId, entity_name: prof?.full_name || personId, metric_value: count });
      }
    }

    // Habits & Communities
    for (const [tagId, count] of Object.entries(tagCompletedCount)) {
      if (count >= 10) {
        const tag = allTags?.find(t => t.id === tagId);
        if (tag) {
          const cat: BadgeCategory = tag.category === 'skills' ? 'habits' : 'communities';
          badgesToProcess.push({ category: cat, entity_id: tagId, entity_name: tag.name, metric_value: count });
        }
      }
    }

    // Leadership
    if (leadershipValue >= 10) {
      badgesToProcess.push({ category: 'leadership', entity_id: null, entity_name: null, metric_value: leadershipValue });
    }

    // Collaboration
    if (collabCompletedCount >= 10) {
      badgesToProcess.push({ category: 'collaboration', entity_id: null, entity_name: null, metric_value: collabCompletedCount });
    }

    // Positive Impact
    if (positiveImpactMax >= 10) {
      const tagName = allTags?.find(t => t.id === positiveImpactTagId)?.name || null;
      badgesToProcess.push({ category: 'positive_impact', entity_id: positiveImpactTagId, entity_name: tagName, metric_value: positiveImpactMax });
    }

    // Sociability
    if ((followerCount || 0) >= 10) {
      badgesToProcess.push({ category: 'sociability', entity_id: null, entity_name: null, metric_value: followerCount || 0 });
    }

    // Reliability
    if (maxConsecutive >= 10) {
      badgesToProcess.push({ category: 'reliability', entity_id: null, entity_name: null, metric_value: maxConsecutive });
    }

    // Consistency
    if (consistencyMax >= 10) {
      const tagName = allTags?.find(t => t.id === consistencyTagId)?.name || null;
      badgesToProcess.push({ category: 'consistency', entity_id: consistencyTagId, entity_name: tagName, metric_value: consistencyMax });
    }

    // Fetch existing badges
    const { data: existingBadges } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', uid);

    for (const badge of badgesToProcess) {
      const newLevel = getLevelForMetric(badge.metric_value);
      if (newLevel === 0) continue;

      const existing = existingBadges?.find(
        b => b.category === badge.category && b.entity_id === badge.entity_id
      );

      if (!existing) {
        await supabase.from('user_badges').insert({
          user_id: uid,
          category: badge.category,
          level: newLevel,
          entity_id: badge.entity_id,
          entity_name: badge.entity_name,
          metric_value: badge.metric_value,
          earned_at: new Date().toISOString(),
          notified: false,
        });
      } else if (newLevel > existing.level || badge.metric_value > existing.metric_value) {
        const leveledUp = newLevel > existing.level;
        await supabase.from('user_badges').update({
          level: newLevel,
          metric_value: badge.metric_value,
          entity_name: badge.entity_name,
          earned_at: leveledUp ? new Date().toISOString() : existing.earned_at,
          notified: leveledUp ? false : existing.notified,
        }).eq('id', existing.id);
      }
    }

    await fetchBadges();
  }, [user?.id, fetchBadges]);

  // Check & send notifications for unnotified badges
  const markBadgeNotified = useCallback(async (badgeId: string) => {
    await supabase.from('user_badges').update({ notified: true }).eq('id', badgeId);
  }, []);

  // Top 10 highest level badges
  const topBadges = [...badges]
    .sort((a, b) => b.level - a.level || b.metric_value - a.metric_value)
    .slice(0, 10);

  // Highest badge per (category, entity_id)
  const galleryBadges = (() => {
    const map = new Map<string, UserBadge>();
    for (const b of badges) {
      const key = `${b.category}__${b.entity_id || ''}`;
      const existing = map.get(key);
      if (!existing || b.level > existing.level) map.set(key, b);
    }
    return Array.from(map.values()).sort((a, b) => b.level - a.level || b.metric_value - a.metric_value);
  })();

  return { badges, galleryBadges, topBadges, loading, fetchBadges, computeAndSyncBadges, markBadgeNotified };
}
