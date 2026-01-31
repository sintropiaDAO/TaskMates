import { Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { Task } from '@/types';
import { format, isPast, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TaskCardMiniProps {
  task: Task;
  onClick: () => void;
}

export function TaskCardMini({ task, onClick }: TaskCardMiniProps) {
  const { language } = useLanguage();
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const isCompleted = task.status === 'completed';
  
  // Check if deadline is overdue or today
  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadlineDate && isBefore(deadlineDate, startOfDay(new Date())) && !isCompleted;
  const isDueToday = deadlineDate && isToday(deadlineDate) && !isCompleted;

  const getTaskTypeColor = () => {
    switch (task.task_type) {
      case 'offer':
        return 'border-l-success';
      case 'request':
        return 'border-l-pink-500';
      case 'personal':
        return 'border-l-blue-500';
      default:
        return 'border-l-muted';
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-card/50 hover:bg-card/80 cursor-pointer transition-all border-l-4",
        getTaskTypeColor(),
        isOverdue && "bg-destructive/10 border-l-destructive ring-1 ring-destructive/20",
        isCompleted && "opacity-80"
      )}
    >
      {/* Avatar */}
      <UserAvatar 
        userId={task.created_by}
        name={task.creator?.full_name}
        avatarUrl={task.creator?.avatar_url}
        size="md"
        clickable={false}
        className="flex-shrink-0"
      />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate mb-0.5">
          {task.creator?.full_name || 'Usuário'}
        </p>
        <h4 className="font-medium text-sm line-clamp-1">{task.title}</h4>
      </div>

      {/* Status/Deadline */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {isCompleted ? (
          <span className="flex items-center gap-1 text-xs text-primary">
            <CheckCircle className="w-3.5 h-3.5" />
          </span>
        ) : task.deadline ? (
          <span className={cn(
            "flex items-center gap-1 text-xs",
            isOverdue && "text-destructive font-medium",
            isDueToday && "text-warning font-medium",
            !isOverdue && !isDueToday && "text-muted-foreground"
          )}>
            {isOverdue && <AlertTriangle className="w-3 h-3" />}
            <Calendar className="w-3 h-3" />
            {format(new Date(task.deadline), "dd/MM", { locale: dateLocale })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
