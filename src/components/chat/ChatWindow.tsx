import { useEffect, useRef, useState, useMemo } from 'react';
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
  const { t } = useLanguage();
  const { messages, loading, sendMessage } = useMessages(conversation.id);
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    // Scroll to bottom when messages change (only if not searching)
    if (scrollRef.current && !searchQuery) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, searchQuery]);

  const handleSend = async (message: string, attachment?: { url: string; type: string; name: string }) => {
    stopTyping();
    return sendMessage(message, attachment);
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader 
        conversation={conversation} 
        onClose={onClose}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
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
            {filteredMessages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                highlightText={searchQuery}
              />
            ))}
          </div>
        )}
      </ScrollArea>
      
      <TypingIndicator typingUserIds={typingUsers} />
      <ChatInput onSend={handleSend} onTyping={handleTyping} />
    </div>
  );
}
