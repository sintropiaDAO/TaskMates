import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskCollaborator, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface CollaboratorCounts {
  collaborators: number;
  requesters: number;
}

export function useTaskCollaborators() {
  const { user } = useAuth();
  const [collaboratorCounts, setCollaboratorCounts] = useState<Record<string, CollaboratorCounts>>({});
  const [loading, setLoading] = useState(false);

  const fetchCollaboratorCounts = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('task_collaborators')
      .select('task_id, status')
      .in('task_id', taskIds);
    
    if (error) {
      console.error('Error fetching collaborator counts:', error);
      setLoading(false);
      return;
    }

    const counts: Record<string, CollaboratorCounts> = {};
    
    taskIds.forEach(id => {
      counts[id] = { collaborators: 0, requesters: 0 };
    });

    data?.forEach(collab => {
      if (!counts[collab.task_id]) {
        counts[collab.task_id] = { collaborators: 0, requesters: 0 };
      }
      if (collab.status === 'collaborate') {
        counts[collab.task_id].collaborators++;
      } else if (collab.status === 'request') {
        counts[collab.task_id].requesters++;
      }
    });

    setCollaboratorCounts(counts);
    setLoading(false);
  }, []);

  const fetchTaskCollaborators = async (taskId: string): Promise<TaskCollaborator[]> => {
    const { data, error } = await supabase
      .from('task_collaborators')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (error || !data) return [];

    const userIds = [...new Set(data.map(c => c.user_id))];
    
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('*')
      .in('id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    return data.map(c => ({
      ...c,
      profile: profileMap.get(c.user_id) as Profile | undefined
    }));
  };

  const addCollaborator = async (taskId: string, status: 'collaborate' | 'request', taskOwnerId: string, taskTitle: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('task_collaborators')
      .insert({
        task_id: taskId,
        user_id: user.id,
        status,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'already_exists' };
      }
      return { success: false, error: error.message };
    }

    // Create notification for task owner
    try {
      const notificationType = status === 'collaborate' ? 'collaboration_request' : 'help_request';
      const message = status === 'collaborate' 
        ? `Alguém quer colaborar na sua tarefa: "${taskTitle}"`
        : `Alguém solicitou sua tarefa: "${taskTitle}"`;

      await supabase.rpc('create_notification', {
        _user_id: taskOwnerId,
        _task_id: taskId,
        _type: notificationType,
        _message: message
      });
    } catch (notifError) {
      console.warn('Failed to create notification:', notifError);
    }

    // Update local counts
    setCollaboratorCounts(prev => {
      const current = prev[taskId] || { collaborators: 0, requesters: 0 };
      return {
        ...prev,
        [taskId]: {
          collaborators: status === 'collaborate' ? current.collaborators + 1 : current.collaborators,
          requesters: status === 'request' ? current.requesters + 1 : current.requesters
        }
      };
    });

    return { success: true, error: null };
  };

  const getCountsForTask = (taskId: string): CollaboratorCounts => {
    return collaboratorCounts[taskId] || { collaborators: 0, requesters: 0 };
  };

  return {
    collaboratorCounts,
    loading,
    fetchCollaboratorCounts,
    fetchTaskCollaborators,
    addCollaborator,
    getCountsForTask,
  };
}
