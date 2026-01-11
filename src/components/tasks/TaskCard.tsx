import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ArrowUp, ArrowDown, HandHelping, Hand, ThumbsUp, ThumbsDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TagBadge } from '@/components/ui/tag-badge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { TagDetailModal } from '@/components/tags/TagDetailModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTags } from '@/hooks/useTags';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  showActions?: boolean;
  onCollaborate?: () => void;
  onRequest?: () => void;
  collaboratorCount?: number;
  requesterCount?: number;
}

export function TaskCard({ 
  task, 
  onClick, 
  showActions = true, 
  onCollaborate, 
  onRequest,
  collaboratorCount = 0,
  requesterCount = 0
}: TaskCardProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { getTranslatedName } = useTags();
  const [selectedTag, setSelectedTag] = useState<{ id: string; name: string; category: 'skills' | 'communities' } | null>(null);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [userLike, setUserLike] = useState<'like' | 'dislike' | null>(null);
  const [voteCounts, setVoteCounts] = useState({ upvotes: task.upvotes || 0, downvotes: task.downvotes || 0 });
  const [likeCounts, setLikeCounts] = useState({ likes: task.likes || 0, dislikes: task.dislikes || 0 });
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const isCompleted = task.status === 'completed';

  useEffect(() => {
    if (user) {
      fetchUserVote();
      fetchUserLike();
    }
  }, [user, task.id]);

  const fetchUserVote = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('task_votes')
      .select('vote_type')
      .eq('task_id', task.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setUserVote(data.vote_type as 'up' | 'down');
    }
  };

  const fetchUserLike = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('task_likes')
      .select('like_type')
      .eq('task_id', task.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setUserLike(data.like_type as 'like' | 'dislike');
    }
  };

  const handleVote = async (e: React.MouseEvent, voteType: 'up' | 'down') => {
    e.stopPropagation();
    if (!user) return;

    try {
      if (userVote === voteType) {
        await supabase.from('task_votes').delete().eq('task_id', task.id).eq('user_id', user.id);
        setUserVote(null);
        setVoteCounts(prev => ({
          ...prev,
          [voteType === 'up' ? 'upvotes' : 'downvotes']: Math.max(0, prev[voteType === 'up' ? 'upvotes' : 'downvotes'] - 1)
        }));
      } else if (userVote) {
        await supabase.from('task_votes').update({ vote_type: voteType }).eq('task_id', task.id).eq('user_id', user.id);
        setUserVote(voteType);
        setVoteCounts(prev => ({
          upvotes: voteType === 'up' ? prev.upvotes + 1 : Math.max(0, prev.upvotes - 1),
          downvotes: voteType === 'down' ? prev.downvotes + 1 : Math.max(0, prev.downvotes - 1)
        }));
      } else {
        await supabase.from('task_votes').insert({ task_id: task.id, user_id: user.id, vote_type: voteType });
        setUserVote(voteType);
        setVoteCounts(prev => ({
          ...prev,
          [voteType === 'up' ? 'upvotes' : 'downvotes']: prev[voteType === 'up' ? 'upvotes' : 'downvotes'] + 1
        }));
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleLike = async (e: React.MouseEvent, likeType: 'like' | 'dislike') => {
    e.stopPropagation();
    if (!user) return;

    try {
      if (userLike === likeType) {
        await supabase.from('task_likes').delete().eq('task_id', task.id).eq('user_id', user.id);
        setUserLike(null);
        setLikeCounts(prev => ({
          ...prev,
          [likeType === 'like' ? 'likes' : 'dislikes']: Math.max(0, prev[likeType === 'like' ? 'likes' : 'dislikes'] - 1)
        }));
      } else if (userLike) {
        await supabase.from('task_likes').update({ like_type: likeType }).eq('task_id', task.id).eq('user_id', user.id);
        setUserLike(likeType);
        setLikeCounts(prev => ({
          likes: likeType === 'like' ? prev.likes + 1 : Math.max(0, prev.likes - 1),
          dislikes: likeType === 'dislike' ? prev.dislikes + 1 : Math.max(0, prev.dislikes - 1)
        }));
      } else {
        await supabase.from('task_likes').insert({ task_id: task.id, user_id: user.id, like_type: likeType });
        setUserLike(likeType);
        setLikeCounts(prev => ({
          ...prev,
          [likeType === 'like' ? 'likes' : 'dislikes']: prev[likeType === 'like' ? 'likes' : 'dislikes'] + 1
        }));
      }
    } catch (error) {
      console.error('Error liking:', error);
    }
  };
  
  const getTaskTypeStyles = () => {
    switch (task.task_type) {
      case 'offer':
        return 'bg-success/10 text-success';
      case 'request':
        return 'bg-pink-600/10 text-pink-600';
      case 'personal':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getTaskTypeLabel = () => {
    switch (task.task_type) {
      case 'offer':
        return t('taskOffer');
      case 'request':
        return t('taskRequest');
      case 'personal':
        return t('taskPersonal');
      default:
        return '';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`glass rounded-xl p-5 cursor-pointer transition-all hover:shadow-soft ${isCompleted ? 'border border-primary/20' : ''} ${task.priority === 'high' ? 'ring-2 ring-orange-500/50 bg-orange-500/5' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <UserAvatar 
            userId={task.created_by}
            name={task.creator?.full_name}
            avatarUrl={task.creator?.avatar_url}
            size="lg"
          />
          <div>
            <p className="font-medium text-sm">{task.creator?.full_name || t('user')}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(task.created_at), language === 'pt' ? "dd 'de' MMM" : "MMM dd", { locale: dateLocale })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {task.priority === 'high' && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500">
              <AlertTriangle className="w-3 h-3" />
              {t('taskHighPriority')}
            </span>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <CheckCircle className="w-3 h-3" />
              {t('taskCompleted')}
            </span>
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskTypeStyles()}`}>
            {getTaskTypeLabel()}
          </span>
        </div>
      </div>

      <h3 className="font-display font-semibold text-lg mb-2 line-clamp-2" translate="yes">{task.title}</h3>
      {task.description && <p className="text-muted-foreground text-sm mb-3 line-clamp-2" translate="yes">{task.description}</p>}

      {/* Task Image or Completion Proof Image */}
      {(task.image_url || (isCompleted && task.completion_proof_url && task.completion_proof_type === 'image')) && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <img 
            src={isCompleted && task.completion_proof_url && task.completion_proof_type === 'image' 
              ? task.completion_proof_url 
              : task.image_url || ''} 
            alt={task.title}
            className="w-full h-32 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4" onClick={(e) => e.stopPropagation()}>
          {task.tags.slice(0, 3).map(tag => (
            <TagBadge 
              key={tag.id} 
              name={tag.name} 
              category={tag.category} 
              size="sm"
              displayName={getTranslatedName(tag)}
              onClick={() => setSelectedTag({ id: tag.id, name: tag.name, category: tag.category })}
            />
          ))}
          {task.tags.length > 3 && <span className="text-xs text-muted-foreground">+{task.tags.length - 3}</span>}
        </div>
      )}

      <TagDetailModal
        tagId={selectedTag?.id || null}
        tagName={selectedTag?.name || ''}
        tagCategory={selectedTag?.category || 'skills'}
        open={!!selectedTag}
        onClose={() => setSelectedTag(null)}
      />

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-4">
          {task.deadline && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(task.deadline), "dd/MM", { locale: dateLocale })}
            </div>
          )}
          
          {/* Upvote/Downvote for non-completed tasks */}
          {!isCompleted && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => handleVote(e, 'up')}
                className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-primary/10 ${
                  userVote === 'up' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
                {voteCounts.upvotes}
              </button>
              <button
                onClick={(e) => handleVote(e, 'down')}
                className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-destructive/10 ${
                  userVote === 'down' ? 'text-destructive bg-destructive/10' : 'text-muted-foreground'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5" />
                {voteCounts.downvotes}
              </button>
            </div>
          )}

          {/* Like/Dislike for completed tasks */}
          {isCompleted && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleLike(e, 'like')}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors hover:bg-green-500/20 ${
                  userLike === 'like' ? 'text-green-600 bg-green-500/20' : 'text-green-600 bg-green-500/10'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="font-medium">{likeCounts.likes}</span>
              </button>
              <button
                onClick={(e) => handleLike(e, 'dislike')}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors hover:bg-red-500/20 ${
                  userLike === 'dislike' ? 'text-red-500 bg-red-500/20' : 'text-red-500 bg-red-500/10'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span className="font-medium">{likeCounts.dislikes}</span>
              </button>
            </div>
          )}
        </div>

        {!isCompleted && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {(task.allow_collaboration !== false) && (
              <Button 
                size="sm" 
                variant="ghost" 
                className={`text-xs gap-1 ${!showActions ? 'pointer-events-none' : ''}`}
                onClick={showActions ? onCollaborate : undefined}
              >
                <HandHelping className="w-3.5 h-3.5" />
                {t('taskCollaborate')}
                {collaboratorCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-success/20 text-success rounded-full text-[10px] font-medium">
                    {collaboratorCount}
                  </span>
                )}
              </Button>
            )}
            {(task.allow_requests !== false) && (
              <Button 
                size="sm" 
                variant="ghost" 
                className={`text-xs gap-1 ${!showActions ? 'pointer-events-none' : ''}`}
                onClick={showActions ? onRequest : undefined}
              >
                <Hand className="w-3.5 h-3.5" />
                {t('taskRequestAction')}
                {requesterCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-pink-600/20 text-pink-600 rounded-full text-[10px] font-medium">
                    {requesterCount}
                  </span>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}