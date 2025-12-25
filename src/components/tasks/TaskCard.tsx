import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ArrowUp, ArrowDown, HandHelping, Hand, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TagBadge } from '@/components/ui/tag-badge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { TagDetailModal } from '@/components/tags/TagDetailModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { Task } from '@/types';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  showActions?: boolean;
  onCollaborate?: () => void;
  onRequest?: () => void;
  collaboratorCount?: number;
  requesterCount?: number;
}

export function TaskCard({ 
  task, 
  onClick, 
  showActions = true, 
  onCollaborate, 
  onRequest,
  collaboratorCount = 0,
  requesterCount = 0
}: TaskCardProps) {
  const { t, language } = useLanguage();
  const { getTranslatedName } = useTags();
  const [selectedTag, setSelectedTag] = useState<{ id: string; name: string; category: 'skills' | 'communities' } | null>(null);
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const isCompleted = task.status === 'completed';
  
  const getTaskTypeStyles = () => {
    switch (task.task_type) {
      case 'offer':
        return 'bg-success/10 text-success';
      case 'request':
        return 'bg-pink-600/10 text-pink-600';
      case 'personal':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getTaskTypeLabel = () => {
    switch (task.task_type) {
      case 'offer':
        return t('taskOffer');
      case 'request':
        return t('taskRequest');
      case 'personal':
        return t('taskPersonal');
      default:
        return '';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`glass rounded-xl p-5 cursor-pointer transition-all hover:shadow-soft ${isCompleted ? 'border border-primary/20' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <UserAvatar 
            userId={task.created_by}
            name={task.creator?.full_name}
            avatarUrl={task.creator?.avatar_url}
            size="lg"
          />
          <div>
            <p className="font-medium text-sm">{task.creator?.full_name || t('user')}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(task.created_at), language === 'pt' ? "dd 'de' MMM" : "MMM dd", { locale: dateLocale })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <CheckCircle className="w-3 h-3" />
              {t('taskCompleted')}
            </span>
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskTypeStyles()}`}>
            {getTaskTypeLabel()}
          </span>
        </div>
      </div>

      <h3 className="font-display font-semibold text-lg mb-2 line-clamp-2">{task.title}</h3>
      {task.description && <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{task.description}</p>}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4" onClick={(e) => e.stopPropagation()}>
          {task.tags.slice(0, 3).map(tag => (
            <TagBadge 
              key={tag.id} 
              name={tag.name} 
              category={tag.category} 
              size="sm"
              displayName={getTranslatedName(tag)}
              onClick={() => setSelectedTag({ id: tag.id, name: tag.name, category: tag.category })}
            />
          ))}
          {task.tags.length > 3 && <span className="text-xs text-muted-foreground">+{task.tags.length - 3}</span>}
        </div>
      )}

      <TagDetailModal
        tagId={selectedTag?.id || null}
        tagName={selectedTag?.name || ''}
        tagCategory={selectedTag?.category || 'skills'}
        open={!!selectedTag}
        onClose={() => setSelectedTag(null)}
      />

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-4">
          {task.deadline && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(task.deadline), "dd/MM", { locale: dateLocale })}
            </div>
          )}
          
          {/* Upvote/Downvote for non-completed tasks */}
          {!isCompleted && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 text-xs text-primary">
                <ArrowUp className="w-3.5 h-3.5" />
                {task.upvotes || 0}
              </div>
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <ArrowDown className="w-3.5 h-3.5" />
                {task.downvotes || 0}
              </div>
            </div>
          )}

          {/* Like/Dislike for completed tasks */}
          {isCompleted && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded-full">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="font-medium">{task.likes || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-red-500 bg-red-500/10 px-2 py-1 rounded-full">
                <ThumbsDown className="w-3.5 h-3.5" />
                <span className="font-medium">{task.dislikes || 0}</span>
              </div>
            </div>
          )}
        </div>

        {showActions && !isCompleted && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {(task.allow_collaboration !== false) && (
              <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={onCollaborate}>
                <HandHelping className="w-3.5 h-3.5" />
                {t('taskCollaborate')}
                {collaboratorCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-success/20 text-success rounded-full text-[10px] font-medium">
                    {collaboratorCount}
                  </span>
                )}
              </Button>
            )}
            {(task.allow_requests !== false) && (
              <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={onRequest}>
                <Hand className="w-3.5 h-3.5" />
                {t('taskRequestAction')}
                {requesterCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-pink-600/20 text-pink-600 rounded-full text-[10px] font-medium">
                    {requesterCount}
                  </span>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}