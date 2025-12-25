import { useState, useCallback } from 'react';
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
      .select('task_id, status, approval_status')
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
      // Only count non-rejected collaborators
      if (collab.approval_status !== 'rejected') {
        if (collab.status === 'collaborate') {
          counts[collab.task_id].collaborators++;
        } else if (collab.status === 'request') {
          counts[collab.task_id].requesters++;
        }
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
      approval_status: c.approval_status || 'pending',
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
        approval_status: 'pending',
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'already_exists' };
      }
      return { success: false, error: error.message };
    }

    // Get current user's name for the notification
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = currentProfile?.full_name || 'Alguém';

    // Create notification for task owner using edge function
    try {
      const notificationType = status === 'collaborate' ? 'collaboration' : 'collaboration_request';
      const message = status === 'collaborate' 
        ? `${userName} quer colaborar na sua tarefa: "${taskTitle}"`
        : `${userName} solicitou ajuda na tarefa: "${taskTitle}"`;

      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: taskOwnerId,
          task_id: taskId,
          type: notificationType,
          message
        }
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

  const approveCollaborator = async (collaboratorId: string, taskId: string, userId: string, taskTitle: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('task_collaborators')
      .update({ approval_status: 'approved' })
      .eq('id', collaboratorId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Create notification for the collaborator
    try {
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: userId,
          task_id: taskId,
          type: 'collaboration_approved',
          message: `Sua solicitação foi aprovada na tarefa: "${taskTitle}"`
        }
      });
    } catch (notifError) {
      console.warn('Failed to create notification:', notifError);
    }

    return { success: true, error: null };
  };

  const rejectCollaborator = async (collaboratorId: string, taskId: string, userId: string, taskTitle: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    // Delete the collaborator entry
    const { error } = await supabase
      .from('task_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Update local counts
    setCollaboratorCounts(prev => {
      const current = prev[taskId] || { collaborators: 0, requesters: 0 };
      return {
        ...prev,
        [taskId]: {
          collaborators: Math.max(0, current.collaborators - 1),
          requesters: Math.max(0, current.requesters - 1)
        }
      };
    });

    // Create notification for the collaborator
    try {
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: userId,
          task_id: taskId,
          type: 'collaboration_rejected',
          message: `Sua solicitação foi recusada na tarefa: "${taskTitle}"`
        }
      });
    } catch (notifError) {
      console.warn('Failed to create notification:', notifError);
    }

    return { success: true, error: null };
  };

  const updateTaskSettings = async (taskId: string, settings: { allow_collaboration?: boolean; allow_requests?: boolean }) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('tasks')
      .update(settings)
      .eq('id', taskId)
      .eq('created_by', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

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
    approveCollaborator,
    rejectCollaborator,
    updateTaskSettings,
    getCountsForTask,
  };
}
