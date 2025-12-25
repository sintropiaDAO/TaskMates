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

      // Get completed tasks where user is a collaborator or requester
      const { data: userCollaborations } = await supabase
        .from('task_collaborators')
        .select('task_id, status')
        .eq('user_id', user.id);

      if (!userCollaborations || userCollaborations.length === 0) {
        setLoading(false);
        return;
      }

      const taskIds = userCollaborations.map(c => c.task_id);

      // Get completed non-personal tasks
      const { data: completedTasks } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds)
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

      // For each completed task, find users to rate
      for (const task of completedTasks) {
        const userCollab = userCollaborations.find(c => c.task_id === task.id);
        if (!userCollab) continue;

        const usersToRate: PendingRatingTask['usersToRate'] = [];

        // Get all collaborators for this task
        const { data: allCollaborators } = await supabase
          .from('task_collaborators')
          .select('user_id, status')
          .eq('task_id', task.id);

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

        // If user is a requester, they can rate collaborators
        if (userCollab.status === 'request') {
          const collaborators = allCollaborators?.filter(c => c.status === 'collaborate' && c.user_id !== user.id) || [];
          for (const collab of collaborators) {
            if (!ratedMap.has(`${task.id}-${collab.user_id}`)) {
              const profile = profileMap.get(collab.user_id);
              usersToRate.push({
                userId: collab.user_id,
                userName: profile?.full_name || 'Usuário',
                avatarUrl: profile?.avatar_url || null,
                role: 'collaborator'
              });
            }
          }
        }

        // If user is a collaborator, they can rate requesters and owner
        if (userCollab.status === 'collaborate') {
          // Rate requesters
          const requesters = allCollaborators?.filter(c => c.status === 'request' && c.user_id !== user.id) || [];
          for (const req of requesters) {
            if (!ratedMap.has(`${task.id}-${req.user_id}`)) {
              const profile = profileMap.get(req.user_id);
              usersToRate.push({
                userId: req.user_id,
                userName: profile?.full_name || 'Usuário',
                avatarUrl: profile?.avatar_url || null,
                role: 'requester'
              });
            }
          }

          // Rate task owner
          if (task.created_by !== user.id && !ratedMap.has(`${task.id}-${task.created_by}`)) {
            const ownerProfile = profileMap.get(task.created_by);
            usersToRate.push({
              userId: task.created_by,
              userName: ownerProfile?.full_name || 'Usuário',
              avatarUrl: ownerProfile?.avatar_url || null,
              role: 'owner'
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