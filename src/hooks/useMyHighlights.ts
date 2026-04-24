import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface HighlightEntry {
  id: string;
  task_id: string | null;
  product_id: string | null;
  user_id: string;
  stars_spent: number;
  created_at: string;
  highlight_expires_at: string;
  task?: { id: string; title: string; image_url: string | null; status: string | null } | null;
  product?: { id: string; title: string; image_url: string | null; status: string | null } | null;
}

export function useMyHighlights(targetUserId?: string) {
  const { user } = useAuth();
  const userId = targetUserId || user?.id;
  const [highlights, setHighlights] = useState<HighlightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_highlights')
        .select(`
          id, task_id, product_id, user_id, stars_spent, created_at, highlight_expires_at,
          task:tasks(id, title, image_url, status),
          product:products(id, title, image_url, status)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setHighlights(data as unknown as HighlightEntry[]);
      }
    } catch (err) {
      console.error('Error fetching my highlights:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const now = new Date();
  const active = highlights.filter(h => new Date(h.highlight_expires_at) > now);
  const past = highlights.filter(h => new Date(h.highlight_expires_at) <= now);

  return { highlights, active, past, loading, refresh: fetch };
}
