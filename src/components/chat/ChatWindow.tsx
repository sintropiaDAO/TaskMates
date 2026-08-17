import { useEffect, useRef, useState, useMemo } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { Conversation } from '@/types/chat';
import { useLanguage } from '@/contexts/LanguageContext';
import { removeAccents } from '@/lib/stringUtils';

interface ChatWindowProps {
  conversation: Conversation;
  onClose?: () => void;
}

export function ChatWindow({ conversation, onClose }: ChatWindowProps) {
  const { t, language } = useLanguage();
  const { messages, loading, sendMessage } = useMessages(conversation.id);
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localConversation, setLocalConversation] = useState(conversation);

  // Sync when conversation prop changes
  useEffect(() => { setLocalConversation(conversation); }, [conversation]);

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    
    const normalizedQuery = removeAccents(searchQuery.toLowerCase().trim());
    return messages.filter(msg => {
      const content = removeAccents((msg.content || '').toLowerCase());
      const senderName = removeAccents((msg.sender?.full_name || '').toLowerCase());
      const attachmentName = removeAccents((msg.attachment_name || '').toLowerCase());
      
      return content.includes(normalizedQuery) || 
             senderName.includes(normalizedQuery) ||
             attachmentName.includes(normalizedQuery);
    });
  }, [messages, searchQuery]);

  const dateLocale = language === 'pt' ? ptBR : enUS;

  const formatDayLabel = (date: Date) => {
    if (isToday(date)) return t('filterToday');
    if (isYesterday(date)) return t('chatYesterday');
    return format(date, language === 'pt' ? "d 'de' MMMM 'de' yyyy" : 'MMMM d, yyyy', { locale: dateLocale });
  };

  const scrollToBottom = (smooth = false) => {
    const viewport = scrollRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    const target = viewport ?? scrollRef.current;
    if (target) {
      target.scrollTo({ top: target.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    } else {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
  };

  // Jump to the latest messages when opening a conversation
  useEffect(() => {
    if (searchQuery) return;
    const raf = requestAnimationFrame(() => scrollToBottom(false));
    const timeout = setTimeout(() => scrollToBottom(false), 120);
    return () => { cancelAnimationFrame(raf); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, loading]);

  useEffect(() => {
    if (!searchQuery) scrollToBottom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, searchQuery]);

  const handleSend = async (message: string, attachment?: { url: string; type: string; name: string }) => {
    stopTyping();
    return sendMessage(message, attachment);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <ChatHeader 
        conversation={localConversation} 
        onClose={onClose}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNameUpdate={(name) => setLocalConversation(prev => ({ ...prev, name: name || null }))}
        onMembersUpdate={(participants) => setLocalConversation(prev => ({ ...prev, participants }))}
      />
      
      <ScrollArea className="flex-1 min-h-0 p-3" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {searchQuery ? t('chatNoSearchResults') : t('chatNoMessages')}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredMessages.map((message, index) => {
              const current = new Date(message.created_at);
              const prev = index > 0 ? new Date(filteredMessages[index - 1].created_at) : null;
              const showDivider = !prev || !isSameDay(prev, current);

              return (
                <div key={message.id}>
                  {showDivider && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
                        {formatDayLabel(current)}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <ChatMessage message={message} highlightText={searchQuery} />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

        )}
      </ScrollArea>
      
      <TypingIndicator typingUserIds={typingUsers} />
      <ChatInput onSend={handleSend} onTyping={handleTyping} conversationId={conversation.id} />
    </div>
  );
}
