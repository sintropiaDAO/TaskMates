import { motion } from 'framer-motion';
import { Activity, ListTodo, CheckCircle, Award } from 'lucide-react';
import { StarRating } from '@/components/ui/star-rating';
import { useReputation } from '@/hooks/useReputation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Task } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_completed' | 'collaboration' | 'follow';
  description: string;
  taskTitle?: string;
  created_at: string;
  taskId?: string;
}

interface ProfileStatsSectionProps {
  userId: string;
  taskStats: { created: number; completed: number };
  activities: ActivityItem[];
  onTaskClick: (task: Task) => void;
}

export function ProfileStatsSection({
  userId,
  taskStats,
  activities,
  onTaskClick,
}: ProfileStatsSectionProps) {
  const { t, language } = useLanguage();
  const { averageRating, totalRatings, loading: reputationLoading } = useReputation(userId);
  const dateLocale = language === 'pt' ? pt : enUS;

  const handleActivityClick = async (activity: ActivityItem) => {
    if (activity.taskId) {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', activity.taskId)
        .single();
      if (data) {
        onTaskClick(data as Task);
      }
    }
  };

  // Extract task title from description for highlighting
  const extractTaskTitle = (description: string): { prefix: string; title: string } | null => {
    const match = description.match(/^(.+?):\s*"(.+)"$/);
    if (match) {
      return { prefix: match[1], title: match[2] };
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft space-y-6"
    >
      {/* Reputation */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold">{t('reputation')}</h2>
        </div>
        
        {reputationLoading ? (
          <div className="animate-pulse h-16 bg-muted rounded-xl" />
        ) : (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <StarRating rating={averageRating} size="lg" />
                <p className="text-2xl font-bold mt-1">
                  {averageRating > 0 ? averageRating.toFixed(1) : '-'}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>{totalRatings} {t('ratingsReceived')}</p>
                {totalRatings === 0 && (
                  <p className="text-xs mt-1">{t('noRatingsYet')}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Statistics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ListTodo className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('taskStatistics')}</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/5 rounded-xl p-4 flex items-center gap-3 border border-primary/10">
            <div className="bg-primary/10 p-2 rounded-lg">
              <ListTodo className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{taskStats.created}</p>
              <p className="text-sm text-muted-foreground">{t('tasksCreated')}</p>
            </div>
          </div>
          <div className="bg-green-500/5 rounded-xl p-4 flex items-center gap-3 border border-green-500/10">
            <div className="bg-green-500/10 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{taskStats.completed}</p>
              <p className="text-sm text-muted-foreground">{t('tasksCompleted')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {activities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('recentActivity')}</h2>
          </div>
          
          <div className="space-y-2">
            {activities.map(activity => {
              const extracted = extractTaskTitle(activity.description);
              
              return (
                <div 
                  key={activity.id}
                  className={`bg-muted/30 rounded-lg p-3 text-sm border border-border/30 ${activity.taskId ? 'cursor-pointer hover:bg-muted/50 hover:border-primary/20 transition-all' : ''}`}
                  onClick={() => handleActivityClick(activity)}
                >
                  {extracted ? (
                    <p className="text-foreground">
                      {extracted.prefix}: <span className="font-semibold text-primary">"{extracted.title}"</span>
                    </p>
                  ) : (
                    <p className="text-foreground">{activity.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { 
                      addSuffix: true,
                      locale: dateLocale
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
