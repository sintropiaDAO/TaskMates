import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, Tag, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { createNotification } from '@/lib/create-notification.functions';
import { registerTaskCompletion } from '@/lib/register-task-completion.functions';
import { rollLuckyStar } from '@/lib/roll-lucky-star.functions';

// Convert 'YYYY-MM-DD' (date-only) inputs to a local-noon ISO timestamp so the
// stored timestamptz always resolves back to the calendar date the user picked,
// regardless of timezone. Pass-through for other formats and empty values.
function normalizeDeadlineInput(deadline?: string | null): string | null {
  if (!deadline) return null;
  const s = String(deadline).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0).toISOString();
  }
  return s;
}

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
        await createNotification({
          data: {
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

/**
 * Standalone task completion. Shared by useTasks().completeTask and by
 * CreateTaskModal's built-in "mark as completed" flow, so completion behaves
 * identically no matter which screen opened the modal.
 */
export async function completeTaskById(
  taskId: string,
  proofUrl: string,
  proofType: string,
  userId?: string,
): Promise<{ success: boolean; txHash: string | null; wonStar: boolean }> {
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completion_proof_url: proofUrl,
      completion_proof_type: proofType,
    })
    .eq('id', taskId);

  if (error) return { success: false, txHash: null, wonStar: false };

  // Fire celebration overlay exactly once per successful completion
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('taskmates:task-completed'));
  }

  const { data: taskData } = await supabase
    .from('tasks')
    .select('title, task_type, created_by')
    .eq('id', taskId)
    .single();

  if (userId) {
    try {
      await supabase.rpc('award_task_completed' as any, { _task_id: taskId } as any);
    } catch (err) {
      console.warn('Error recording task coin:', err);
    }
  }

  if (taskData && taskData.task_type !== 'personal') {
    const { data: allCollaborators } = await supabase
      .from('task_collaborators')
      .select('user_id, status, approval_status')
      .eq('task_id', taskId)
      .eq('approval_status', 'approved');

    for (const collab of allCollaborators || []) {
      try {
        await createNotification({
          data: {
            user_id: collab.user_id,
            type: 'rate_request',
            message: `A tarefa "${taskData.title}" foi concluída! Avalie os participantes.`,
            task_id: taskId,
          },
        });
      } catch (err) {
        console.warn('Error sending rating notification:', err);
      }
    }

    try {
      await createNotification({
        data: {
          user_id: taskData.created_by,
          type: 'task_completed',
          message: `Sua tarefa "${taskData.title}" foi concluída! Avalie os colaboradores.`,
          task_id: taskId,
        },
      });
    } catch (err) {
      console.warn('Error sending completion notification to owner:', err);
    }
  }

  // Register on Scroll blockchain
  let txHash: string | null = null;
  try {
    const data = await registerTaskCompletion({ data: { taskId, proofUrl } });
    if (data?.txHash) txHash = data.txHash;
  } catch (err) {
    console.warn('Blockchain registration error:', err);
  }

  // Roll lucky star
  let wonStar = false;
  try {
    const starData = await rollLuckyStar({ data: { taskId } });
    if (starData?.won) wonStar = true;
  } catch (err) {
    console.warn('Lucky star roll error:', err);
  }

  return { success: true, txHash, wonStar };
}

export interface CreateTaskInput {
  title: string;
  description: string;
  taskType: 'offer' | 'request' | 'personal';
  tagIds: string[];
  deadline?: string;
  imageUrl?: string;
  priority?: 'low' | 'medium' | 'high' | null;
  location?: string;
  parentTaskId?: string;
}

/** Standalone task creation (insert + tags + history). Shared by the hook and the create-modal host. */
export async function createTaskRecord(userId: string | undefined, input: CreateTaskInput): Promise<Task | null> {
  if (!userId) return null;

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description,
      task_type: input.taskType,
      created_by: userId,
      deadline: normalizeDeadlineInput(input.deadline),
      image_url: input.imageUrl || null,
      priority: input.priority || null,
      location: input.location || null,
      parent_task_id: input.parentTaskId || null,
    })
    .select()
    .single();

  if (error || !task) return null;

  if (input.tagIds.length > 0) {
    await supabase
      .from('task_tags')
      .insert(input.tagIds.map(tagId => ({ task_id: task.id, tag_id: tagId })));
  }

  await supabase.from('task_history').insert({
    task_id: task.id,
    user_id: userId,
    action: 'created',
    field_changed: null,
    old_value: null,
    new_value: input.imageUrl || null,
  });

  return task as Task;
}

