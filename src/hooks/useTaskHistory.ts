import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskHistory, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function useTaskHistory(taskId: string | null) {
  const { user } = useAuth();
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    if (!taskId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('task_history')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching task history:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles for users who made changes
    const userIds = [...new Set(data?.map(h => h.user_id) || [])];
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('*')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const enrichedHistory = data?.map(h => ({
      ...h,
      action: h.action as TaskHistory['action'],
      profile: profileMap.get(h.user_id) as Profile
    })) as TaskHistory[];

    setHistory(enrichedHistory);
    setLoading(false);
  };

  const addHistoryEntry = async (
    action: TaskHistory['action'],
    fieldChanged?: string,
    oldValue?: string,
    newValue?: string
  ) => {
    if (!taskId || !user) return false;

    const { error } = await supabase
      .from('task_history')
      .insert({
        task_id: taskId,
        user_id: user.id,
        action,
        field_changed: fieldChanged || null,
        old_value: oldValue || null,
        new_value: newValue || null
      });

    if (error) {
      console.error('Error adding history entry:', error);
      return false;
    }

    await fetchHistory();
    return true;
  };

  useEffect(() => {
    if (taskId) {
      fetchHistory();
    }
  }, [taskId]);

  return {
    history,
    loading,
    addHistoryEntry,
    refreshHistory: fetchHistory
  };
}
