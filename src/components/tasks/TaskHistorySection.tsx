import { motion } from 'framer-motion';
import { History, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TaskHistory } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface TaskHistorySectionProps {
  history: TaskHistory[];
  loading: boolean;
}

export function TaskHistorySection({ history, loading }: TaskHistorySectionProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === 'pt' ? ptBR : enUS;

  const getActionLabel = (action: string, fieldChanged?: string | null) => {
    switch (action) {
      case 'created':
        return t('taskHistoryCreated');
      case 'updated':
        return `${t('taskHistoryUpdated')} ${fieldChanged || ''}`;
      case 'deleted':
        return t('taskHistoryDeleted');
      case 'completed':
        return t('taskHistoryCompleted');
      default:
        return action;
    }
  };

  const getFieldLabel = (field: string | null) => {
    if (!field) return '';
    switch (field) {
      case 'title':
        return language === 'pt' ? 'título' : 'title';
      case 'description':
        return language === 'pt' ? 'descrição' : 'description';
      case 'deadline':
        return language === 'pt' ? 'prazo' : 'deadline';
      case 'status':
        return 'status';
      default:
        return field;
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-4 border-t border-border">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <History className="w-4 h-4" />
          {t('taskHistory')}
        </h4>
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('taskHistoryEmpty')}
        </p>
      </div>
    );
  }

  return (
    <div className="py-4 border-t border-border">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <History className="w-4 h-4" />
        {t('taskHistory')}
      </h4>
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {history.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-3 text-sm"
          >
            <Avatar className="w-6 h-6 flex-shrink-0">
              <AvatarImage src={entry.profile?.avatar_url || ''} />
              <AvatarFallback className="text-xs bg-muted">
                {entry.profile?.full_name?.charAt(0) || <User className="w-3 h-3" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-foreground">
                <span className="font-medium">{entry.profile?.full_name || t('user')}</span>
                {' '}
                <span className="text-muted-foreground">{getActionLabel(entry.action, getFieldLabel(entry.field_changed))}</span>
              </p>
              {entry.old_value && entry.new_value && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('taskHistoryFrom')} "{entry.old_value?.substring(0, 50)}{entry.old_value && entry.old_value.length > 50 ? '...' : ''}" 
                  {' '}{t('taskHistoryTo')}{' '}
                  "{entry.new_value?.substring(0, 50)}{entry.new_value && entry.new_value.length > 50 ? '...' : ''}"
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: dateLocale })}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
