import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTaskHighlights() {
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchHighlights = async () => {
      const { data } = await supabase
        .from('task_highlights')
        .select('task_id')
        .gt('highlight_expires_at', new Date().toISOString());

      if (data) {
        setHighlightedTaskIds(new Set(data.map(h => h.task_id)));
      }
    };
    fetchHighlights();
  }, []);

  const isHighlighted = (taskId: string) => highlightedTaskIds.has(taskId);

  const refresh = async () => {
    const { data } = await supabase
      .from('task_highlights')
      .select('task_id')
      .gt('highlight_expires_at', new Date().toISOString());
    if (data) {
      setHighlightedTaskIds(new Set(data.map(h => h.task_id)));
    }
  };

  return { isHighlighted, highlightedTaskIds, refresh };
}
