import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChat } from '@/contexts/ChatContext';
import { useConversations } from '@/hooks/useConversations';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { NewConversationModal } from '@/components/chat/NewConversationModal';

const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeConversation, setActiveConversation } = useChat();
  const { conversations, loading } = useConversations();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse text-primary">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pb-20">
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl overflow-hidden shadow-soft"
        >
          <div className="flex flex-col h-[calc(100vh-10rem)]">
            {/* Conversation list - hidden on mobile when conversation is active */}
            <div className={`flex-1 flex flex-col md:flex-row min-h-0`}>
              <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <h1 className="text-xl font-display font-bold">{t('chatTitle')}</h1>
                  </div>
                  <NewConversationModal />
                </div>
                
                <div className="flex-1 overflow-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="animate-pulse text-primary">{t('loading')}</div>
                    </div>
                  ) : (
                    <ConversationList
                      conversations={conversations}
                      activeId={activeConversation?.id}
                      onSelect={setActiveConversation}
                    />
                  )}
                </div>
              </div>

              {/* Chat window */}
              <div className={`flex-1 min-h-0 ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
                {activeConversation ? (
                  <div className="w-full">
                    <ChatWindow
                      conversation={activeConversation}
                      onClose={() => setActiveConversation(null)}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
                    <p>{t('chatSelectConversation')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Chat;
