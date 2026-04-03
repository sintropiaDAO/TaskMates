import { useState, useEffect } from 'react';
import { Activity, EyeOff, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHiddenCommunityTags, isVisibleItem } from '@/hooks/useHiddenCommunityFilter';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface RecentActivitySectionProps {
  userId: string;
  isOwnProfile: boolean;
  onHide?: () => void;
  onTaskClick?: (taskId: string) => void;
  showHeader?: boolean;
}

export interface ActivityItem {
  id: string;
  entityId: string;
  entityType: 'task';
  type: 'completed' | 'collaborated';
  title: string;
  date: string;
}

const INITIAL_LIMIT = 10;

export function RecentActivitySection({ userId, isOwnProfile, onHide, onTaskClick, showHeader = true }: RecentActivitySectionProps) {
  const { language } = useLanguage();
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchActivity();
  }, [userId]);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const items: ActivityItem[] = [];

      // Completed tasks
      const { data: completed } = await supabase
        .from('tasks')
        .select('id, title, updated_at')
        .eq('created_by', userId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(15);

      completed?.forEach(t => {
        items.push({
          id: `completed-${t.id}`,
          entityId: t.id,
          entityType: 'task',
          type: 'completed',
          title: t.title,
          date: t.updated_at || '',
        });
      });

      // Collaborations
      const { data: collabs } = await supabase
        .from('task_collaborators')
        .select('id, task_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15);

      if (collabs && collabs.length > 0) {
        const taskIds = collabs.map(c => c.task_id);
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', taskIds);
        const taskMap = Object.fromEntries((tasks || []).map(t => [t.id, t.title]));

        collabs.forEach(c => {
          items.push({
            id: `collab-${c.id}`,
            entityId: c.task_id,
            entityType: 'task',
            type: 'collaborated',
            title: taskMap[c.task_id] || 'Unknown',
            date: c.created_at || '',
          });
        });
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivities(items);
    } catch (err) {
      console.error('Error fetching recent activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLabel = (type: ActivityItem['type']) => {
    if (language === 'pt') {
      switch (type) {
        case 'completed': return 'Concluiu a tarefa:';
        case 'collaborated': return 'Participou da tarefa:';
        default: return 'Atividade:';
      }
    }
    switch (type) {
      case 'completed': return 'Completed task:';
      case 'collaborated': return 'Participated in task:';
      default: return 'Activity:';
    }
  };

  const handleClick = (item: ActivityItem) => {
    if (item.entityType === 'task' && onTaskClick) {
      onTaskClick(item.entityId);
    }
  };

  if (loading) return null;
  if (activities.length === 0) return null;

  const visibleActivities = showAll ? activities : activities.slice(0, INITIAL_LIMIT);
  const hasMore = activities.length > INITIAL_LIMIT;

  const Wrapper = showHeader ? motion.div : 'div';
  const wrapperProps = showHeader ? { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } } : {};

  return (
    <Wrapper {...wrapperProps as any} className={showHeader ? "bg-card rounded-2xl p-6 border border-border/50 shadow-soft space-y-4" : "space-y-3"}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-semibold text-lg">
              {language === 'pt' ? 'Atividade Recente' : 'Recent Activity'}
            </span>
          </div>
          {isOwnProfile && onHide && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onHide} className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive">
                    <EyeOff className="w-3.5 h-3.5" />
                    {language === 'pt' ? 'Ocultar' : 'Hide'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{language === 'pt' ? 'Ocultar do perfil público' : 'Hide from public profile'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      <div className="space-y-2">
        {visibleActivities.map((item) => (
          <div
            key={item.id}
            className={`bg-muted/20 rounded-lg p-3 space-y-0.5 ${onTaskClick ? 'cursor-pointer hover:bg-muted/40 transition-colors' : ''}`}
            onClick={() => handleClick(item)}
          >
            <p className="text-sm">
              {getLabel(item.type)}{' '}
              <span className="font-medium text-primary">"{item.title}"</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {item.date
                ? formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: dateLocale })
                : ''}
            </p>
          </div>
        ))}
      </div>

      {hasMore && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full text-xs text-muted-foreground hover:text-primary gap-1"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          {language === 'pt' ? `Ver mais (${activities.length - INITIAL_LIMIT})` : `See more (${activities.length - INITIAL_LIMIT})`}
        </Button>
      )}
    </Wrapper>
  );
}
