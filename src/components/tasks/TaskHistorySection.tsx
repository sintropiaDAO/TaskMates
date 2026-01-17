import { motion } from 'framer-motion';
import { History, User, Image, Link as LinkIcon, FileText, Calendar, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TaskHistory } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface TaskHistorySectionProps {
  history: TaskHistory[];
  loading: boolean;
  taskImageUrl?: string | null;
  taskCompletionProofUrl?: string | null;
  taskCompletionProofType?: string | null;
}

export function TaskHistorySection({ 
  history, 
  loading, 
  taskImageUrl,
  taskCompletionProofUrl,
  taskCompletionProofType 
}: TaskHistorySectionProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === 'pt' ? ptBR : enUS;

  const getActionLabel = (action: string, fieldChanged?: string | null) => {
    switch (action) {
      case 'created':
        return t('taskHistoryCreated');
      case 'updated':
        return `${t('taskHistoryUpdated')} ${getFieldLabel(fieldChanged)}`;
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
      case 'image_url':
        return language === 'pt' ? 'imagem' : 'image';
      case 'priority':
        return language === 'pt' ? 'prioridade' : 'priority';
      default:
        return field;
    }
  };

  const isImageUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('/storage/') ||
           lowerUrl.includes('supabase.co');
  };

  const renderMediaPreview = (url: string | null | undefined, label: string, type?: string) => {
    if (!url) return null;

    // Determine if it's an image
    const isImage = type === 'image' || isImageUrl(url);
    const isPdf = type === 'pdf' || url.toLowerCase().includes('.pdf');

    if (isImage) {
      return (
        <div className="mt-2 relative group">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Image className="w-3 h-3" />
            {label}
          </p>
          <img 
            src={url} 
            alt={label}
            className="w-full max-h-32 object-contain rounded-md cursor-pointer hover:opacity-80 transition-opacity bg-muted/30"
            onClick={() => window.open(url, '_blank')}
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="mt-2">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors text-xs"
          >
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-primary truncate">{label}</span>
          </a>
        </div>
      );
    }

    // Link
    return (
      <div className="mt-2">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-2 p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors text-xs"
        >
          <LinkIcon className="w-4 h-4 text-primary" />
          <span className="text-primary truncate max-w-[200px]">{url}</span>
        </a>
      </div>
    );
  };

  const renderValueChange = (entry: TaskHistory) => {
    const field = entry.field_changed;
    
    // For image_url changes, show images instead of text
    if (field === 'image_url') {
      return (
        <div className="mt-2 space-y-2">
          {entry.old_value && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'pt' ? 'Antes:' : 'Before:'}
              </p>
              <img 
                src={entry.old_value} 
                alt="Previous"
                className="w-20 h-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(entry.old_value!, '_blank')}
              />
            </div>
          )}
          {entry.new_value && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'pt' ? 'Depois:' : 'After:'}
              </p>
              <img 
                src={entry.new_value} 
                alt="New"
                className="w-20 h-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(entry.new_value!, '_blank')}
              />
            </div>
          )}
        </div>
      );
    }

    // For deadline changes, format dates nicely
    if (field === 'deadline') {
      const formatDeadline = (val: string | null) => {
        if (!val) return language === 'pt' ? 'Nenhum' : 'None';
        try {
          return format(new Date(val), "dd/MM/yyyy", { locale: dateLocale });
        } catch {
          return val;
        }
      };

      return (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDeadline(entry.old_value)} → {formatDeadline(entry.new_value)}
        </p>
      );
    }

    // For text changes, show truncated values
    if (entry.old_value && entry.new_value) {
      return (
        <p className="text-xs text-muted-foreground mt-1">
          {t('taskHistoryFrom')} "{entry.old_value?.substring(0, 50)}{entry.old_value && entry.old_value.length > 50 ? '...' : ''}" 
          {' '}{t('taskHistoryTo')}{' '}
          "{entry.new_value?.substring(0, 50)}{entry.new_value && entry.new_value.length > 50 ? '...' : ''}"
        </p>
      );
    }

    return null;
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

  return (
    <div className="py-4 border-t border-border">
      <h4 className="font-semibold mb-4 flex items-center gap-2">
        <History className="w-4 h-4" />
        {t('taskHistory')}
      </h4>

      {/* Current Task Assets Section */}
      {(taskImageUrl || taskCompletionProofUrl) && (
        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-sm font-medium mb-3 text-muted-foreground">
            {language === 'pt' ? 'Arquivos Atuais' : 'Current Files'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {taskImageUrl && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Image className="w-3 h-3" />
                  {language === 'pt' ? 'Imagem da Tarefa' : 'Task Image'}
                </p>
                <img 
                  src={taskImageUrl} 
                  alt="Task"
                  className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(taskImageUrl, '_blank')}
                />
              </div>
            )}
            {taskCompletionProofUrl && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  {taskCompletionProofType === 'image' ? (
                    <Image className="w-3 h-3" />
                  ) : taskCompletionProofType === 'pdf' ? (
                    <FileText className="w-3 h-3" />
                  ) : (
                    <LinkIcon className="w-3 h-3" />
                  )}
                  {language === 'pt' ? 'Prova de Conclusão' : 'Completion Proof'}
                </p>
                {taskCompletionProofType === 'image' ? (
                  <img 
                    src={taskCompletionProofUrl} 
                    alt="Proof"
                    className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(taskCompletionProofUrl, '_blank')}
                  />
                ) : (
                  <a 
                    href={taskCompletionProofUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-md hover:bg-muted/70 transition-colors text-xs h-24"
                  >
                    {taskCompletionProofType === 'pdf' ? (
                      <FileText className="w-6 h-6 text-primary" />
                    ) : (
                      <LinkIcon className="w-6 h-6 text-primary" />
                    )}
                    <span className="text-primary text-xs truncate">{language === 'pt' ? 'Ver arquivo' : 'View file'}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Entries */}
      {history.length === 0 ? (
        <div className="text-center py-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {t('taskHistoryEmpty')}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {history.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3 text-sm p-2 rounded-lg hover:bg-muted/20 transition-colors"
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
                  <span className="text-muted-foreground">{getActionLabel(entry.action, entry.field_changed)}</span>
                </p>
                {renderValueChange(entry)}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: dateLocale })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
