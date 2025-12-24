export interface Profile {
  id: string;
  full_name: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  category: 'skills' | 'communities';
  created_by: string | null;
  created_at: string;
}

export interface UserTag {
  id: string;
  user_id: string;
  tag_id: string;
  created_at: string;
  tag?: Tag;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: 'offer' | 'request' | 'personal';
  status: 'open' | 'in_progress' | 'completed';
  created_by: string;
  deadline: string | null;
  completion_proof_url: string | null;
  completion_proof_type: string | null;
  blockchain_tx_hash: string | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  tags?: Tag[];
}

export interface TaskTag {
  id: string;
  task_id: string;
  tag_id: string;
  created_at: string;
}

export interface TaskCollaborator {
  id: string;
  task_id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile?: Profile;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

export interface TaskVote {
  id: string;
  task_id: string;
  user_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface TaskFeedback {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  task_id: string | null;
  read: boolean;
  created_at: string;
}
