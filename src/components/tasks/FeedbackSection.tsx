import { useState, useEffect } from 'react';
import { Award, ThumbsUp, ThumbsDown, Send, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BadgeCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { Task, TaskFeedback } from '@/types';

interface FeedbackSectionProps {
  task: Task;
  feedback: TaskFeedback[];
  onRefresh: () => void;
}

interface FeedbackDisplay {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  userName: string;
  userAvatar: string | null;
  isVerified: boolean;
  likes: number;
  dislikes: number;
  userLike: 'like' | 'dislike' | null;
}

const PREFILL_OPTIONS = [
  { key: 'good', labelPt: 'Que bom', labelEn: 'How nice', prefix_pt: 'Que bom', prefix_en: 'How nice' },
  { key: 'bad', labelPt: 'Que pena', labelEn: 'What a pity', prefix_pt: 'Que pena', prefix_en: 'What a pity' },
  { key: 'howabout', labelPt: 'Que tal', labelEn: 'How about', prefix_pt: 'Que tal', prefix_en: 'How about' },
];

export function FeedbackSection({ task, feedback, onRefresh }: FeedbackSectionProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedPrefix, setSelectedPrefix] = useState<string | null>(null);
  const [feedbackDisplay, setFeedbackDisplay] = useState<FeedbackDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const dateLocale = language === 'pt' ? pt : enUS;

  useEffect(() => {
    fetchFeedbackWithLikes();
  }, [feedback, user]);

  const fetchFeedbackWithLikes = async () => {
    if (!user) return;
    setLoading(true);

    // Filter out clap emojis
    const validFeedback = feedback.filter(f => f.content !== '👏');
    
    if (validFeedback.length === 0) {
      setFeedbackDisplay([]);
      setLoading(false);
      return;
    }

    const feedbackIds = validFeedback.map(f => f.id);
    const { data: likesData } = await supabase
      .from('comment_likes')
      .select('comment_id, like_type, user_id')
      .in('comment_id', feedbackIds);

    const items: FeedbackDisplay[] = validFeedback.map(f => {
      const itemLikes = likesData?.filter(l => l.comment_id === f.id) || [];
      return {
        id: f.id,
        content: f.content,
        user_id: f.user_id,
        created_at: f.created_at || '',
        userName: f.profile?.full_name || '',
        userAvatar: f.profile?.avatar_url || null,
        isVerified: f.profile?.is_verified || false,
        likes: itemLikes.filter(l => l.like_type === 'like').length,
        dislikes: itemLikes.filter(l => l.like_type === 'dislike').length,
        userLike: (itemLikes.find(l => l.user_id === user?.id)?.like_type as 'like' | 'dislike') || null,
      };
    });

    setFeedbackDisplay(items);
    setLoading(false);
  };

  const getPrefixCount = (option: typeof PREFILL_OPTIONS[0]) => {
    const prefix = language === 'pt' ? option.prefix_pt : option.prefix_en;
    return feedbackDisplay.filter(f => f.content.toLowerCase().startsWith(prefix.toLowerCase())).length;
  };

  const handlePrefixSelect = (option: typeof PREFILL_OPTIONS[0]) => {
    if (selectedPrefix === option.key) {
      setSelectedPrefix(null);
      setContent('');
      return;
    }
    setSelectedPrefix(option.key);
    const prefix = language === 'pt' ? option.prefix_pt : option.prefix_en;
    setContent(prefix + ' ');
  };

  const handleSend = async () => {
    if (!content.trim() || !user || sending) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('task_feedback')
        .insert({ task_id: task.id, user_id: user.id, content: content.trim() });
      if (error) throw error;
      toast({ title: language === 'pt' ? 'Feedback enviado!' : 'Feedback sent!' });
      setContent('');
      setSelectedPrefix(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      toast({ title: language === 'pt' ? 'Erro ao enviar feedback' : 'Error sending feedback', variant: 'destructive' });
    }
    setSending(false);
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('task_feedback')
        .delete()
        .eq('id', feedbackId)
        .eq('user_id', user.id);

      if (error) throw error;

      setFeedbackDisplay(prev => prev.filter(f => f.id !== feedbackId));
      toast({ title: language === 'pt' ? 'Feedback excluído!' : 'Feedback deleted!' });
      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
      toast({ 
        title: language === 'pt' ? 'Erro ao excluir feedback' : 'Error deleting feedback', 
        variant: 'destructive' 
      });
    }
  };

  const handleLikeFeedback = async (feedbackId: string, type: 'like' | 'dislike') => {
    if (!user) return;
    const fb = feedbackDisplay.find(f => f.id === feedbackId);
    if (!fb) return;

    try {
      if (fb.userLike === type) {
        await supabase.from('comment_likes').delete().eq('comment_id', feedbackId).eq('user_id', user.id);
        setFeedbackDisplay(prev => prev.map(f => f.id === feedbackId ? {
          ...f, userLike: null,
          likes: type === 'like' ? Math.max(0, f.likes - 1) : f.likes,
          dislikes: type === 'dislike' ? Math.max(0, f.dislikes - 1) : f.dislikes,
        } : f));
      } else if (fb.userLike) {
        await supabase.from('comment_likes').update({ like_type: type }).eq('comment_id', feedbackId).eq('user_id', user.id);
        setFeedbackDisplay(prev => prev.map(f => f.id === feedbackId ? {
          ...f, userLike: type,
          likes: type === 'like' ? f.likes + 1 : Math.max(0, f.likes - 1),
          dislikes: type === 'dislike' ? f.dislikes + 1 : Math.max(0, f.dislikes - 1),
        } : f));
      } else {
        await supabase.from('comment_likes').insert({ comment_id: feedbackId, user_id: user.id, like_type: type });
        setFeedbackDisplay(prev => prev.map(f => f.id === feedbackId ? {
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer bg-card p-4 hover:bg-card/80 transition-colors text-sm font-medium">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>{t('taskFeedback')} ({feedbackDisplay.length})</span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="bg-card border-t border-border/50 px-4 pb-4">
          {/* Existing feedbacks */}
          {feedbackDisplay.length > 0 && (
            <ScrollArea className="max-h-60 pt-3 pb-3">
              <div className="space-y-3">
                {feedbackDisplay.map(fb => (
                  <div key={fb.id} className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={fb.userAvatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                          {fb.userName?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate">{fb.userName || (language === 'pt' ? 'Usuário' : 'User')}</span>
                      {fb.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {fb.created_at && formatDistanceToNow(new Date(fb.created_at), { addSuffix: true, locale: dateLocale })}
                      </span>
                    </div>
                    <p className="text-sm">{fb.content}</p>
                    <div className="flex items-center gap-1 justify-between">
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
                      {fb.user_id === user?.id && (
                        <button
                          onClick={() => handleDeleteFeedback(fb.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          title={language === 'pt' ? 'Excluir feedback' : 'Delete feedback'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {loading && <p className="text-xs text-muted-foreground text-center py-2">{language === 'pt' ? 'Carregando...' : 'Loading...'}</p>}

          {/* Prefill options */}
          <div className="flex flex-wrap gap-2 mt-3 mb-3">
            {PREFILL_OPTIONS.map(opt => {
              const count = getPrefixCount(opt);
              return (
                <button
                  key={opt.key}
                  onClick={() => handlePrefixSelect(opt)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    selectedPrefix === opt.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  <span>{language === 'pt' ? opt.labelPt : opt.labelEn}...</span>
                  {count > 0 && (
                    <span className={`text-[10px] font-bold px-1 rounded-full ${
                      selectedPrefix === opt.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-foreground/10 text-foreground/70'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
