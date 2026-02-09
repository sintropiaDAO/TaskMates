import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation, Message, ConversationParticipant } from '@/types/chat';

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get conversations where user is a participant
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participations.map(p => p.conversation_id);

      // Fetch conversations
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // Fetch participants for each conversation
      const { data: allParticipants, error: allPartError } = await supabase
        .from('conversation_participants')
        .select('*')
        .in('conversation_id', conversationIds);

      if (allPartError) throw allPartError;

      // Get unique user IDs
      const userIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
      
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Fetch last message for each conversation
      const conversationsWithDetails = await Promise.all(
        (convData || []).map(async (conv) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const userParticipation = allParticipants?.find(
            p => p.conversation_id === conv.id && p.user_id === user.id
          );
          
          let unreadCount = 0;
          if (userParticipation?.last_read_at) {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .gt('created_at', userParticipation.last_read_at)
              .neq('sender_id', user.id);
            unreadCount = count || 0;
          } else {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user.id);
            unreadCount = count || 0;
          }

          // Get task info if it's a task conversation
          let task = null;
          if (conv.task_id) {
            const { data: taskData } = await supabase
              .from('tasks')
              .select('id, title')
              .eq('id', conv.task_id)
              .single();
            task = taskData;
          }

          const participants = allParticipants
            ?.filter(p => p.conversation_id === conv.id)
            .map(p => ({
              ...p,
              profile: profiles?.find(pr => pr.id === p.user_id)
            })) as ConversationParticipant[];

          return {
            ...conv,
            participants,
            task,
            lastMessage,
            unreadCount
          } as Conversation;
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createDirectConversation = async (otherUserId: string): Promise<Conversation | null> => {
    if (!user) return null;

    try {
      // Check if direct conversation already exists
      const { data: existingParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      let existingConvId: string | null = null;

      if (existingParticipations) {
        for (const part of existingParticipations) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', part.conversation_id)
            .eq('type', 'direct')
            .single();

          if (conv) {
            const { data: otherPart } = await supabase
              .from('conversation_participants')
              .select('*')
              .eq('conversation_id', conv.id)
              .eq('user_id', otherUserId)
              .single();

            if (otherPart) {
              existingConvId = conv.id;
              break;
            }
          }
        }
      }

      let convId = existingConvId;

      if (!convId) {
        // Generate ID client-side to avoid needing .select() after insert
        // (SELECT policy requires user to be a participant, but participants aren't added yet)
        const newId = crypto.randomUUID();
        
        const { error: convError } = await supabase
          .from('conversations')
          .insert({ id: newId, type: 'direct' });

        if (convError) throw convError;
        convId = newId;

        // Add participants
        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: convId, user_id: user.id },
            { conversation_id: convId, user_id: otherUserId }
          ]);

        if (partError) throw partError;
      }

      // Fetch full conversation with participants
      const { data: fullConv, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', convId)
        .single();

      if (fetchError) throw fetchError;

      // Fetch participants
      const { data: participants, error: partFetchError } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', convId);

      if (partFetchError) throw partFetchError;

      // Fetch profiles for participants
      const userIds = participants?.map(p => p.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const participantsWithProfiles = participants?.map(p => ({
        ...p,
        profile: profiles?.find(pr => pr.id === p.user_id)
      })) as ConversationParticipant[];

      await fetchConversations();

      return {
        ...fullConv,
        participants: participantsWithProfiles,
        lastMessage: null,
        unreadCount: 0
      } as Conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const createTaskConversation = async (taskId: string, participantIds: string[]): Promise<Conversation | null> => {
    if (!user) return null;

    try {
      // Check if task conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('task_id', taskId)
        .eq('type', 'task')
        .single();

      if (existingConv) {
        // Add missing participants
        for (const userId of participantIds) {
          const { data: existing } = await supabase
            .from('conversation_participants')
            .select('*')
            .eq('conversation_id', existingConv.id)
            .eq('user_id', userId)
            .single();

          if (!existing) {
            await supabase
              .from('conversation_participants')
              .insert({ conversation_id: existingConv.id, user_id: userId });
          }
        }
        await fetchConversations();
        return existingConv as Conversation;
      }

      // Create new task conversation with client-side ID
      const newId = crypto.randomUUID();
      const { error: convError } = await supabase
        .from('conversations')
        .insert({ id: newId, type: 'task', task_id: taskId });

      if (convError) throw convError;

      // Add all participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participantIds.map(userId => ({
          conversation_id: newId,
          user_id: userId
        })));

      if (partError) throw partError;

      await fetchConversations();
      return { id: newId, type: 'task', task_id: taskId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Conversation;
    } catch (error) {
      console.error('Error creating task conversation:', error);
      return null;
    }
  };

  const getConversationByTask = (taskId: string): Conversation | undefined => {
    return conversations.find(c => c.task_id === taskId);
  };

  return {
    conversations,
    loading,
    fetchConversations,
    createDirectConversation,
    createTaskConversation,
    getConversationByTask
  };
}
