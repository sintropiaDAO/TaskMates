import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Clock, Plus, CheckCircle, BadgeCheck, Pencil, Trash2,
  X, History, MessageCircle, ChevronDown, Settings, ThumbsUp, ThumbsDown, FileText, Users as UsersIcon
} from 'lucide-react';
import { ShareItemButton } from '@/components/common/ShareItemButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CommentInput } from '@/components/tasks/CommentInput';
import { PollHistorySection } from '@/components/polls/PollHistorySection';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTags } from '@/hooks/useTags';
import { Poll, PollComment, Profile } from '@/types';
import { PollHistoryEntry } from '@/hooks/usePolls';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInHours, differenceInMinutes, differenceInDays, isPast } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';

interface PollDetailModalProps {
  poll: Poll | null;
  open: boolean;
  onClose: () => void;
  onVote: (pollId: string, optionId: string) => Promise<boolean>;
  onAddOption?: (pollId: string, label: string) => Promise<any>;
  onDeleteOption?: (pollId: string, optionId: string, optionLabel: string) => Promise<boolean>;
  onEdit?: (poll: Poll) => void;
  onDelete?: (pollId: string) => void;
  onRemoveVote?: (pollId: string) => void;
  onFetchHistory?: (pollId: string) => Promise<PollHistoryEntry[]>;
  onRefresh?: () => void;
}

