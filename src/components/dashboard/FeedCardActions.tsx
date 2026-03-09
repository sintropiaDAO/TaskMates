import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FeedCardActionsProps {
  itemId: string;
  itemType: 'task' | 'product' | 'poll';
  onFeedbackClick?: () => void;
}

export function FeedCardActions({ itemId, itemType, onFeedbackClick }: FeedCardActionsProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [likeState, setLikeState] = useState<'up' | 'down' | null>(null);
  const [clapped, setClapped] = useState(false);
  const [clapCount, setClapCount] = useState(0);
  const [upCount, setUpCount] = useState(0);
  const [downCount, setDownCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchState();
  }, [user, itemId]);

  const fetchState = async () => {
    if (!user) return;

    if (itemType === 'task') {
      const { data: vote } = await supabase.from('task_likes').select('like_type').eq('task_id', itemId).eq('user_id', user.id).maybeSingle();
      if (vote) setLikeState(vote.like_type === 'like' ? 'up' : 'down');
      const { count: ups } = await supabase.from('task_likes').select('*', { count: 'exact', head: true }).eq('task_id', itemId).eq('like_type', 'like');
      const { count: downs } = await supabase.from('task_likes').select('*', { count: 'exact', head: true }).eq('task_id', itemId).eq('like_type', 'dislike');
      setUpCount(ups || 0);
      setDownCount(downs || 0);
      // Feedback count as clap
      const { count: claps } = await supabase.from('task_feedback').select('*', { count: 'exact', head: true }).eq('task_id', itemId);
      setClapCount(claps || 0);
      const { data: myClap } = await supabase.from('task_feedback').select('id').eq('task_id', itemId).eq('user_id', user.id).maybeSingle();
      setClapped(!!myClap);
    } else if (itemType === 'product') {
      const { data: vote } = await supabase.from('product_likes').select('like_type').eq('product_id', itemId).eq('user_id', user.id).maybeSingle();
      if (vote) setLikeState(vote.like_type === 'up' ? 'up' : 'down');
      const { count: ups } = await supabase.from('product_likes').select('*', { count: 'exact', head: true }).eq('product_id', itemId).eq('like_type', 'up');
      const { count: downs } = await supabase.from('product_likes').select('*', { count: 'exact', head: true }).eq('product_id', itemId).eq('like_type', 'down');
      setUpCount(ups || 0);
      setDownCount(downs || 0);
    } else {
      const { data: vote } = await supabase.from('poll_likes').select('like_type').eq('poll_id', itemId).eq('user_id', user.id).maybeSingle();
      if (vote) setLikeState(vote.like_type === 'up' ? 'up' : 'down');
      const { count: ups } = await supabase.from('poll_likes').select('*', { count: 'exact', head: true }).eq('poll_id', itemId).eq('like_type', 'up');
      const { count: downs } = await supabase.from('poll_likes').select('*', { count: 'exact', head: true }).eq('poll_id', itemId).eq('like_type', 'down');
      setUpCount(ups || 0);
      setDownCount(downs || 0);
    }
  };

  const handleVote = async (type: 'up' | 'down') => {
    if (!user) return;

    try {
      if (itemType === 'task') {
        const likeType = type === 'up' ? 'like' : 'dislike';
        if (likeState === type) {
          await supabase.from('task_likes').delete().eq('task_id', itemId).eq('user_id', user.id);
          setLikeState(null);
          type === 'up' ? setUpCount(c => Math.max(0, c - 1)) : setDownCount(c => Math.max(0, c - 1));
        } else if (likeState) {
          await supabase.from('task_likes').update({ like_type: likeType }).eq('task_id', itemId).eq('user_id', user.id);
          setLikeState(type);
          if (type === 'up') { setUpCount(c => c + 1); setDownCount(c => Math.max(0, c - 1)); }
          else { setDownCount(c => c + 1); setUpCount(c => Math.max(0, c - 1)); }
        } else {
          await supabase.from('task_likes').insert({ task_id: itemId, user_id: user.id, like_type: likeType });
          setLikeState(type);
          type === 'up' ? setUpCount(c => c + 1) : setDownCount(c => c + 1);
        }
      } else if (itemType === 'product') {
        const likeType = type === 'up' ? 'up' : 'down';
        if (likeState === type) {
          await supabase.from('product_likes').delete().eq('product_id', itemId).eq('user_id', user.id);
          setLikeState(null);
          type === 'up' ? setUpCount(c => Math.max(0, c - 1)) : setDownCount(c => Math.max(0, c - 1));
        } else if (likeState) {
          await supabase.from('product_likes').update({ like_type: likeType }).eq('product_id', itemId).eq('user_id', user.id);
          setLikeState(type);
          if (type === 'up') { setUpCount(c => c + 1); setDownCount(c => Math.max(0, c - 1)); }
          else { setDownCount(c => c + 1); setUpCount(c => Math.max(0, c - 1)); }
        } else {
          await supabase.from('product_likes').insert({ product_id: itemId, user_id: user.id, like_type: likeType });
          setLikeState(type);
          type === 'up' ? setUpCount(c => c + 1) : setDownCount(c => c + 1);
        }
      } else {
        const likeType = type === 'up' ? 'up' : 'down';
        if (likeState === type) {
          await supabase.from('poll_likes').delete().eq('poll_id', itemId).eq('user_id', user.id);
          setLikeState(null);
          type === 'up' ? setUpCount(c => Math.max(0, c - 1)) : setDownCount(c => Math.max(0, c - 1));
        } else if (likeState) {
          await supabase.from('poll_likes').update({ like_type: likeType }).eq('poll_id', itemId).eq('user_id', user.id);
          setLikeState(type);
          if (type === 'up') { setUpCount(c => c + 1); setDownCount(c => Math.max(0, c - 1)); }
          else { setDownCount(c => c + 1); setUpCount(c => Math.max(0, c - 1)); }
        } else {
          await supabase.from('poll_likes').insert({ poll_id: itemId, user_id: user.id, like_type: likeType });
          setLikeState(type);
          type === 'up' ? setUpCount(c => c + 1) : setDownCount(c => c + 1);
        }
      }
    } catch (err) {
      console.error('Vote error:', err);
    }
  };

  const handleClap = () => {
    if (!user) return;
    if (clapped && itemType === 'task') {
      toast({ title: language === 'pt' ? 'Você já aplaudiu!' : 'You already clapped!' });
      return;
    }
    onFeedbackClick?.();
  };

  return (
    <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => handleVote('up')}
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] transition-colors ${
          likeState === 'up'
            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <ThumbsUp className="w-3 h-3" />
        {upCount > 0 && <span>{upCount}</span>}
      </button>

      <button
        onClick={() => handleVote('down')}
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] transition-colors ${
          likeState === 'down'
            ? 'text-destructive bg-destructive/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <ThumbsDown className="w-3 h-3" />
        {downCount > 0 && <span>{downCount}</span>}
      </button>

      {/* Clap - all items */}
      <button
        onClick={handleClap}
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] transition-colors ${
          clapped
            ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
        title={language === 'pt' ? 'Aplaudir' : 'Clap'}
      >
        <span className="text-xs">👏</span>
        {clapCount > 0 && <span>{clapCount}</span>}
      </button>

      {/* Feedback button - tasks only */}
      {itemType === 'task' && (
        <button
          onClick={() => onFeedbackClick?.()}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={language === 'pt' ? 'Dar feedback' : 'Give feedback'}
        >
          <MessageSquare className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
