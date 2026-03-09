import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';

interface FeedFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

interface FeedbackItem {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  userName: string;
  userAvatar: string | null;
  likes: number;
  dislikes: number;
  userLike: 'like' | 'dislike' | null;
}

const PREFILL_OPTIONS = [
  { key: 'good', labelPt: 'Que bom', labelEn: 'How nice', prefix_pt: 'Que bom', prefix_en: 'How nice' },
  { key: 'bad', labelPt: 'Que pena', labelEn: 'What a pity', prefix_pt: 'Que pena', prefix_en: 'What a pity' },
  { key: 'howabout', labelPt: 'Que tal', labelEn: 'How about', prefix_pt: 'Que tal', prefix_en: 'How about' },
];

export function FeedFeedbackModal({ open, onOpenChange, taskId, taskTitle }: FeedFeedbackModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedPrefix, setSelectedPrefix] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dateLocale = language === 'pt' ? pt : enUS;

  useEffect(() => {
    if (open && taskId) {
      fetchFeedbacks();
    }
  }, [open, taskId]);

  const fetchFeedbacks = async () => {
    if (!taskId || !user) return;
    setLoading(true);
    
    const { data: feedbackData } = await supabase
      .from('task_feedback')
      .select('id, content, user_id, created_at')
      .eq('task_id', taskId)
      .neq('content', '👏')
      .order('created_at', { ascending: false });

    if (!feedbackData) { setLoading(false); return; }

    const userIds = [...new Set(feedbackData.map(f => f.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Fetch likes for all feedback items using comment_likes table
    const feedbackIds = feedbackData.map(f => f.id);
    const { data: likesData } = await supabase
      .from('comment_likes')
      .select('comment_id, like_type, user_id')
      .in('comment_id', feedbackIds);

    const items: FeedbackItem[] = feedbackData.map(f => {
      const profile = profileMap.get(f.user_id);
      const itemLikes = likesData?.filter(l => l.comment_id === f.id) || [];
      return {
        id: f.id,
        content: f.content,
        user_id: f.user_id,
        created_at: f.created_at || '',
        userName: profile?.full_name || '',
        userAvatar: profile?.avatar_url || null,
        likes: itemLikes.filter(l => l.like_type === 'like').length,
        dislikes: itemLikes.filter(l => l.like_type === 'dislike').length,
        userLike: itemLikes.find(l => l.user_id === user?.id)?.like_type as 'like' | 'dislike' | null || null,
      };
    });

    setFeedbacks(items);
    setLoading(false);
  };

  const handlePrefixSelect = (option: typeof PREFILL_OPTIONS[0]) => {
    if (selectedPrefix === option.key) {
      setSelectedPrefix(null);
      setContent('');
      return;
    }
    setSelectedPrefix(option.key);
    const prefix = language === 'pt' ? option.prefix_pt : option.prefix_en;
    setContent(prefix);
  };

  const handleSend = async () => {
    if (!content.trim() || !user || sending) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('task_feedback')
        .insert({ task_id: taskId, user_id: user.id, content: content.trim() });
      if (error) throw error;
      toast({ title: language === 'pt' ? 'Feedback enviado!' : 'Feedback sent!' });
      setContent('');
      setSelectedPrefix(null);
      fetchFeedbacks();
    } catch (err) {
      console.error(err);
      toast({ title: language === 'pt' ? 'Erro ao enviar feedback' : 'Error sending feedback', variant: 'destructive' });
    }
    setSending(false);
  };

  const handleLikeFeedback = async (feedbackId: string, type: 'like' | 'dislike') => {
    if (!user) return;
    const fb = feedbacks.find(f => f.id === feedbackId);
    if (!fb) return;

    try {
      if (fb.userLike === type) {
        await supabase.from('comment_likes').delete().eq('comment_id', feedbackId).eq('user_id', user.id);
        setFeedbacks(prev => prev.map(f => f.id === feedbackId ? {
          ...f, userLike: null,
          likes: type === 'like' ? Math.max(0, f.likes - 1) : f.likes,
          dislikes: type === 'dislike' ? Math.max(0, f.dislikes - 1) : f.dislikes,
        } : f));
      } else if (fb.userLike) {
        await supabase.from('comment_likes').update({ like_type: type }).eq('comment_id', feedbackId).eq('user_id', user.id);
        setFeedbacks(prev => prev.map(f => f.id === feedbackId ? {
          ...f, userLike: type,
          likes: type === 'like' ? f.likes + 1 : Math.max(0, f.likes - 1),
          dislikes: type === 'dislike' ? f.dislikes + 1 : Math.max(0, f.dislikes - 1),
        } : f));
      } else {
        await supabase.from('comment_likes').insert({ comment_id: feedbackId, user_id: user.id, like_type: type });
        setFeedbacks(prev => prev.map(f => f.id === feedbackId ? {
          ...f, userLike: type,
          likes: type === 'like' ? f.likes + 1 : f.likes,
          dislikes: type === 'dislike' ? f.dislikes + 1 : f.dislikes,
        } : f));
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {language === 'pt' ? 'Feedback' : 'Feedback'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground line-clamp-1">{taskTitle}</p>

        {/* Existing feedbacks */}
        {feedbacks.length > 0 && (
          <ScrollArea className="flex-1 max-h-60 -mx-2 px-2">
            <div className="space-y-3">
              {feedbacks.map(fb => (
                <div key={fb.id} className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={fb.userAvatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {fb.userName?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate">{fb.userName || (language === 'pt' ? 'Usuário' : 'User')}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {fb.created_at && formatDistanceToNow(new Date(fb.created_at), { addSuffix: true, locale: dateLocale })}
                    </span>
                  </div>
                  <p className="text-sm">{fb.content}</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleLikeFeedback(fb.id, 'like')}
                      className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full transition-colors ${
                        fb.userLike === 'like' ? 'text-emerald-600 bg-emerald-500/20' : 'text-muted-foreground hover:bg-emerald-500/10'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{fb.likes}</span>
                    </button>
                    <button
                      onClick={() => handleLikeFeedback(fb.id, 'dislike')}
                      className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full transition-colors ${
                        fb.userLike === 'dislike' ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:bg-destructive/10'
                      }`}
                    >
                      <ThumbsDown className="w-3 h-3" />
                      <span>{fb.dislikes}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {loading && <p className="text-xs text-muted-foreground text-center py-2">{language === 'pt' ? 'Carregando...' : 'Loading...'}</p>}

        {/* Prefill options */}
        <div className="flex flex-wrap gap-2">
          {PREFILL_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => handlePrefixSelect(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                selectedPrefix === opt.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              {language === 'pt' ? opt.labelPt : opt.labelEn}...
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-end">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={language === 'pt' ? 'Escreva seu feedback...' : 'Write your feedback...'}
            rows={2}
            className="flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={!content.trim() || sending} className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
