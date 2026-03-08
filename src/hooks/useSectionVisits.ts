import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type SectionKey = string;

interface SectionVisit {
  section_key: string;
  last_visited_at: string;
}

export function useSectionVisits() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Map<string, Date>>(new Map());
  const [loaded, setLoaded] = useState(false);

  // Fetch all section visits on mount
  useEffect(() => {
    if (!user) return;

    const fetchVisits = async () => {
      const { data } = await supabase
        .from('section_visits')
        .select('section_key, last_visited_at')
        .eq('user_id', user.id);

      if (data) {
        const map = new Map<string, Date>();
        data.forEach((v: SectionVisit) => {
          map.set(v.section_key, new Date(v.last_visited_at));
        });
        setVisits(map);
      }
      setLoaded(true);
    };

    fetchVisits();
  }, [user]);

  // Mark a section as visited (upsert) — always updates local state immediately
  const markVisited = useCallback(async (sectionKey: SectionKey) => {
    if (!user) return;

    const now = new Date();
    
    // Always update local state immediately
    setVisits(prev => {
      const next = new Map(prev);
      next.set(sectionKey, now);
      return next;
    });

    // Persist in background (fire-and-forget)
    supabase
      .from('section_visits')
      .upsert(
        { user_id: user.id, section_key: sectionKey, last_visited_at: now.toISOString() },
        { onConflict: 'user_id,section_key' }
      )
      .then(({ error }) => {
        if (error) console.error('Error upserting section visit:', error);
      });
  }, [user]);

  // Check if an item is new (created after last visit to a section)
  const isNewSince = useCallback((sectionKey: SectionKey, createdAt: string | null | undefined): boolean => {
    if (!loaded || !createdAt) return false;
    const lastVisit = visits.get(sectionKey);
    if (!lastVisit) return true; // Never visited = all items are new
    return new Date(createdAt) > lastVisit;
  }, [visits, loaded]);

  // Count new items for a section
  const countNewItems = useCallback((sectionKey: SectionKey, items: { created_at?: string | null }[]): number => {
    if (!loaded) return 0;
    return items.filter(item => isNewSince(sectionKey, item.created_at)).length;
  }, [loaded, isNewSince]);

  // Check if a section has any new items
  const hasNewItems = useCallback((sectionKey: SectionKey, items: { created_at?: string | null }[]): boolean => {
    return countNewItems(sectionKey, items) > 0;
  }, [countNewItems]);

  return {
    markVisited,
    isNewSince,
    countNewItems,
    hasNewItems,
    loaded,
  };
}