export function PollDetailModal({
  poll,
  open,
  onClose,
  onVote,
  onAddOption,
  onDeleteOption,
  onEdit,
  onDelete,
  onRemoveVote,
  onFetchHistory,
  onRefresh
}: PollDetailModalProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getTranslatedName } = useTags();
  const dateLocale = language === 'pt' ? ptBR : enUS;

  const [newOption, setNewOption] = useState('');
  const [addingOption, setAddingOption] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [comments, setComments] = useState<PollComment[]>([]);
  const [deletingOption, setDeletingOption] = useState<string | null>(null);

  const totalVotes = poll?.votes?.length || 0;
  const userVote = poll?.votes?.find(v => v.user_id === user?.id);
  const isExpired = poll?.deadline ? isPast(new Date(poll.deadline)) : false;
  const isClosed = poll?.status === 'closed' || isExpired;
  const isOwner = user?.id === poll?.created_by;

  useEffect(() => {
    if (poll && open) {
      fetchComments();
    }
  }, [poll, open]);

  useEffect(() => {
    if (!poll?.deadline || isExpired) return;
    const timer = setInterval(() => {
      const now = new Date();
      const end = new Date(poll.deadline!);
      if (isPast(end)) {
        setCountdown(language === 'pt' ? 'Encerrada' : 'Closed');
        clearInterval(timer);
        return;
      }
      const days = differenceInDays(end, now);
      const hours = differenceInHours(end, now) % 24;
      const minutes = differenceInMinutes(end, now) % 60;
      if (days > 0) setCountdown(`${days}d ${hours}h`);
      else if (hours > 0) setCountdown(`${hours}h ${minutes}m`);
      else setCountdown(`${minutes}m`);
    }, 30000);

    const now = new Date();
    const end = new Date(poll.deadline!);
    const days = differenceInDays(end, now);
    const hours = differenceInHours(end, now) % 24;
    const minutes = differenceInMinutes(end, now) % 60;
    if (days > 0) setCountdown(`${days}d ${hours}h`);
    else if (hours > 0) setCountdown(`${hours}h ${minutes}m`);
    else setCountdown(`${minutes}m`);

    return () => clearInterval(timer);
  }, [poll?.deadline, isExpired, language]);

  const fetchComments = async () => {
    if (!poll) return;
    const { data } = await supabase
      .from('poll_comments')
      .select('*')
      .eq('poll_id', poll.id)
      .order('created_at', { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('*')
        .in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setComments(data.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) as Profile
      })));
    }
  };

  const handleAddComment = async (content: string, attachment?: { url: string; type: string; name: string }) => {
    if (!poll || !user || (!content.trim() && !attachment)) return;
    const { error } = await supabase.from('poll_comments').insert({
      poll_id: poll.id,
      user_id: user.id,
      content: content.trim(),
      attachment_url: attachment?.url || null,
      attachment_type: attachment?.type || null,
      attachment_name: attachment?.name || null
    });
    if (!error) {
      fetchComments();
      toast({ title: language === 'pt' ? 'Comentário adicionado' : 'Comment added' });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('poll_comments').delete().eq('id', commentId);
    if (!error) {
      fetchComments();
      toast({ title: language === 'pt' ? 'Comentário excluído' : 'Comment deleted' });
    }
  };

  const handleAddOption = async () => {
    if (!newOption.trim() || !onAddOption || !poll) return;
    setAddingOption(true);
    await onAddOption(poll.id, newOption.trim());
    setNewOption('');
    setAddingOption(false);
    onRefresh?.();
  };

  const handleDeleteOption = async (optionId: string, optionLabel: string) => {
    if (!onDeleteOption || !poll) return;
    setDeletingOption(optionId);
    await onDeleteOption(poll.id, optionId, optionLabel);
    setDeletingOption(null);
    onRefresh?.();
  };

  const getVotesForOption = (optionId: string) => {
    return poll?.votes?.filter(v => v.option_id === optionId).length || 0;
  };

  const handleDelete = () => {
    if (onDelete && poll) {
      onDelete(poll.id);
      setShowDeleteDialog(false);
      onClose();
    }
  };

  const handleRemoveVote = async () => {
    if (onRemoveVote && poll) {
      await onRemoveVote(poll.id);
      toast({ title: language === 'pt' ? 'Voto removido' : 'Vote removed' });
      onRefresh?.();
    }
  };

  if (!poll) return null;

  return (
    <>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'pt' ? 'Excluir enquete?' : 'Delete poll?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'pt'
                ? 'Esta ação não pode ser desfeita. A enquete será permanentemente removida.'
                : 'This action cannot be undone. The poll will be permanently removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'pt' ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {language === 'pt' ? 'Excluir' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <div className="p-4 sm:p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3 pr-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-info/10 text-info">
                    <BarChart3 className="w-3 h-3" />
                    {language === 'pt' ? 'Enquete' : 'Poll'}
                  </span>
                  {isClosed && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      <CheckCircle className="w-3 h-3" />
                      {language === 'pt' ? 'Encerrada' : 'Closed'}
                    </span>
                  )}
                  {poll.deadline && !isClosed && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {countdown}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-display font-bold">{poll.title}</h2>
                  {isOwner && onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => { onClose(); onEdit(poll); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Creator */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${poll.created_by}`)}>
              <UserAvatar userId={poll.created_by} name={poll.creator?.full_name} avatarUrl={poll.creator?.avatar_url} size="lg" />
              <div>
                <div className="flex items-center gap-1">
                  <p className="font-medium text-sm">{poll.creator?.full_name || (language === 'pt' ? 'Usuário' : 'User')}</p>
                  {poll.creator?.is_verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(poll.created_at), language === 'pt' ? "dd 'de' MMMM 'de' yyyy" : "MMMM dd, yyyy", { locale: dateLocale })}
                </p>
              </div>
            </div>

            {poll.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{poll.description}</p>
            )}

            {/* Options with progress bars */}
            <div className="space-y-2">
              {poll.options?.map(option => {
                const votes = getVotesForOption(option.id);
                const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                const isUserVote = userVote?.option_id === option.id;
                const canDeleteOption = isOwner && (poll.options?.length || 0) > 2;

                return (
                  <div key={option.id} className="relative group">
                    <button
                      onClick={() => !isClosed && onVote(poll.id, option.id).then(() => onRefresh?.())}
                      disabled={isClosed}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isUserVote ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      } ${isClosed ? 'cursor-default' : 'cursor-pointer'} ${canDeleteOption ? 'pr-10' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm ${isUserVote ? 'font-semibold text-primary' : ''}`}>
                          {option.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{votes} ({Math.round(pct)}%)</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </button>
                    {canDeleteOption && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-1/2 -translate-y-1/2 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); handleDeleteOption(option.id, option.label); }}
                        disabled={deletingOption === option.id}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add new option */}
            {poll.allow_new_options && !isClosed && onAddOption && (
              <div className="flex items-center gap-2">
                <Input
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  placeholder={language === 'pt' ? 'Nova opção...' : 'New option...'}
                  className="h-9 text-sm"
                  maxLength={100}
                  onKeyDown={e => e.key === 'Enter' && handleAddOption()}
                />
                <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={handleAddOption} disabled={!newOption.trim() || addingOption}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center gap-2 flex-wrap">
              {userVote && !isClosed && onRemoveVote && (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleRemoveVote}>
                  <X className="w-3 h-3" />
                  {language === 'pt' ? 'Retirar voto' : 'Remove vote'}
                </Button>
              )}
              {isOwner && (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="w-3 h-3" />
                  {language === 'pt' ? 'Excluir' : 'Delete'}
                </Button>
              )}
            </div>

            {/* Total votes */}
            <p className="text-sm text-muted-foreground">
              {totalVotes} {language === 'pt' ? (totalVotes === 1 ? 'voto' : 'votos') : (totalVotes === 1 ? 'vote' : 'votes')}
            </p>

            {/* Voters List */}
            {totalVotes > 0 && (
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-sm font-semibold hover:text-primary transition-colors">
                    <span className="flex items-center gap-2">
                      <UsersIcon className="w-4 h-4" />
                      {language === 'pt' ? 'Pessoas que votaram' : 'People who voted'} ({totalVotes})
                    </span>
                    <div className="flex items-center gap-2">
                      <ShareItemButton itemId={poll.id} itemTitle={poll.title} itemType="poll" size="sm" />
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4 space-y-2">
                    <VotersList votes={poll.votes || []} />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Tags */}
            {poll.tags && poll.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {poll.tags.map(tag => (
                  <TagBadge key={tag.id} name={tag.name} category={tag.category} size="sm" displayName={getTranslatedName(tag)} onClick={() => navigate(`/tags/${tag.id}`)} />
                ))}
              </div>
            )}

            {/* Comments Section */}
            <Collapsible open={showComments} onOpenChange={setShowComments}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer group bg-card rounded-lg p-3 border border-border/50 hover:border-border">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-medium">{language === 'pt' ? 'Comentários' : 'Comments'}</span>
                    <span className="text-xs text-muted-foreground">({comments.length})</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showComments ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {language === 'pt' ? 'Nenhum comentário ainda' : 'No comments yet'}
                    </p>
                  )}
                  {comments.map(comment => (
                    <PollCommentItem key={comment.id} comment={comment} language={language} onDelete={() => handleDeleteComment(comment.id)} />
                  ))}
                </div>
                <div className="mt-3">
                  <CommentInput
                    onSend={handleAddComment}
                    placeholder={language === 'pt' ? 'Adicionar comentário...' : 'Add comment...'}
                    disabled={!user}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* History Section */}
            {onFetchHistory && (
              <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer group bg-card rounded-lg p-3 border border-border/50 hover:border-border">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4" />
                      <span className="font-medium">{language === 'pt' ? 'Histórico' : 'History'}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <PollHistorySection pollId={poll.id} fetchHistory={onFetchHistory} />
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Comment item component
function PollCommentItem({ comment, language, onDelete }: { comment: PollComment; language: string; onDelete?: () => void }) {
  const { user } = useAuth();
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const [userLike, setUserLike] = useState<'like' | 'dislike' | null>(null);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const isOwner = user?.id === comment.user_id;

  useEffect(() => {
    fetchLikes();
  }, [comment.id]);

  const fetchLikes = async () => {
    const { data } = await supabase
      .from('poll_comment_likes')
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

    if (userLike === type) {
      await supabase.from('poll_comment_likes').delete()
        .eq('comment_id', comment.id).eq('user_id', user.id);
      setUserLike(null);
      if (type === 'like') setLikes(l => Math.max(0, l - 1));
      else setDislikes(d => Math.max(0, d - 1));
    } else if (userLike) {
      await supabase.from('poll_comment_likes').update({ like_type: type })
        .eq('comment_id', comment.id).eq('user_id', user.id);
      setUserLike(type);
      if (type === 'like') { setLikes(l => l + 1); setDislikes(d => Math.max(0, d - 1)); }
      else { setDislikes(d => d + 1); setLikes(l => Math.max(0, l - 1)); }
    } else {
      await supabase.from('poll_comment_likes').insert({
        comment_id: comment.id, user_id: user.id, like_type: type
      });
      setUserLike(type);
      if (type === 'like') setLikes(l => l + 1);
      else setDislikes(d => d + 1);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: dateLocale
  });

  return (
    <div className="flex gap-3">
      <UserAvatar userId={comment.user_id} name={comment.profile?.full_name} avatarUrl={comment.profile?.avatar_url} size="sm" />
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
                <img src={comment.attachment_url} alt="Anexo" className="max-w-full rounded-lg max-h-40 object-cover" />
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

// Voters list component
function VotersList({ votes }: { votes: { user_id: string; option_id: string }[] }) {
  const navigate = useNavigate();
  const [voters, setVoters] = useState<Record<string, { full_name: string | null; avatar_url: string | null; is_verified?: boolean | null }>>({});

  useEffect(() => {
    const userIds = [...new Set(votes.map(v => v.user_id))];
    if (userIds.length === 0) return;
    supabase
      .from('public_profiles')
      .select('id, full_name, avatar_url, is_verified')
      .in('id', userIds)
      .then(({ data }) => {
        const map: typeof voters = {};
        data?.forEach(p => { if (p.id) map[p.id] = p; });
        setVoters(map);
      });
  }, [votes]);

  const uniqueUserIds = [...new Set(votes.map(v => v.user_id))];

  return (
    <div className="space-y-2">
      {uniqueUserIds.map(userId => {
        const profile = voters[userId];
        return (
          <div
            key={userId}
            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={() => navigate(`/profile/${userId}`)}
          >
            <UserAvatar userId={userId} name={profile?.full_name} avatarUrl={profile?.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium truncate">{profile?.full_name || '...'}</p>
                {profile?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}