import { useState, useEffect } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { MediaGallery } from '@/components/tags/MediaGallery';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHiddenCommunityTags, isVisibleItem } from '@/hooks/useHiddenCommunityFilter';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types';

interface ProfileMediaSectionProps {
  userId: string;
  onTaskClick: (task: Task) => void;
}

export function ProfileMediaSection({ userId, onTaskClick }: ProfileMediaSectionProps) {
  const { language } = useLanguage();
  const { hiddenTagIds, loading: loadingHidden } = useHiddenCommunityTags();
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loadingHidden) {
      fetchUserCompletedTasks();
    }
  }, [userId, loadingHidden]);

  const fetchUserCompletedTasks = async () => {
    setLoading(true);
    try {
      const [createdTasksRes, collabIdsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('created_by', userId)
          .eq('status', 'completed'),
        supabase
          .from('task_collaborators')
          .select('task_id')
          .eq('user_id', userId)
          .eq('approval_status', 'approved'),
      ]);

      const createdTasks = (createdTasksRes.data || []) as Task[];
      const collabIds = collabIdsRes.data || [];

      const collabTaskIds = collabIds?.map(c => c.task_id) || [];
      let collabTasks: Task[] = [];
      if (collabTaskIds.length > 0) {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .in('id', collabTaskIds)
          .eq('status', 'completed');
        collabTasks = (data || []) as Task[];
      }

      const allTasks = [...createdTasks];
      collabTasks.forEach(t => {
        if (!allTasks.find(at => at.id === t.id)) allTasks.push(t);
      });

      const allTaskIds = allTasks.map(task => task.id);
      const taskTagMap: Record<string, Array<{ id: string; category?: string | null }>> = {};

      if (allTaskIds.length > 0) {
        const { data: taskTags } = await supabase
          .from('task_tags')
          .select('task_id, tag:tags(id, category)')
          .in('task_id', allTaskIds);

        (taskTags || []).forEach((taskTag: any) => {
          if (!taskTagMap[taskTag.task_id]) taskTagMap[taskTag.task_id] = [];
          if (taskTag.tag) taskTagMap[taskTag.task_id].push(taskTag.tag);
        });
      }

      const visibleTasks = allTasks.filter(task => isVisibleItem(taskTagMap[task.id] || [], hiddenTagIds));

      setTasks(visibleTasks);
      setTaskIds(visibleTasks.map(task => task.id));
    } catch (error) {
      console.error('Error fetching user tasks for media:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
      >
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{language === 'pt' ? 'Mídias' : 'Media'}</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
    >
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">{language === 'pt' ? 'Mídias' : 'Media'}</h2>
      </div>
      <MediaGallery taskIds={taskIds} onTaskClick={onTaskClick} tasks={tasks} />
    </motion.div>
  );
}
