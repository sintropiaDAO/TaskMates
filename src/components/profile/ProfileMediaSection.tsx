import { useState, useEffect } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { MediaGallery } from '@/components/tags/MediaGallery';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types';

interface ProfileMediaSectionProps {
  userId: string;
  onTaskClick: (task: Task) => void;
}

export function ProfileMediaSection({ userId, onTaskClick }: ProfileMediaSectionProps) {
  const { language } = useLanguage();
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserCompletedTasks();
  }, [userId]);

  const fetchUserCompletedTasks = async () => {
    setLoading(true);
    try {
      // Tasks created by user that are completed
      const { data: createdTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('created_by', userId)
        .eq('status', 'completed');

      // Tasks where user is approved collaborator that are completed
      const { data: collabIds } = await supabase
        .from('task_collaborators')
        .select('task_id')
        .eq('user_id', userId)
        .eq('approval_status', 'approved');

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

      const allTasks = [...(createdTasks || []) as Task[]];
      collabTasks.forEach(t => {
        if (!allTasks.find(at => at.id === t.id)) allTasks.push(t);
      });

      setTasks(allTasks);
      setTaskIds(allTasks.map(t => t.id));
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