/** Standalone task update (update + tags + history + notifications). */
export async function updateTaskRecord(
  userId: string | undefined,
  taskId: string,
  updates: Partial<Task>,
  tagIds?: string[],
): Promise<boolean> {
  if (!userId) return false;

  const { data: oldTask } = await supabase
    .from('tasks')
    .select('title, description, image_url, deadline, priority, location')
    .eq('id', taskId)
    .single();

  const normalizedUpdates: any = { ...updates };
  if ('deadline' in normalizedUpdates) {
    normalizedUpdates.deadline = normalizeDeadlineInput(normalizedUpdates.deadline);
  }

  const { error } = await supabase.from('tasks').update(normalizedUpdates).eq('id', taskId);
  if (error) return false;

  if (tagIds !== undefined) {
    await supabase.from('task_tags').delete().eq('task_id', taskId);
    if (tagIds.length > 0) {
      await supabase.from('task_tags').insert(tagIds.map(tagId => ({ task_id: taskId, tag_id: tagId })));
    }
  }

  const norm = (v: any): string => {
    if (v === null || v === undefined || v === '') return '';
    return String(v).trim();
  };
  const normDate = (v: any): string => {
    if (!v) return '';
    try { return new Date(v).toISOString().split('T')[0]; } catch { return norm(v); }
  };

  const historyEntries: { field: string; oldVal: string | null; newVal: string | null; compare?: (a: any, b: any) => boolean }[] = [
    { field: 'title', oldVal: oldTask?.title ?? null, newVal: (updates.title as string) ?? null },
    { field: 'description', oldVal: oldTask?.description ?? null, newVal: (updates.description as string) ?? null },
    { field: 'image_url', oldVal: oldTask?.image_url ?? null, newVal: (updates.image_url as string) ?? null },
    { field: 'deadline', oldVal: oldTask?.deadline ?? null, newVal: (updates.deadline as string) ?? null, compare: (a, b) => normDate(a) === normDate(b) },
    { field: 'priority', oldVal: oldTask?.priority ?? null, newVal: (updates.priority as string) ?? null },
    { field: 'location', oldVal: oldTask?.location ?? null, newVal: (updates.location as string) ?? null },
  ];

  for (const entry of historyEntries) {
    if (updates[entry.field as keyof typeof updates] === undefined) continue;
    const isEqual = entry.compare
      ? entry.compare(entry.oldVal, entry.newVal)
      : norm(entry.oldVal) === norm(entry.newVal);
    if (!isEqual) {
      await supabase.from('task_history').insert({
        task_id: taskId, user_id: userId, action: 'updated',
        field_changed: entry.field,
        old_value: entry.oldVal || null,
        new_value: entry.newVal || null,
      });
    }
  }

  const taskTitle = updates.title || oldTask?.title || 'Tarefa';
  await notifyInvolvedUsers(taskId, taskTitle, 'task_updated', `A tarefa "${taskTitle}" foi atualizada.`, userId);

  return true;
}

