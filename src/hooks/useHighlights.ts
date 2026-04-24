import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useHighlights() {
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());
  const [highlightedProductIds, setHighlightedProductIds] = useState<Set<string>>(new Set());
  const [highlightedPollIds, setHighlightedPollIds] = useState<Set<string>>(new Set());

  const fetchHighlights = async () => {
    const { data } = await supabase
      .from('task_highlights')
      .select('task_id, product_id, poll_id')
      .gt('highlight_expires_at', new Date().toISOString());

    if (data) {
      setHighlightedTaskIds(new Set(data.filter((h: any) => h.task_id).map((h: any) => h.task_id!)));
      setHighlightedProductIds(new Set(data.filter((h: any) => h.product_id).map((h: any) => h.product_id!)));
      setHighlightedPollIds(new Set(data.filter((h: any) => h.poll_id).map((h: any) => h.poll_id!)));
    }
  };

  useEffect(() => {
    fetchHighlights();
  }, []);

  return {
    isTaskHighlighted: (id: string) => highlightedTaskIds.has(id),
    isProductHighlighted: (id: string) => highlightedProductIds.has(id),
    isPollHighlighted: (id: string) => highlightedPollIds.has(id),
    highlightedTaskIds,
    highlightedProductIds,
    highlightedPollIds,
    refresh: fetchHighlights,
  };
}
