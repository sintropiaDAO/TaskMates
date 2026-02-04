import { Profile } from './index';

export interface Conversation {
  id: string;
  type: 'direct' | 'task';
  task_id: string | null;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  task?: {
    id: string;
    title: string;
  };
  lastMessage?: Message;
  unreadCount?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  profile?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  sender?: Profile;
}
