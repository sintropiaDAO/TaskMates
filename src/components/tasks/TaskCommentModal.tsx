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

interface TaskCommentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

interface CommentDisplay {
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

export function TaskCommentModal({ open, onOpenChange, taskId, taskTitle }: TaskCommentModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [comments, setComments] = useState<CommentDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const dateLocale = language === 'pt' ? pt : enUS;

  useEffect(() => {
    if (open && taskId) fetchComments();
  }, [open, taskId]);

  const fetchComments = async () => {
    if (!taskId || !user) return;
    setLoading(true);

    const { data: commentsData } = await supabase
      .from('task_comments')
      .select('id, content, user_id, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (!commentsData) { setLoading(false); return; }

    const userIds = [...new Set(commentsData.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const commentIds = commentsData.map(c => c.id);
    const { data: likesData } = commentIds.length > 0
      ? await supabase.from('comment_likes').select('comment_id, like_type, user_id').in('comment_id', commentIds)
      : { data: [] };

    const items: CommentDisplay[] = commentsData.map(c => {
      const profile = profileMap.get(c.user_id);
      const itemLikes = likesData?.filter(l => l.comment_id === c.id) || [];
      return {
        id: c.id,
        content: c.content,
        user_id: c.user_id,
        created_at: c.created_at || '',
        userName: profile?.full_name || '',
        userAvatar: profile?.avatar_url || null,
        likes: itemLikes.filter(l => l.like_type === 'like').length,
        dislikes: itemLikes.filter(l => l.like_type === 'dislike').length,
        userLike: (itemLikes.find(l => l.user_id === user?.id)?.like_type as 'like' | 'dislike') || null,
      };
    });

    setComments(items);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!content.trim() || !user || sending) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({ task_id: taskId, user_id: user.id, content: content.trim() });
      if (error) throw error;
      setContent('');
      fetchComments();
    } catch (err) {
      console.error(err);
      toast({ title: language === 'pt' ? 'Erro ao comentar' : 'Error commenting', variant: 'destructive' });
    }
    setSending(false);
  };

  const handleLike = async (commentId: string, type: 'like' | 'dislike') => {
    if (!user) return;
    const c = comments.find(f => f.id === commentId);
    if (!c) return;

    try {
      if (c.userLike === type) {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
        setComments(prev => prev.map(f => f.id === commentId ? {
          ...f, userLike: null,
          likes: type === 'like' ? Math.max(0, f.likes - 1) : f.likes,
          dislikes: type === 'dislike' ? Math.max(0, f.dislikes - 1) : f.dislikes,
        } : f));
      } else if (c.userLike) {
        await supabase.from('comment_likes').update({ like_type: type }).eq('comment_id', commentId).eq('user_id', user.id);
        setComments(prev => prev.map(f => f.id === commentId ? {
          ...f, userLike: type,
          likes: type === 'like' ? f.likes + 1 : Math.max(0, f.likes - 1),
          dislikes: type === 'dislike' ? f.dislikes + 1 : Math.max(0, f.dislikes - 1),
        } : f));
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id, like_type: type });
        setComments(prev => prev.map(f => f.id === commentId ? {
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
            {language === 'pt' ? 'Comentários' : 'Comments'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground line-clamp-1">{taskTitle}</p>

        {comments.length > 0 && (
          <ScrollArea className="flex-1 max-h-60 -mx-2 px-2">
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={c.userAvatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {c.userName?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate">{c.userName || (language === 'pt' ? 'Usuário' : 'User')}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {c.created_at && formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: dateLocale })}
                    </span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleLike(c.id, 'like')}
                      className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full transition-colors ${
                        c.userLike === 'like' ? 'text-emerald-600 bg-emerald-500/20' : 'text-muted-foreground hover:bg-emerald-500/10'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{c.likes}</span>
                    </button>
                    <button
                      onClick={() => handleLike(c.id, 'dislike')}
                      className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full transition-colors ${
                        c.userLike === 'dislike' ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:bg-destructive/10'
                      }`}
                    >
                      <ThumbsDown className="w-3 h-3" />
                      <span>{c.dislikes}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {loading && <p className="text-xs text-muted-foreground text-center py-2">{language === 'pt' ? 'Carregando...' : 'Loading...'}</p>}
        {!loading && comments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">{language === 'pt' ? 'Nenhum comentário ainda' : 'No comments yet'}</p>
        )}

        <div className="flex gap-2 items-end">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={language === 'pt' ? 'Escreva um comentário...' : 'Write a comment...'}
            rows={2}
            className="flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Button size="icon" onClick={handleSend} disabled={!content.trim() || sending} className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
