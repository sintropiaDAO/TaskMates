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
  | 'consistency'
  | 'proactivity';

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

  // Trigger server-side recomputation. The edge function computes all metrics
  // itself via the service role — the client cannot supply badge levels.
  const computeAndSyncBadges = useCallback(async () => {
    if (!user?.id) return;
    await supabase.functions.invoke('sync-user-badges', { body: {} });
    await fetchBadges();
  }, [user?.id, fetchBadges]);

  // Mark a badge notification as seen (handled server-side via edge function)
  const markBadgeNotified = useCallback(async (badgeId: string) => {
    await supabase.functions.invoke('sync-user-badges', {
      body: { markNotified: [badgeId], skipCompute: true },
    });
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
