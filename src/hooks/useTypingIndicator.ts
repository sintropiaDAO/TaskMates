import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingUser {
  user_id: string;
  is_typing: boolean;
}

export function useTypingIndicator(conversationId: string | null) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as TypingUser;
            setTypingUsers(prev => prev.filter(id => id !== deleted.user_id));
          } else {
            const typingData = payload.new as TypingUser;
            if (typingData.user_id === user.id) return;
            
            setTypingUsers(prev => {
              if (typingData.is_typing) {
                return prev.includes(typingData.user_id) ? prev : [...prev, typingData.user_id];
              } else {
                return prev.filter(id => id !== typingData.user_id);
              }
            });
          }
        }
      )
      .subscribe();

    // Fetch initial typing states
    const fetchTyping = async () => {
      const { data } = await supabase
        .from('typing_indicators')
        .select('user_id, is_typing')
        .eq('conversation_id', conversationId)
        .eq('is_typing', true)
        .neq('user_id', user.id);

      if (data) {
        setTypingUsers(data.map(t => t.user_id));
      }
    };
    fetchTyping();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  // Update typing status
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !user || isTypingRef.current === isTyping) return;
    
    isTypingRef.current = isTyping;

    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_typing: isTyping,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'conversation_id,user_id'
        });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [conversationId, user]);

  // Handle typing with auto-stop after inactivity
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setTyping(true);

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000); // Stop typing after 3 seconds of inactivity
  }, [setTyping]);

  // Stop typing immediately (e.g., when message is sent)
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (conversationId && user) {
        supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
          .then(() => {});
      }
    };
  }, [conversationId, user]);

  return {
    typingUsers,
    handleTyping,
    stopTyping
  };
}
