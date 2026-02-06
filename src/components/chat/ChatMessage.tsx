import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Message } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { removeAccents } from '@/lib/stringUtils';

interface ChatMessageProps {
  message: Message;
  highlightText?: string;
}

function HighlightedText({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight?.trim() || !text) {
    return <>{text}</>;
  }

  const normalizedHighlight = removeAccents(highlight.toLowerCase().trim());
  const normalizedText = removeAccents(text.toLowerCase());
  
  const parts: { text: string; isMatch: boolean }[] = [];
  let lastIndex = 0;
  let searchIndex = 0;
  
  while ((searchIndex = normalizedText.indexOf(normalizedHighlight, lastIndex)) !== -1) {
    if (searchIndex > lastIndex) {
      parts.push({ text: text.slice(lastIndex, searchIndex), isMatch: false });
    }
    parts.push({ 
      text: text.slice(searchIndex, searchIndex + highlight.length), 
      isMatch: true 
    });
    lastIndex = searchIndex + highlight.length;
  }
  
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isMatch: false });
  }
  
  if (parts.length === 0) {
    return <>{text}</>;
  }
  
  return (
    <>
      {parts.map((part, i) => 
        part.isMatch ? (
          <mark key={i} className="bg-accent text-accent-foreground rounded px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

export function ChatMessage({ message, highlightText }: ChatMessageProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
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
          {/* Attachment */}
          {message.attachment_url && (
            <div className="mb-2">
              {message.attachment_type === 'image' ? (
                <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={message.attachment_url}
                    alt={message.attachment_name || t('chatAttachment')}
                    className="max-w-full rounded-lg max-h-48 object-cover"
                  />
                </a>
              ) : (
                <a
                  href={message.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg',
                    isOwn ? 'bg-primary-foreground/10' : 'bg-background/50'
                  )}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-sm flex-1 truncate">
                    <HighlightedText 
                      text={message.attachment_name || t('chatAttachment')} 
                      highlight={highlightText}
                    />
                  </span>
                  <Download className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
          
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              <HighlightedText text={message.content} highlight={highlightText} />
            </p>
          )}
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