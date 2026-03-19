import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useHighlights() {
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());
  const [highlightedProductIds, setHighlightedProductIds] = useState<Set<string>>(new Set());

  const fetchHighlights = async () => {
    const { data } = await supabase
      .from('task_highlights')
      .select('task_id, product_id')
      .gt('highlight_expires_at', new Date().toISOString());

    if (data) {
      setHighlightedTaskIds(new Set(data.filter(h => h.task_id).map(h => h.task_id!)));
      setHighlightedProductIds(new Set(data.filter(h => h.product_id).map(h => h.product_id!)));
    }
  };

  useEffect(() => {
    fetchHighlights();
  }, []);

  return {
    isTaskHighlighted: (id: string) => highlightedTaskIds.has(id),
    isProductHighlighted: (id: string) => highlightedProductIds.has(id),
    highlightedTaskIds,
    highlightedProductIds,
    refresh: fetchHighlights,
  };
}
