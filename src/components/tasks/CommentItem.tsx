import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, FileText, BadgeCheck, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TaskComment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface CommentItemProps {
  comment: TaskComment;
  onDelete?: () => void;
}

// Fire-and-forget coin event recording
const recordCoinSilent = (params: {
  _event_id: string; _event_type: string; _currency_key: string;
  _subject_user_id: string; _amount: number; _meta: Record<string, unknown>;
}) => {
  void (async () => { try { await supabase.rpc('record_coin_event', params as any); } catch { /* silent */ } })();
};

export function CommentItem({ comment, onDelete }: CommentItemProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [userLike, setUserLike] = useState<'like' | 'dislike' | null>(null);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const isOwner = user?.id === comment.user_id;

  useEffect(() => {
    fetchLikes();
  }, [comment.id]);

  const fetchLikes = async () => {
    const { data } = await supabase
      .from('comment_likes')
      .select('like_type, user_id')
      .eq('comment_id', comment.id);

    if (data) {
      setLikes(data.filter(d => d.like_type === 'like').length);
      setDislikes(data.filter(d => d.like_type === 'dislike').length);
      const myLike = data.find(d => d.user_id === user?.id);
      setUserLike(myLike ? (myLike.like_type as 'like' | 'dislike') : null);
    }
  };

  const handleLike = async (type: 'like' | 'dislike') => {
    if (!user) return;

    const commentOwnerId = comment.user_id;

    if (userLike === type) {
      await supabase.from('comment_likes').delete()
        .eq('comment_id', comment.id).eq('user_id', user.id);
      setUserLike(null);
      if (type === 'like') {
        setLikes(l => Math.max(0, l - 1));
        // Record LIKE removal for comment owner
        if (commentOwnerId) {
          await supabase.rpc('record_coin_event', {
            _event_id: `COMMENT_LIKE_REMOVED_${comment.id}_${user.id}`,
            _event_type: 'COMMENT_LIKE_REMOVED',
            _currency_key: 'LIKES',
            _subject_user_id: commentOwnerId,
            _amount: -1,
            _meta: { comment_id: comment.id, actor_id: user.id },
          }).catch(() => {});
        }
      } else {
        setDislikes(d => Math.max(0, d - 1));
        // Undo dislike → restore +1 to LIKES global
        if (commentOwnerId) {
          await supabase.rpc('record_coin_event', {
            _event_id: `COMMENT_DISLIKE_REMOVED_${comment.id}_${user.id}`,
            _event_type: 'COMMENT_DISLIKE_REMOVED',
            _currency_key: 'LIKES',
            _subject_user_id: commentOwnerId,
            _amount: 1,
            _meta: { comment_id: comment.id, actor_id: user.id },
          }).catch(() => {});
        }
      }
    } else if (userLike) {
      await supabase.from('comment_likes').update({ like_type: type })
        .eq('comment_id', comment.id).eq('user_id', user.id);
      setUserLike(type);
      if (type === 'like') {
        setLikes(l => l + 1); setDislikes(d => Math.max(0, d - 1));
        // Switching from dislike to like = +2 (undo -1, add +1)
        if (commentOwnerId) {
          await supabase.rpc('record_coin_event', {
            _event_id: `COMMENT_SWITCH_TO_LIKE_${comment.id}_${user.id}_${Date.now()}`,
            _event_type: 'COMMENT_LIKED',
            _currency_key: 'LIKES',
            _subject_user_id: commentOwnerId,
            _amount: 2,
            _meta: { comment_id: comment.id, actor_id: user.id, switched: true },
          }).catch(() => {});
        }
      } else {
        setDislikes(d => d + 1); setLikes(l => Math.max(0, l - 1));
        // Switching from like to dislike = -2
        if (commentOwnerId) {
          await supabase.rpc('record_coin_event', {
            _event_id: `COMMENT_SWITCH_TO_DISLIKE_${comment.id}_${user.id}_${Date.now()}`,
            _event_type: 'COMMENT_DISLIKED',
            _currency_key: 'LIKES',
            _subject_user_id: commentOwnerId,
            _amount: -2,
            _meta: { comment_id: comment.id, actor_id: user.id, switched: true },
          }).catch(() => {});
        }
      }
    } else {
      await supabase.from('comment_likes').insert({
        comment_id: comment.id, user_id: user.id, like_type: type
      });
      setUserLike(type);
      if (type === 'like') {
        setLikes(l => l + 1);
        // New like → +1 LIKES global
        if (commentOwnerId) {
          await supabase.rpc('record_coin_event', {
            _event_id: `COMMENT_LIKED_${comment.id}_${user.id}`,
            _event_type: 'COMMENT_LIKED',
            _currency_key: 'LIKES',
            _subject_user_id: commentOwnerId,
            _amount: 1,
            _meta: { comment_id: comment.id, actor_id: user.id },
          }).catch(() => {});
        }
      } else {
        setDislikes(d => d + 1);
        // New dislike → -1 LIKES global
        if (commentOwnerId) {
          await supabase.rpc('record_coin_event', {
            _event_id: `COMMENT_DISLIKED_${comment.id}_${user.id}`,
            _event_type: 'COMMENT_DISLIKED',
            _currency_key: 'LIKES',
            _subject_user_id: commentOwnerId,
            _amount: -1,
            _meta: { comment_id: comment.id, actor_id: user.id },
          }).catch(() => {});
        }
      }
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: dateLocale
  });

  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8">
        <AvatarFallback>{comment.profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 bg-muted rounded-lg p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium">{comment.profile?.full_name}</p>
            {comment.profile?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
            {isOwner && onDelete && (
              <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {comment.attachment_url && (
          <div className="my-2">
            {comment.attachment_type === 'image' ? (
              <a href={comment.attachment_url} target="_blank" rel="noopener noreferrer">
                <img src={comment.attachment_url} alt={comment.attachment_name || 'Anexo'} className="max-w-full rounded-lg max-h-40 object-cover" />
              </a>
            ) : (
              <a href={comment.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-background/50 text-sm">
                <FileText className="h-4 w-4" />
                <span className="truncate">{comment.attachment_name || 'Anexo'}</span>
              </a>
            )}
          </div>
        )}
        <p className="text-sm text-muted-foreground">{comment.content}</p>
        
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => handleLike('like')}
            className={`flex items-center gap-1 text-xs transition-colors ${
              userLike === 'like' ? 'text-green-600' : 'text-muted-foreground hover:text-green-600'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${userLike === 'like' ? 'fill-current' : ''}`} />
            {likes > 0 && <span>{likes}</span>}
          </button>
          <button
            onClick={() => handleLike('dislike')}
            className={`flex items-center gap-1 text-xs transition-colors ${
              userLike === 'dislike' ? 'text-red-600' : 'text-muted-foreground hover:text-red-600'
            }`}
          >
            <ThumbsDown className={`w-3.5 h-3.5 ${userLike === 'dislike' ? 'fill-current' : ''}`} />
            {dislikes > 0 && <span>{dislikes}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}