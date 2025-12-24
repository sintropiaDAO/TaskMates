import { motion } from 'framer-motion';
import { Calendar, User, ArrowUp, ArrowDown, HandHelping, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TagBadge } from '@/components/ui/tag-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const dateLocale = language === 'pt' ? ptBR : enUS;
  
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
      className="glass rounded-xl p-5 cursor-pointer transition-all hover:shadow-soft"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={task.creator?.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {task.creator?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{task.creator?.full_name || t('user')}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(task.created_at), language === 'pt' ? "dd 'de' MMM" : "MMM dd", { locale: dateLocale })}
            </p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskTypeStyles()}`}>
          {getTaskTypeLabel()}
        </span>
      </div>

      <h3 className="font-display font-semibold text-lg mb-2 line-clamp-2">{task.title}</h3>
      {task.description && <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{task.description}</p>}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {task.tags.slice(0, 3).map(tag => <TagBadge key={tag.id} name={tag.name} category={tag.category} size="sm" />)}
          {task.tags.length > 3 && <span className="text-xs text-muted-foreground">+{task.tags.length - 3}</span>}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-4">
          {task.deadline && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(task.deadline), "dd/MM", { locale: dateLocale })}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 text-xs text-primary"><ArrowUp className="w-3.5 h-3.5" />{task.upvotes}</div>
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground"><ArrowDown className="w-3.5 h-3.5" />{task.downvotes}</div>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={onCollaborate}>
              <HandHelping className="w-3.5 h-3.5" />
              {t('taskCollaborate')}
              {collaboratorCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-success/20 text-success rounded-full text-[10px] font-medium">
                  {collaboratorCount}
                </span>
              )}
            </Button>
            <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={onRequest}>
              <Hand className="w-3.5 h-3.5" />
              {t('taskRequestAction')}
              {requesterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-pink-600/20 text-pink-600 rounded-full text-[10px] font-medium">
                  {requesterCount}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
