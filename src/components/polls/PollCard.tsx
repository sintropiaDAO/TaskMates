import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Plus, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTags } from '@/hooks/useTags';
import { Poll } from '@/types';
import { format, differenceInHours, differenceInMinutes, differenceInDays, isPast } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface PollCardProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => Promise<boolean>;
  onAddOption?: (pollId: string, label: string) => Promise<any>;
  recommendationReasons?: string[];
  isNew?: boolean;
}

export function PollCard({ poll, onVote, onAddOption, recommendationReasons, isNew }: PollCardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { getTranslatedName } = useTags();
  const navigate = useNavigate();
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const [newOption, setNewOption] = useState('');
  const [addingOption, setAddingOption] = useState(false);
  const [countdown, setCountdown] = useState('');

  const totalVotes = poll.votes?.length || 0;
  const userVote = poll.votes?.find(v => v.user_id === user?.id);
  const isExpired = poll.deadline ? isPast(new Date(poll.deadline)) : false;
  const isClosed = poll.status === 'closed' || isExpired;
  const isEndingSoon = poll.deadline && !isExpired && differenceInHours(new Date(poll.deadline), new Date()) < 24;

  useEffect(() => {
    if (!poll.deadline || isExpired) return;
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
      if (days > 0) {
        setCountdown(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m`);
      } else {
        setCountdown(`${minutes}m`);
      }
    }, 30000);
    // Initial calc
    const now = new Date();
    const end = new Date(poll.deadline!);
    const days = differenceInDays(end, now);
    const hours = differenceInHours(end, now) % 24;
    const minutes = differenceInMinutes(end, now) % 60;
    if (days > 0) setCountdown(`${days}d ${hours}h`);
    else if (hours > 0) setCountdown(`${hours}h ${minutes}m`);
    else setCountdown(`${minutes}m`);

    return () => clearInterval(timer);
  }, [poll.deadline, isExpired, language]);

  const handleAddOption = async () => {
    if (!newOption.trim() || !onAddOption) return;
    setAddingOption(true);
    await onAddOption(poll.id, newOption.trim());
    setNewOption('');
    setAddingOption(false);
  };

  const getVotesForOption = (optionId: string) => {
    return poll.votes?.filter(v => v.option_id === optionId).length || 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`relative glass rounded-xl p-5 cursor-pointer transition-all hover:shadow-soft overflow-hidden ${
        isEndingSoon ? 'ring-2 ring-warning/50 bg-warning/5' : ''
      } ${isClosed ? 'opacity-80' : ''} ${
        isNew && !isEndingSoon ? 'ring-1 ring-primary/30 bg-primary/5' : ''
      }`}
    >
      {isNew && (
        <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
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
          <p className="font-medium text-sm truncate">{poll.creator?.full_name || (language === 'pt' ? 'Usuário' : 'User')}</p>
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

      {/* Total votes */}
      <p className="text-xs text-muted-foreground">
        {totalVotes} {language === 'pt' ? (totalVotes === 1 ? 'voto' : 'votos') : (totalVotes === 1 ? 'vote' : 'votes')}
      </p>

      {poll.tags && poll.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
          {poll.tags.slice(0, 3).map(tag => (
            <TagBadge key={tag.id} name={tag.name} category={tag.category} size="sm" displayName={getTranslatedName(tag)} onClick={() => navigate(`/tags/${tag.id}`)} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