export function useTasks() {


  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collaboratingTaskIds, setCollaboratingTaskIds] = useState<Set<string>>(new Set());
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

    // Fetch tasks where current user is an approved collaborator
    let userCollaboratingIds = new Set<string>();
    if (user) {
      const { data: collaborations } = await supabase
        .from('task_collaborators')
        .select('task_id')
        .eq('user_id', user.id)
        .eq('approval_status', 'approved');
      
      if (collaborations) {
        userCollaboratingIds = new Set(collaborations.map(c => c.task_id));
      }
    }
    setCollaboratingTaskIds(userCollaboratingIds);

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
      if (p.id) profilesMap[p.id] = p as unknown as Profile;
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
  }, [user?.id]);

  const createTask = async (
    title: string,
    description: string,
    taskType: 'offer' | 'request' | 'personal',
    tagIds: string[],
    deadline?: string,
    imageUrl?: string,
    priority?: 'low' | 'medium' | 'high' | null,
    location?: string,
    parentTaskId?: string
  ) => {
    const task = await createTaskRecord(user?.id, { title, description, taskType, tagIds, deadline, imageUrl, priority, location, parentTaskId });
    if (task) await fetchTasks();
    return task;
  };

  const updateTask = async (
    taskId: string,
    updates: Partial<Task>,
    tagIds?: string[]
  ) => {
    const ok = await updateTaskRecord(user?.id, taskId, updates, tagIds);
    if (ok) await fetchTasks();
    return ok;
  };


  const completeTask = async (taskId: string, proofUrl: string, proofType: string) => {
    const result = await completeTaskById(taskId, proofUrl, proofType, user?.id);
    if (result.success) await fetchTasks();
    return result;
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
        const priorityOrder = { high: 3, medium: 2, low: 1, null: 0 };
        const aPriority = priorityOrder[a.priority || 'null'] || 0;
        const bPriority = priorityOrder[b.priority || 'null'] || 0;
        if (bPriority !== aPriority) return bPriority - aPriority;
        
        const aScore = (a.upvotes || 0) - (a.downvotes || 0);
        const bScore = (b.upvotes || 0) - (b.downvotes || 0);
        if (bScore !== aScore) return bScore - aScore;
        
        const aMatches = (a.tags?.filter(t => userTagIds.includes(t.id)) || []).length;
        const bMatches = (b.tags?.filter(t => userTagIds.includes(t.id)) || []).length;
        return bMatches - aMatches;
      });
  };

  /**
   * Enhanced recommendation with reasons.
   * Combines: direct tag match, correlated tags, and following.
   */
  const getRecommendedTasksWithReasons = (
    userTagIds: string[],
    correlatedTagIds: string[],
    followingIds: string[]
  ): { task: Task; reasons: string[] }[] => {
    const candidateTasks = tasks.filter(t => t.status !== 'completed');
    const seen = new Set<string>();
    const results: { task: Task; reasons: string[]; score: number }[] = [];

    for (const task of candidateTasks) {
      const taskTagIds = task.tags?.map(t => t.id) || [];
      const reasons: string[] = [];
      let score = 0;

      // Direct tag match
      const directMatches = taskTagIds.filter(id => userTagIds.includes(id)).length;
      if (directMatches > 0) {
        reasons.push('tags');
        score += directMatches * 3;
      }

      // Correlated tag match
      const correlatedMatches = taskTagIds.filter(id => correlatedTagIds.includes(id) && !userTagIds.includes(id)).length;
      if (correlatedMatches > 0) {
        reasons.push('correlated');
        score += correlatedMatches * 1.5;
      }

      // Following
      if (followingIds.includes(task.created_by)) {
        reasons.push('following');
        score += 2;
      }

      // Own cards are always shown to their creator
      const isOwn = !!user?.id && task.created_by === user.id;
      if (isOwn) {
        reasons.push('own');
        score += 1;
      }

      if (reasons.length === 0) continue;

      // Priority boost
      const priorityOrder: Record<string, number> = { high: 6, medium: 3, low: 1 };
      score += priorityOrder[task.priority || ''] || 0;

      // Vote score boost
      score += ((task.upvotes || 0) - (task.downvotes || 0)) * 0.5;

      results.push({ task, reasons, score });
      seen.add(task.id);
    }

    return results
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.task.created_at).getTime() - new Date(a.task.created_at).getTime();
      });
  };

  const getFollowingTasks = (followingIds: string[]) => {
    if (followingIds.length === 0) return [];
    
    return tasks
      .filter(t => t.status !== 'completed' && followingIds.includes(t.created_by))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const getUserTasks = () => {
    // Include tasks created by user OR tasks where user is an approved collaborator (not completed)
    return tasks.filter(t => 
      t.status !== 'completed' && (
        t.created_by === user?.id || 
        collaboratingTaskIds.has(t.id)
      )
    );
  };

  const getCompletedUserTasks = () => {
    // Include completed tasks created by user OR completed tasks where user is an approved collaborator
    return tasks.filter(t => 
      t.status === 'completed' && (
        t.created_by === user?.id || 
        collaboratingTaskIds.has(t.id)
      )
    );
  };

  const getNearbyTasks = (userLocation: string | null) => {
    if (!userLocation) return [];
    
    // Extract city from location (format: "City, ST")
    const userCity = userLocation.split(',')[0].trim().toLowerCase();
    
    return tasks
      .filter(t => 
        t.status !== 'completed' && 
        t.location
      )
      .filter(task => {
        const taskCity = (task.location || '').split(',')[0].trim().toLowerCase();
        return taskCity === userCity;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const getNearbyPeople = (userLocation: string | null) => {
    if (!userLocation) return [];
    
    // Extract city from location
    const userCity = userLocation.split(',')[0].trim().toLowerCase();
    
    // Get unique creator IDs from nearby tasks
    const nearbyCreatorIds = new Set<string>();
    tasks.forEach(task => {
      if (
        task.creator?.location && 
        task.created_by !== user?.id
      ) {
        const creatorCity = (task.creator.location || '').split(',')[0].trim().toLowerCase();
        if (creatorCity === userCity) {
          nearbyCreatorIds.add(task.created_by);
        }
      }
    });
    
    return Array.from(nearbyCreatorIds);
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    getRecommendedTasks,
    getRecommendedTasksWithReasons,
    getFollowingTasks,
    getUserTasks,
    getCompletedUserTasks,
    getNearbyTasks,
    getNearbyPeople,
    refreshTasks: fetchTasks,
  };
}
