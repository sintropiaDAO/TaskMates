import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Task, Profile } from '@/types';

interface PendingRatingTask {
  task: Task;
  usersToRate: {
    userId: string;
    userName: string;
    avatarUrl: string | null;
    role: 'collaborator' | 'requester' | 'owner';
  }[];
}

export function usePendingRatings() {
  const { user } = useAuth();
  const [pendingRatings, setPendingRatings] = useState<PendingRatingTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPendingRatings = async () => {
      setLoading(true);
      const pendingTasks: PendingRatingTask[] = [];

      // Get completed tasks where user is a collaborator, requester, or owner
      const { data: userCollaborations } = await supabase
        .from('task_collaborators')
        .select('task_id, status, approval_status')
        .eq('user_id', user.id)
        .eq('approval_status', 'approved');

      // Also get tasks created by user
      const { data: ownedTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('created_by', user.id)
        .eq('status', 'completed')
        .neq('task_type', 'personal');

      const ownedTaskIds = ownedTasks?.map(t => t.id) || [];
      const collaboratedTaskIds = userCollaborations?.map(c => c.task_id) || [];
      const allTaskIds = [...new Set([...ownedTaskIds, ...collaboratedTaskIds])];

      if (allTaskIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get completed non-personal tasks
      const { data: completedTasks } = await supabase
        .from('tasks')
        .select('*')
        .in('id', allTaskIds)
        .eq('status', 'completed')
        .neq('task_type', 'personal');

      if (!completedTasks || completedTasks.length === 0) {
        setLoading(false);
        return;
      }

      // Get user's existing ratings
      const { data: existingRatings } = await supabase
        .from('task_ratings')
        .select('task_id, rated_user_id')
        .eq('rater_user_id', user.id)
        .in('task_id', completedTasks.map(t => t.id));

      const ratedMap = new Set(
        existingRatings?.map(r => `${r.task_id}-${r.rated_user_id}`) || []
      );

      // For each completed task, find users to rate (mutual ratings for all participants)
      for (const task of completedTasks) {
        const isOwner = task.created_by === user.id;
        const userCollab = userCollaborations?.find(c => c.task_id === task.id);
        
        // User must be either the owner or an approved collaborator
        if (!isOwner && !userCollab) continue;

        const usersToRate: PendingRatingTask['usersToRate'] = [];

        // Get all approved collaborators for this task
        const { data: allCollaborators } = await supabase
          .from('task_collaborators')
          .select('user_id, status, approval_status')
          .eq('task_id', task.id)
          .eq('approval_status', 'approved');

        // Get profiles for all users involved
        const userIds = [
          task.created_by,
          ...(allCollaborators?.map(c => c.user_id) || [])
        ].filter(id => id !== user.id);

        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('*')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // If user is NOT the owner, they can rate the owner
        if (!isOwner && !ratedMap.has(`${task.id}-${task.created_by}`)) {
          const ownerProfile = profileMap.get(task.created_by);
          usersToRate.push({
            userId: task.created_by,
            userName: ownerProfile?.full_name || 'Usuário',
            avatarUrl: ownerProfile?.avatar_url || null,
            role: 'owner'
          });
        }

        // Rate all other collaborators (both collaborators and requesters)
        for (const collab of allCollaborators || []) {
          if (collab.user_id !== user.id && !ratedMap.has(`${task.id}-${collab.user_id}`)) {
            const profile = profileMap.get(collab.user_id);
            usersToRate.push({
              userId: collab.user_id,
              userName: profile?.full_name || 'Usuário',
              avatarUrl: profile?.avatar_url || null,
              role: collab.status === 'collaborate' ? 'collaborator' : 'requester'
            });
          }
        }

        if (usersToRate.length > 0) {
          // Fetch creator profile for task
          const { data: creatorProfile } = await supabase
            .from('public_profiles')
            .select('*')
            .eq('id', task.created_by)
            .single();

          pendingTasks.push({
            task: {
              ...task,
              creator: creatorProfile as Profile
            } as Task,
            usersToRate
          });
        }
      }

      setPendingRatings(pendingTasks);
      setLoading(false);
    };

    fetchPendingRatings();
  }, [user]);

  const refetch = () => {
    if (user) {
      setLoading(true);
      // Re-trigger effect
      setPendingRatings([]);
    }
  };

  return { pendingRatings, loading, refetch };
}