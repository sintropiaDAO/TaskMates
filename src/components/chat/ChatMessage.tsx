import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Message } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { user } = useAuth();
  const isOwn = message.sender_id === user?.id;

  return (
    <div
      className={cn(
        'flex gap-2 mb-3',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {!isOwn && (
        <UserAvatar
          userId={message.sender_id}
          avatarUrl={message.sender?.avatar_url}
          name={message.sender?.full_name}
          size="sm"
        />
      )}
      
      <div className={cn('max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && (
          <span className="text-xs text-muted-foreground mb-1 block">
            {message.sender?.full_name || 'Usuário'}
          </span>
        )}
        
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        
        <span className={cn(
          'text-[10px] text-muted-foreground mt-1 block',
          isOwn ? 'text-right' : 'text-left'
        )}>
          {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
        </span>
      </div>
    </div>
  );
}
