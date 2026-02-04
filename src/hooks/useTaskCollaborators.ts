import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskCollaborator, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface CollaboratorCounts {
  collaborators: number;
  requesters: number;
}

interface UserInterest {
  hasCollaborated: boolean;
  hasRequested: boolean;
  collaborateId: string | null;
  requestId: string | null;
}

export function useTaskCollaborators() {
  const { user } = useAuth();
  const [collaboratorCounts, setCollaboratorCounts] = useState<Record<string, CollaboratorCounts>>({});
  const [userInterests, setUserInterests] = useState<Record<string, UserInterest>>({});
  const [loading, setLoading] = useState(false);

  const fetchCollaboratorCounts = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('task_collaborators')
      .select('id, task_id, user_id, status, approval_status')
      .in('task_id', taskIds);
    
    if (error) {
      console.error('Error fetching collaborator counts:', error);
      setLoading(false);
      return;
    }

    const counts: Record<string, CollaboratorCounts> = {};
    const interests: Record<string, UserInterest> = {};
    
    taskIds.forEach(id => {
      counts[id] = { collaborators: 0, requesters: 0 };
      interests[id] = { hasCollaborated: false, hasRequested: false, collaborateId: null, requestId: null };
    });

    data?.forEach(collab => {
      if (!counts[collab.task_id]) {
        counts[collab.task_id] = { collaborators: 0, requesters: 0 };
      }
      if (!interests[collab.task_id]) {
        interests[collab.task_id] = { hasCollaborated: false, hasRequested: false, collaborateId: null, requestId: null };
      }
      
      // Only count non-rejected collaborators
      if (collab.approval_status !== 'rejected') {
        if (collab.status === 'collaborate') {
          counts[collab.task_id].collaborators++;
        } else if (collab.status === 'request') {
          counts[collab.task_id].requesters++;
        }
      }
      
      // Track current user's interests
      if (user && collab.user_id === user.id) {
        if (collab.status === 'collaborate') {
          interests[collab.task_id].hasCollaborated = true;
          interests[collab.task_id].collaborateId = collab.id;
        } else if (collab.status === 'request') {
          interests[collab.task_id].hasRequested = true;
          interests[collab.task_id].requestId = collab.id;
        }
      }
    });

    setCollaboratorCounts(counts);
    setUserInterests(interests);
    setLoading(false);
  }, [user]);

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
        // Now this means they already have this specific status (collaborate or request)
        return { success: false, error: 'already_exists_same_status' };
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

  const approveCollaborator = async (collaboratorId: string, taskId: string, userId: string, taskTitle: string, taskOwnerId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('task_collaborators')
      .update({ approval_status: 'approved' })
      .eq('id', collaboratorId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Create or update task chat with all approved participants
    try {
      // Get all approved collaborators for this task
      const { data: approvedCollabs } = await supabase
        .from('task_collaborators')
        .select('user_id')
        .eq('task_id', taskId)
        .eq('approval_status', 'approved');

      const participantIds = [taskOwnerId, ...(approvedCollabs?.map(c => c.user_id) || [])];
      const uniqueParticipantIds = [...new Set(participantIds)];

      // Check if task conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('task_id', taskId)
        .eq('type', 'task')
        .single();

      if (existingConv) {
        // Add new participant if not already in conversation
        const { data: existingParticipant } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', existingConv.id)
          .eq('user_id', userId)
          .single();

        if (!existingParticipant) {
          await supabase
            .from('conversation_participants')
            .insert({ conversation_id: existingConv.id, user_id: userId });
        }
      } else if (uniqueParticipantIds.length >= 2) {
        // Create new task conversation
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ type: 'task', task_id: taskId })
          .select()
          .single();

        if (newConv) {
          await supabase
            .from('conversation_participants')
            .insert(uniqueParticipantIds.map(uid => ({
              conversation_id: newConv.id,
              user_id: uid
            })));
        }
      }
    } catch (chatError) {
      console.warn('Failed to create/update task chat:', chatError);
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

  const getUserInterestForTask = (taskId: string): UserInterest => {
    return userInterests[taskId] || { hasCollaborated: false, hasRequested: false, collaborateId: null, requestId: null };
  };

  const cancelInterest = async (taskId: string, status: 'collaborate' | 'request') => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const interest = userInterests[taskId];
    if (!interest) return { success: false, error: 'No interest found' };

    const collaboratorId = status === 'collaborate' ? interest.collaborateId : interest.requestId;
    if (!collaboratorId) return { success: false, error: 'No interest ID found' };

    const { error } = await supabase
      .from('task_collaborators')
      .delete()
      .eq('id', collaboratorId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Update local state
    setUserInterests(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        hasCollaborated: status === 'collaborate' ? false : prev[taskId]?.hasCollaborated || false,
        hasRequested: status === 'request' ? false : prev[taskId]?.hasRequested || false,
        collaborateId: status === 'collaborate' ? null : prev[taskId]?.collaborateId || null,
        requestId: status === 'request' ? null : prev[taskId]?.requestId || null,
      }
    }));

    // Update local counts
    setCollaboratorCounts(prev => {
      const current = prev[taskId] || { collaborators: 0, requesters: 0 };
      return {
        ...prev,
        [taskId]: {
          collaborators: status === 'collaborate' ? Math.max(0, current.collaborators - 1) : current.collaborators,
          requesters: status === 'request' ? Math.max(0, current.requesters - 1) : current.requesters
        }
      };
    });

    return { success: true, error: null };
  };

  return {
    collaboratorCounts,
    userInterests,
    loading,
    fetchCollaboratorCounts,
    fetchTaskCollaborators,
    addCollaborator,
    approveCollaborator,
    rejectCollaborator,
    updateTaskSettings,
    getCountsForTask,
    getUserInterestForTask,
    cancelInterest,
  };
}
