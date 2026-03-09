import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Determine table/column names based on type
  const getLikeTable = () => {
    if (itemType === 'task') return 'task_likes';
    if (itemType === 'product') return 'product_likes';
    return 'poll_likes';
  };

  const getIdColumn = () => {
    if (itemType === 'task') return 'task_id';
    if (itemType === 'product') return 'product_id';
    return 'poll_id';
  };

  const getLikeTypeField = () => {
    // task_likes uses 'like'/'dislike', product/poll use 'up'/'down'
    if (itemType === 'task') return { up: 'like', down: 'dislike' };
    return { up: 'up', down: 'down' };
  };

  useEffect(() => {
    if (!user) return;
    fetchState();
  }, [user, itemId]);

  const fetchState = async () => {
    if (!user) return;
    const table = getLikeTable();
    const col = getIdColumn();
    const types = getLikeTypeField();

    // Fetch user's vote
    const { data: vote } = await supabase
      .from(table)
      .select('like_type')
      .eq(col, itemId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (vote) {
      setLikeState(vote.like_type === types.up ? 'up' : 'down');
    }

    // Fetch counts
    const { count: ups } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq(col, itemId)
      .eq('like_type', types.up);
    const { count: downs } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq(col, itemId)
      .eq('like_type', types.down);

    setUpCount(ups || 0);
    setDownCount(downs || 0);

    // Fetch clap count (task_feedback count acts as clap proxy for tasks)
    if (itemType === 'task') {
      const { count: claps } = await supabase
        .from('task_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', itemId);
      setClapCount(claps || 0);

      // Check if user already clapped (sent feedback)
      const { data: myClap } = await supabase
        .from('task_feedback')
        .select('id')
        .eq('task_id', itemId)
        .eq('user_id', user.id)
        .maybeSingle();
      setClapped(!!myClap);
    }
  };

  const handleVote = async (type: 'up' | 'down') => {
    if (!user) return;
    const table = getLikeTable();
    const col = getIdColumn();
    const types = getLikeTypeField();
    const likeType = type === 'up' ? types.up : types.down;

    try {
      if (likeState === type) {
        // Remove vote
        await supabase.from(table).delete().eq(col, itemId).eq('user_id', user.id);
        setLikeState(null);
        if (type === 'up') setUpCount(c => Math.max(0, c - 1));
        else setDownCount(c => Math.max(0, c - 1));
      } else {
        if (likeState) {
          // Change vote
          await supabase.from(table).update({ like_type: likeType }).eq(col, itemId).eq('user_id', user.id);
          if (type === 'up') { setUpCount(c => c + 1); setDownCount(c => Math.max(0, c - 1)); }
          else { setDownCount(c => c + 1); setUpCount(c => Math.max(0, c - 1)); }
        } else {
          // New vote
          await supabase.from(table).insert({ [col]: itemId, user_id: user.id, like_type: likeType });
          if (type === 'up') setUpCount(c => c + 1);
          else setDownCount(c => c + 1);
        }
        setLikeState(type);
      }
    } catch (err) {
      console.error('Vote error:', err);
    }
  };

  const handleClap = async () => {
    if (!user || itemType !== 'task') return;
    if (clapped) {
      toast({ title: language === 'pt' ? 'Você já aplaudiu!' : 'You already clapped!' });
      return;
    }
    // Open feedback modal instead of auto-clapping
    onFeedbackClick?.();
  };

  return (
    <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
      {/* Like */}
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

      {/* Dislike */}
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
        onClick={itemType === 'task' ? handleClap : () => onFeedbackClick?.()}
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

      {/* Feedback - tasks only */}
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
