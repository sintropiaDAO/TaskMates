import React, { createContext, useContext, useState, useCallback } from 'react';
import { Conversation } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';

interface ChatContextType {
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation | null) => void;
  isChatDrawerOpen: boolean;
  openChatDrawer: (conversation?: Conversation) => void;
  openConversationById: (conversationId: string) => Promise<void>;
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

  const openConversationById = useCallback(async (conversationId: string) => {
    setIsChatDrawerOpen(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, participants:conversation_participants(*)')
        .eq('id', conversationId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Conversation not found');
      const participants = data.participants || [];
      const ids = [...new Set(participants.map(p => p.user_id))];
      const { data: profiles, error: profilesError } = ids.length
        ? await supabase.from('profiles').select('id, full_name, avatar_url, username').in('id', ids)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      setActiveConversation({
        ...data,
        participants: participants.map(p => ({ ...p, profile: profiles?.find(profile => profile.id === p.user_id) })),
      } as unknown as Conversation);
    } catch (e) {
      console.error('Failed to load conversation:', e);
      throw e;
    }
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
        openConversationById,
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
