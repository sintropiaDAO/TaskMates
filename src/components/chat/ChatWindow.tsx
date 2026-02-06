import { useEffect, useRef } from 'react';
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

interface ChatWindowProps {
  conversation: Conversation;
  onClose?: () => void;
}

export function ChatWindow({ conversation, onClose }: ChatWindowProps) {
  const { t } = useLanguage();
  const { messages, loading, sendMessage } = useMessages(conversation.id);
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (message: string, attachment?: { url: string; type: string; name: string }) => {
    stopTyping();
    return sendMessage(message, attachment);
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversation={conversation} onClose={onClose} />
      
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('chatNoMessages')}
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
        )}
      </ScrollArea>
      
      <TypingIndicator typingUserIds={typingUsers} />
      <ChatInput onSend={handleSend} onTyping={handleTyping} />
    </div>
  );
}
