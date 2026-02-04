import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';

export function ChatFAB() {
  const { user } = useAuth();
  const { openChatDrawer, isChatDrawerOpen } = useChat();
  const { conversations } = useConversations();

  if (!user || isChatDrawerOpen) return null;

  const totalUnread = conversations.reduce(
    (acc, conv) => acc + (conv.unreadCount || 0),
    0
  );

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring' }}
      className="fixed bottom-6 right-6 z-30"
    >
      <Button
        size="lg"
        className="w-14 h-14 rounded-full shadow-lg relative"
        onClick={() => openChatDrawer()}
      >
        <MessageCircle className="w-6 h-6" />
        
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </Button>
    </motion.div>
  );
}
