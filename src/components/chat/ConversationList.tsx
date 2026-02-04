import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Conversation } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({ conversations, activeId, onSelect }: ConversationListProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: ptBR });
    }
    if (isYesterday(date)) {
      return t('chatYesterday');
    }
    return format(date, 'dd/MM', { locale: ptBR });
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
        <p className="text-sm">{t('chatNoConversations')}</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conversation) => {
        const otherParticipants = conversation.participants?.filter(
          p => p.user_id !== user?.id
        ) || [];

        const title = conversation.type === 'task' && conversation.task
          ? conversation.task.title
          : otherParticipants.length === 1
          ? otherParticipants[0].profile?.full_name || t('chatUnknownUser')
          : t('chatGroupConversation');

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={cn(
              'w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-accent/50',
              activeId === conversation.id && 'bg-accent'
            )}
          >
            {conversation.type === 'task' ? (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
            ) : otherParticipants.length === 1 ? (
              <UserAvatar
                userId={otherParticipants[0].user_id}
                avatarUrl={otherParticipants[0].profile?.avatar_url}
                name={otherParticipants[0].profile?.full_name}
                size="lg"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate">{title}</span>
                {conversation.lastMessage && (
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {formatTime(conversation.lastMessage.created_at)}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate">
                  {conversation.lastMessage?.content || t('chatNoMessages')}
                </p>
                
                {conversation.unreadCount && conversation.unreadCount > 0 && (
                  <span className="ml-2 shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
