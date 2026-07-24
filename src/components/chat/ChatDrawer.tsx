import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronLeft, UserPlus, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatWindow } from './ChatWindow';
import { ConversationList } from './ConversationList';
import { NewConversationModal } from './NewConversationModal';
import { useChat } from '@/contexts/ChatContext';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function ChatDrawer() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    activeConversation,
    setActiveConversation,
    isChatDrawerOpen,
    closeChatDrawer
  } = useChat();
  const { conversations, loading, fetchConversations } = useConversations();

  const handleExpand = () => {
    const path = activeConversation ? `/chat?c=${activeConversation.id}` : '/chat';
    closeChatDrawer();
    navigate(path);
  };

  useEffect(() => {
    if (isChatDrawerOpen) {
      fetchConversations();
    }
  }, [isChatDrawerOpen, fetchConversations]);

  if (!user) return null;

  return (
    <AnimatePresence>
      {isChatDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeChatDrawer}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-16 w-full sm:w-96 bg-background border-l shadow-xl z-50 flex flex-col overflow-hidden"
          >
            {activeConversation ? (
              <>
                <div className="flex items-center gap-1 p-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => setActiveConversation(null)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('chatBack')}
                  </Button>
                  <div className="ml-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleExpand}
                      title={t('chatExpand') || 'Expandir'}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <ChatWindow
                  conversation={activeConversation}
                  onClose={closeChatDrawer}
                />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold">{t('chatTitle')}</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleExpand}
                      title={t('chatExpand') || 'Expandir'}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    <NewConversationModal trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    } />
                    <Button variant="ghost" size="sm" onClick={closeChatDrawer}>
                      ✕
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="animate-pulse text-primary">
                        {t('loading')}
                      </div>
                    </div>
                  ) : (
                    <ConversationList
                      conversations={conversations}
                      onSelect={setActiveConversation}
                    />
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
