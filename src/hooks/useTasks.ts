import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, Tag, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Helper function to notify involved users
async function notifyInvolvedUsers(
  taskId: string,
  taskTitle: string,
  notificationType: string,
  message: string,
  excludeUserId?: string
) {
  // Get collaborators and requesters
  const { data: collaborators } = await supabase
    .from('task_collaborators')
    .select('user_id')
    .eq('task_id', taskId);

  const userIds = [...new Set(collaborators?.map(c => c.user_id) || [])];
  
  for (const userId of userIds) {
    if (userId !== excludeUserId) {
      try {
        await supabase.functions.invoke('create-notification', {
          body: {
            user_id: userId,
            type: notificationType,
            message: message,
            task_id: taskId
          }
        });
      } catch (err) {
        console.warn('Error sending notification:', err);
      }
    }
  }
}

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    
    const { data: tasksData, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
      return;
    }

    const taskIds = tasksData?.map(t => t.id) || [];
    const creatorIds = [...new Set(tasksData?.map(t => t.created_by) || [])];

    const [tagsResult, profilesResult] = await Promise.all([
      supabase
        .from('task_tags')
        .select('task_id, tag:tags(*)')
        .in('task_id', taskIds),
      supabase
        .from('public_profiles')
        .select('*')
        .in('id', creatorIds)
    ]);

    const tagsByTask: Record<string, Tag[]> = {};
    tagsResult.data?.forEach(tt => {
      if (!tagsByTask[tt.task_id]) tagsByTask[tt.task_id] = [];
      if (tt.tag) tagsByTask[tt.task_id].push(tt.tag as Tag);
    });

    const profilesMap: Record<string, Profile> = {};
    profilesResult.data?.forEach(p => {
      profilesMap[p.id] = p as Profile;
    });

    const enrichedTasks = tasksData?.map(task => ({
      ...task,
      tags: tagsByTask[task.id] || [],
      creator: profilesMap[task.created_by],
    })) as Task[];

    setTasks(enrichedTasks);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const createTask = async (
    title: string,
    description: string,
    taskType: 'offer' | 'request' | 'personal',
    tagIds: string[],
    deadline?: string,
    imageUrl?: string,
    priority?: 'low' | 'medium' | 'high' | null
  ) => {
    if (!user) return null;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        task_type: taskType,
        created_by: user.id,
        deadline: deadline || null,
        image_url: imageUrl || null,
        priority: priority || null,
      })
      .select()
      .single();

    if (error || !task) return null;

    if (tagIds.length > 0) {
      await supabase
        .from('task_tags')
        .insert(tagIds.map(tagId => ({
          task_id: task.id,
          tag_id: tagId,
        })));
    }

    await fetchTasks();
    return task as Task;
  };

  const updateTask = async (
    taskId: string,
    updates: Partial<Task>,
    tagIds?: string[]
  ) => {
    if (!user) return false;

    // Get old task data for history
    const { data: oldTask } = await supabase
      .from('tasks')
      .select('title, description')
      .eq('id', taskId)
      .single();

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) return false;

    if (tagIds !== undefined) {
      await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', taskId);

      if (tagIds.length > 0) {
        await supabase
          .from('task_tags')
          .insert(tagIds.map(tagId => ({
            task_id: taskId,
            tag_id: tagId,
          })));
      }
    }

    // Record history
    const changedFields: string[] = [];
    if (updates.title && oldTask?.title !== updates.title) {
      changedFields.push('title');
      await supabase.from('task_history').insert({
        task_id: taskId,
        user_id: user.id,
        action: 'updated',
        field_changed: 'title',
        old_value: oldTask?.title || null,
        new_value: updates.title
      });
    }
    if (updates.description !== undefined && oldTask?.description !== updates.description) {
      changedFields.push('description');
      await supabase.from('task_history').insert({
        task_id: taskId,
        user_id: user.id,
        action: 'updated',
        field_changed: 'description',
        old_value: oldTask?.description || null,
        new_value: updates.description || null
      });
    }

    // Notify involved users about the update
    const taskTitle = updates.title || oldTask?.title || 'Tarefa';
    await notifyInvolvedUsers(
      taskId,
      taskTitle,
      'task_updated',
      `A tarefa "${taskTitle}" foi atualizada.`,
      user.id
    );

    await fetchTasks();
    return true;
  };

  const completeTask = async (taskId: string, proofUrl: string, proofType: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completion_proof_url: proofUrl,
        completion_proof_type: proofType,
      })
      .eq('id', taskId);

    if (error) return { success: false, txHash: null };

    // Get task details for notifications
    const { data: taskData } = await supabase
      .from('tasks')
      .select('title, task_type, created_by')
      .eq('id', taskId)
      .single();

    // Notify all involved users to rate (for non-personal tasks)
    if (taskData && taskData.task_type !== 'personal') {
      // Get all collaborators and requesters
      const { data: allCollaborators } = await supabase
        .from('task_collaborators')
        .select('user_id, status, approval_status')
        .eq('task_id', taskId)
        .eq('approval_status', 'approved');

      if (allCollaborators && allCollaborators.length > 0) {
        for (const collab of allCollaborators) {
          try {
            await supabase.functions.invoke('create-notification', {
              body: {
                user_id: collab.user_id,
                type: 'rate_request',
                message: `A tarefa "${taskData.title}" foi concluída! Avalie os participantes.`,
                task_id: taskId
              }
            });
          } catch (err) {
            console.warn('Error sending rating notification:', err);
          }
        }
      }

      // Also notify the task creator
      try {
        await supabase.functions.invoke('create-notification', {
          body: {
            user_id: taskData.created_by,
            type: 'task_completed',
            message: `Sua tarefa "${taskData.title}" foi concluída! Avalie os colaboradores.`,
            task_id: taskId
          }
        });
      } catch (err) {
        console.warn('Error sending completion notification to owner:', err);
      }
    }

    // Register on Scroll blockchain
    let txHash = null;
    try {
      const { data, error: fnError } = await supabase.functions.invoke('register-task-completion', {
        body: { taskId, proofUrl, userId: user?.id }
      });
      
      if (!fnError && data?.txHash) {
        txHash = data.txHash;
        console.log('Task registered on blockchain:', txHash);
      } else {
        console.warn('Blockchain registration failed:', fnError || data?.error);
      }
    } catch (err) {
      console.warn('Blockchain registration error:', err);
    }

    await fetchTasks();
    return { success: true, txHash };
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return false;

    // Get task info and involved users before deletion
    const { data: taskData } = await supabase
      .from('tasks')
      .select('title, created_by')
      .eq('id', taskId)
      .single();

    if (!taskData) return false;

    // Notify involved users before deletion
    await notifyInvolvedUsers(
      taskId,
      taskData.title,
      'task_deleted',
      `A tarefa "${taskData.title}" foi excluída pelo criador.`,
      user.id
    );

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (!error) {
      await fetchTasks();
      return true;
    }
    return false;
  };

  const getRecommendedTasks = (userTagIds: string[]) => {
    if (userTagIds.length === 0) return tasks.filter(t => t.status !== 'completed');
    
    return tasks
      .filter(t => t.status !== 'completed' && t.created_by !== user?.id)
      .filter(task => {
        const taskTagIds = task.tags?.map(t => t.id) || [];
        return taskTagIds.some(id => userTagIds.includes(id));
      })
      .sort((a, b) => {
        // First priority: high priority tasks come first
        const priorityOrder = { high: 3, medium: 2, low: 1, null: 0 };
        const aPriority = priorityOrder[a.priority || 'null'] || 0;
        const bPriority = priorityOrder[b.priority || 'null'] || 0;
        if (bPriority !== aPriority) return bPriority - aPriority;
        
        // Then sort by upvotes (more upvotes = higher priority)
        const aScore = (a.upvotes || 0) - (a.downvotes || 0);
        const bScore = (b.upvotes || 0) - (b.downvotes || 0);
        if (bScore !== aScore) return bScore - aScore;
        
        // Then by tag matches
        const aMatches = (a.tags?.filter(t => userTagIds.includes(t.id)) || []).length;
        const bMatches = (b.tags?.filter(t => userTagIds.includes(t.id)) || []).length;
        return bMatches - aMatches;
      });
  };

  const getFollowingTasks = (followingIds: string[]) => {
    if (followingIds.length === 0) return [];
    
    return tasks
      .filter(t => t.status !== 'completed' && followingIds.includes(t.created_by))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const getUserTasks = () => {
    return tasks.filter(t => t.created_by === user?.id);
  };

  const getCompletedUserTasks = () => {
    return tasks.filter(t => t.created_by === user?.id && t.status === 'completed');
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    getRecommendedTasks,
    getFollowingTasks,
    getUserTasks,
    getCompletedUserTasks,
    refreshTasks: fetchTasks,
  };
}
