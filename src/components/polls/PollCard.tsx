import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Plus, CheckCircle, BadgeCheck, Pencil, Trash2, X, History, ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTags } from '@/hooks/useTags';
import { supabase } from '@/integrations/supabase/client';
import { Poll } from '@/types';
import { format, differenceInHours, differenceInMinutes, differenceInDays, isPast } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PollHistorySection } from '@/components/polls/PollHistorySection';
import { PollHistoryEntry } from '@/hooks/usePolls';
import { FlagReportButton } from '@/components/reports/FlagReportButton';

interface PollCardProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => Promise<boolean>;
  onAddOption?: (pollId: string, label: string) => Promise<any>;
  onEdit?: (poll: Poll) => void;
  onDelete?: (pollId: string) => void;
  onRemoveVote?: (pollId: string) => void;
  onFetchHistory?: (pollId: string) => Promise<PollHistoryEntry[]>;
  onVotePoll?: (pollId: string, voteType: 'up' | 'down') => Promise<boolean>;
  getUserPollVote?: (pollId: string) => Promise<string | null>;
  onClick?: () => void;
  recommendationReasons?: string[];
  isNew?: boolean;
}

export function PollCard({ poll, onVote, onAddOption, onEdit, onDelete, onRemoveVote, onFetchHistory, onVotePoll, getUserPollVote, onClick, recommendationReasons, isNew }: PollCardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { getTranslatedName } = useTags();
  const navigate = useNavigate();
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const [newOption, setNewOption] = useState('');
  const [addingOption, setAddingOption] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [userLikeVote, setUserLikeVote] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const totalVotes = poll.votes?.length || 0;
  const userVote = poll.votes?.find(v => v.user_id === user?.id);
  const isExpired = poll.deadline ? isPast(new Date(poll.deadline)) : false;
  const isClosed = poll.status === 'closed' || isExpired;
  const isEndingSoon = poll.deadline && !isExpired && differenceInHours(new Date(poll.deadline), new Date()) < 24;

  useEffect(() => {
    if (getUserPollVote) {
      getUserPollVote(poll.id).then(setUserLikeVote);
    }
  }, [poll.id, poll.upvotes, poll.downvotes]);

  useEffect(() => {
    if (!poll.deadline || isExpired) return;
    const update = () => {
      const now = new Date();
      const end = new Date(poll.deadline!);
      if (isPast(end)) {
        setCountdown(language === 'pt' ? 'Encerrada' : 'Closed');
        return;
      }
      const days = differenceInDays(end, now);
      const hours = differenceInHours(end, now) % 24;
      const minutes = differenceInMinutes(end, now) % 60;
      if (days > 0) setCountdown(`${days}d ${hours}h`);
      else if (hours > 0) setCountdown(`${hours}h ${minutes}m`);
      else setCountdown(`${minutes}m`);
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [poll.deadline, isExpired, language]);

  const handleAddOption = async () => {
    if (!newOption.trim() || !onAddOption) return;
    setAddingOption(true);
    await onAddOption(poll.id, newOption.trim());
    setNewOption('');
    setAddingOption(false);
  };

  const getVotesForOption = (optionId: string) => poll.votes?.filter(v => v.option_id === optionId).length || 0;

  const handleDelete = () => {
    if (onDelete) { onDelete(poll.id); setShowDeleteDialog(false); }
  };

  const handleRemoveVote = async () => {
    if (onRemoveVote) {
      await onRemoveVote(poll.id);
      toast.success(language === 'pt' ? 'Voto removido' : 'Vote removed');
    }
  };

  const handleLikeVote = async (voteType: 'up' | 'down') => {
    if (!onVotePoll || voting) return;
    setVoting(true);
    await onVotePoll(poll.id, voteType);
    if (getUserPollVote) {
      const newVote = await getUserPollVote(poll.id);
      setUserLikeVote(newVote);
    }
    setVoting(false);
  };

  const isOwner = user?.id === poll.created_by;

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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        onClick={() => onClick?.()}
        className={`relative glass rounded-xl p-5 transition-all hover:shadow-soft overflow-hidden cursor-pointer ${
          isEndingSoon ? 'ring-2 ring-warning/50 bg-warning/5' : ''
        } ${isClosed ? 'opacity-80' : ''} ${
          isNew && !isEndingSoon ? 'ring-1 ring-primary/30 bg-primary/5' : ''
        }`}
      >
        {isNew && !isOwner && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
        )}

        {/* Owner actions */}
        {isOwner && onEdit && onDelete && (
          <div className="absolute top-2 right-2 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(poll)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Type badge */}
        <div className="flex items-center gap-1 flex-wrap mb-2">
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
          {isEndingSoon && !isClosed && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning animate-pulse">
              <Clock className="w-3 h-3" />
              {countdown}
            </span>
          )}
          {!isEndingSoon && poll.deadline && !isClosed && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              <Clock className="w-3 h-3" />
              {countdown}
            </span>
          )}
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 mb-3">
          <UserAvatar userId={poll.created_by} name={poll.creator?.full_name} avatarUrl={poll.creator?.avatar_url} size="lg" className="flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="font-medium text-sm truncate">{poll.creator?.full_name || (language === 'pt' ? 'Usuário' : 'User')}</p>
              {poll.creator?.is_verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(poll.created_at), language === 'pt' ? "dd 'de' MMM" : "MMM dd", { locale: dateLocale })}
            </p>
          </div>
        </div>

        <h3 className="font-display font-semibold text-lg mb-2 line-clamp-2">{poll.title}</h3>
        {poll.description && <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{poll.description}</p>}

        {/* Options with progress bars */}
        <div className="space-y-2 mb-3" onClick={e => e.stopPropagation()}>
          {poll.options?.map(option => {
            const votes = getVotesForOption(option.id);
            const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
            const isUserVote = userVote?.option_id === option.id;

            return (
              <button
                key={option.id}
                onClick={() => !isClosed && onVote(poll.id, option.id)}
                disabled={isClosed}
                className={`w-full text-left p-2 rounded-lg border transition-all ${
                  isUserVote ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                } ${isClosed ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${isUserVote ? 'font-semibold text-primary' : ''}`}>
                    {option.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{votes} ({Math.round(pct)}%)</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </button>
            );
          })}
        </div>

        {/* Add new option */}
        {poll.allow_new_options && !isClosed && onAddOption && (
          <div className="flex items-center gap-2 mb-3" onClick={e => e.stopPropagation()}>
            <Input
              value={newOption}
              onChange={e => setNewOption(e.target.value)}
              placeholder={language === 'pt' ? 'Nova opção...' : 'New option...'}
              className="h-8 text-sm"
              maxLength={100}
              onKeyDown={e => e.key === 'Enter' && handleAddOption()}
            />
            <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleAddOption} disabled={!newOption.trim() || addingOption}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Remove vote button */}
        {userVote && !isClosed && onRemoveVote && (
          <div className="mb-3" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleRemoveVote}>
              <X className="w-3 h-3" />
              {language === 'pt' ? 'Retirar voto' : 'Remove vote'}
            </Button>
          </div>
        )}

        {/* Vote buttons + total votes + history */}
        <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleLikeVote('up')}
                      disabled={voting}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                        userLikeVote === 'up'
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      {poll.upvotes || 0}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{language === 'pt' ? 'Impulsionar' : 'Boost'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleLikeVote('down')}
                      disabled={voting}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                        userLikeVote === 'down'
                          ? 'bg-destructive/15 text-destructive'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      {poll.downvotes || 0}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{language === 'pt' ? 'Suprimir' : 'Suppress'}</TooltipContent>
                </Tooltip>
                <FlagReportButton entityType="poll" entityId={poll.id} entityTitle={poll.title} />
              </div>
            </TooltipProvider>
            <span className="text-xs text-muted-foreground">
              · {totalVotes} {language === 'pt' ? (totalVotes === 1 ? 'voto' : 'votos') : (totalVotes === 1 ? 'vote' : 'votes')}
            </span>
          </div>
          {onFetchHistory && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 text-muted-foreground px-2"
              onClick={(e) => { e.stopPropagation(); setShowHistory(v => !v); }}
            >
              <History className="w-3 h-3" />
              {language === 'pt' ? 'Histórico' : 'History'}
            </Button>
          )}
        </div>

        {/* History section */}
        {showHistory && onFetchHistory && (
          <div className="mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
            <PollHistorySection pollId={poll.id} fetchHistory={onFetchHistory} />
          </div>
        )}

        {poll.tags && poll.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
            {poll.tags.slice(0, 3).map(tag => (
              <TagBadge key={tag.id} name={tag.name} category={tag.category} size="sm" displayName={getTranslatedName(tag)} onClick={() => navigate(`/tags/${tag.id}`)} />
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}
