import React, { createContext, useContext, useState, useCallback } from 'react';
import { Conversation } from '@/types/chat';

interface ChatContextType {
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation | null) => void;
  isChatDrawerOpen: boolean;
  openChatDrawer: (conversation?: Conversation) => void;
  closeChatDrawer: () => void;
  showTaskDetailModal: boolean;
  setShowTaskDetailModal: (show: boolean) => void;
  taskIdForModal: string | null;
  setTaskIdForModal: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [taskIdForModal, setTaskIdForModal] = useState<string | null>(null);

  const openChatDrawer = useCallback((conversation?: Conversation) => {
    if (conversation) {
      setActiveConversation(conversation);
    }
    setIsChatDrawerOpen(true);
  }, []);

  const closeChatDrawer = useCallback(() => {
    setIsChatDrawerOpen(false);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        activeConversation,
        setActiveConversation,
        isChatDrawerOpen,
        openChatDrawer,
        closeChatDrawer,
        showTaskDetailModal,
        setShowTaskDetailModal,
        taskIdForModal,
        setTaskIdForModal
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
