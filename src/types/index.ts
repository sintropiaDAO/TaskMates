export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  username: string;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  wallet_address?: string | null;
  social_links?: SocialLinks | Record<string, unknown> | null;
  quiz_completed?: boolean | null;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type TagCategory = 'skills' | 'communities' | 'physical_resources';

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
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
  image_url: string | null;
  completion_proof_url: string | null;
  completion_proof_type: string | null;
  blockchain_tx_hash: string | null;
  upvotes: number;
  downvotes: number;
  likes: number;
  dislikes: number;
  allow_collaboration: boolean;
  allow_requests: boolean;
  priority: 'low' | 'medium' | 'high' | null;
  location: string | null;
  parent_task_id: string | null;
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
  approval_status: string;
  created_at: string;
  profile?: Profile;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
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

export interface TaskRating {
  id: string;
  task_id: string;
  rated_user_id: string;
  rater_user_id: string;
  rating: number;
  created_at: string;
}

export interface Testimonial {
  id: string;
  profile_user_id: string;
  author_user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
  tags?: Tag[];
}

export interface TestimonialTag {
  id: string;
  testimonial_id: string;
  tag_id: string;
  created_at: string;
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

export interface TaskCompletionProof {
  id: string;
  task_id: string;
  user_id: string;
  proof_url: string;
  proof_type: string;
  caption: string | null;
  created_at: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  user_id: string;
  action: 'created' | 'updated' | 'deleted' | 'completed';
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  profile?: Profile;
}

// Product types
export interface Product {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  location: string | null;
  priority: string | null;
  quantity: number;
  product_type: 'offer' | 'request';
  status: 'available' | 'unavailable' | 'delivered';
  collective_use: boolean;
  created_by: string;
  delivery_code: string | null;
  reference_url: string | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  tags?: Tag[];
}

export interface ProductParticipant {
  id: string;
  product_id: string;
  user_id: string;
  role: 'supplier' | 'requester';
  quantity: number;
  status: 'pending' | 'confirmed';
  delivery_confirmed: boolean;
  delivery_proof_url: string | null;
  delivery_proof_type: string | null;
  delivery_code_input: string | null;
  created_at: string;
  profile?: Profile;
}

// Poll types
export interface Poll {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  deadline: string | null;
  allow_new_options: boolean;
  created_by: string;
  status: 'active' | 'closed';
  task_id: string | null;
  min_quorum: number | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  tags?: Tag[];
  options?: PollOption[];
  votes?: PollVote[];
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  created_by: string;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
}

// Poll comment types
export interface PollComment {
  id: string;
  poll_id: string;
  user_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  created_at: string;
  profile?: Profile;
}

// Product comment types
export interface ProductComment {
  id: string;
  product_id: string;
  user_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  created_at: string;
  profile?: Profile;
}
