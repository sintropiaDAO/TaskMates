import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/types/chat';
import { Profile } from '@/types';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification, isEnabled: pushEnabled } = usePushNotifications();

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get unique sender IDs
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
      
      // Fetch sender profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', senderIds);

      const messagesWithSender = (messagesData || []).map(msg => ({
        ...msg,
        sender: profiles?.find(p => p.id === msg.sender_id) as Profile
      }));

      setMessages(messagesWithSender);

      // Mark as read
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMessage.sender_id)
            .single();

          const messageWithSender = {
            ...newMessage,
            sender: profile as Profile
          };

          setMessages(prev => [...prev, messageWithSender]);

          // Handle notification and mark as read if it's not from current user
          if (newMessage.sender_id !== user?.id) {
            // Show push notification
            if (pushEnabled && profile) {
              showNotification(
                profile.full_name || 'Nova mensagem',
                {
                  body: newMessage.content || 'Enviou um anexo',
                  url: '/chat'
                }
              );
            }

            await supabase
              .from('conversation_participants')
              .update({ last_read_at: new Date().toISOString() })
              .eq('conversation_id', conversationId)
              .eq('user_id', user?.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, pushEnabled, showNotification]);

  const sendMessage = async (
    content: string,
    attachment?: { url: string; type: string; name: string }
  ): Promise<boolean> => {
    if (!conversationId || !user || (!content.trim() && !attachment)) return false;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          attachment_url: attachment?.url || null,
          attachment_type: attachment?.type || null,
          attachment_name: attachment?.name || null
        });

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    refreshMessages: fetchMessages
  };
}
