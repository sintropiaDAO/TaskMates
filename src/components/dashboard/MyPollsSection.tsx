import { useState, useMemo, useEffect } from 'react';
import { BarChart3, CheckCircle, ChevronDown, ChevronUp, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ProfileVisibilityToggle } from '@/components/profile/ProfileVisibilityToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileVisibility } from '@/hooks/useProfileVisibility';
import { Poll } from '@/types';
import { PollCard } from '@/components/polls/PollCard';
import { PollHistoryEntry } from '@/hooks/usePolls';
import { differenceInHours, differenceInMinutes, differenceInDays, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

function PollCardMini({ poll, onClick }: { poll: Poll; onClick: () => void }) {
  const { language } = useLanguage();
  const isClosed = poll.status === 'closed';
  const totalVotes = poll.votes?.length || 0;
  const isExpired = poll.deadline ? isPast(new Date(poll.deadline)) : false;
  const [countdown, setCountdown] = useState('');

  const isEndingSoon = poll.deadline && !isExpired && !isClosed && differenceInHours(new Date(poll.deadline), new Date()) < 24;

  useEffect(() => {
    if (!poll.deadline || isExpired || isClosed) return;
    const computeCountdown = () => {
      const now = new Date();
      const end = new Date(poll.deadline!);
      if (isPast(end)) { setCountdown(language === 'pt' ? 'Encerrada' : 'Closed'); return; }
      const days = differenceInDays(end, now);
      const hours = differenceInHours(end, now) % 24;
      const minutes = differenceInMinutes(end, now) % 60;
      if (days > 0) setCountdown(`${days}d ${hours}h`);
      else if (hours > 0) setCountdown(`${hours}h ${minutes}m`);
      else setCountdown(`${minutes}m`);
    };
    computeCountdown();
    const timer = setInterval(computeCountdown, 30000);
    return () => clearInterval(timer);
  }, [poll.deadline, isExpired, isClosed, language]);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-card/50 hover:bg-card/80 cursor-pointer transition-all border-l-4 border-l-amber-500",
        isClosed && "opacity-80",
        isEndingSoon && "ring-1 ring-warning/50 bg-warning/5 border-l-warning"
      )}
    >
      <UserAvatar
        userId={poll.created_by}
        name={poll.creator?.full_name}
        avatarUrl={poll.creator?.avatar_url}
        size="md"
        clickable={false}
        className="flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate mb-0.5">
          {poll.creator?.full_name || 'Usuário'}
        </p>
        <h4 className="font-medium text-sm line-clamp-1">{poll.title}</h4>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {poll.deadline && !isClosed && !isExpired && (
          <span className={cn(
            "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
            isEndingSoon
              ? "bg-warning/10 text-warning font-medium animate-pulse"
              : "bg-muted text-muted-foreground"
          )}>
            {isEndingSoon && <AlertTriangle className="w-3 h-3" />}
            <Clock className="w-3 h-3" />
            {countdown}
          </span>
        )}
        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
          {totalVotes} {language === 'pt' ? 'votos' : 'votes'}
        </span>
        {isClosed && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
      </div>
    </div>
  );
}

interface MyPollsSectionProps {
  polls: Poll[];
  onVote: (pollId: string, optionId: string) => Promise<any>;
  onAddOption: (pollId: string, label: string) => Promise<any>;
  onEdit: (poll: Poll) => void;
  onDelete: (pollId: string) => void;
  onRemoveVote: (pollId: string) => void;
  onFetchHistory: (pollId: string) => Promise<PollHistoryEntry[]>;
  onPollClick?: (poll: Poll) => void;
}

type PollFilter = 'all' | 'created' | 'participating';

const MAX_VISIBLE = 5;

export function MyPollsSection({ polls, onVote, onAddOption, onEdit, onDelete, onRemoveVote, onFetchHistory, onPollClick }: MyPollsSectionProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { settings, toggleSection } = useProfileVisibility();

  const [votingFilter, setVotingFilter] = useState<PollFilter>('all');
  const [completedFilter, setCompletedFilter] = useState<PollFilter>('all');
  const [showAllVoting, setShowAllVoting] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);

  const isParticipating = (poll: Poll) => {
    return poll.votes?.some(v => v.user_id === user?.id) || false;
  };

  // EM VOTAÇÃO (active polls)
  const votingPolls = useMemo(() => {
    const active = polls.filter(p => p.status === 'active');
    if (votingFilter === 'all') return active;
    if (votingFilter === 'created') return active.filter(p => p.created_by === user?.id);
    return active.filter(p => isParticipating(p));
  }, [polls, votingFilter, user?.id]);

  const votingCounts = useMemo(() => {
    const active = polls.filter(p => p.status === 'active');
    return {
      all: active.length,
      created: active.filter(p => p.created_by === user?.id).length,
      participating: active.filter(p => isParticipating(p)).length,
    };
  }, [polls, user?.id]);

  // CONCLUÍDAS (closed polls)
  const completedPolls = useMemo(() => {
    const closed = polls.filter(p => p.status === 'closed');
    if (completedFilter === 'all') return closed;
    if (completedFilter === 'created') return closed.filter(p => p.created_by === user?.id);
    return closed.filter(p => isParticipating(p));
  }, [polls, completedFilter, user?.id]);

  const completedCounts = useMemo(() => {
    const closed = polls.filter(p => p.status === 'closed');
    return {
      all: closed.length,
      created: closed.filter(p => p.created_by === user?.id).length,
      participating: closed.filter(p => isParticipating(p)).length,
    };
  }, [polls, user?.id]);

  const renderList = (
    items: Poll[],
    showAll: boolean,
    setShowAll: (v: boolean) => void,
    emptyMsg: string
  ) => {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-4">{emptyMsg}</p>;
    }
    const visible = showAll ? items : items.slice(0, MAX_VISIBLE);
    const hasMore = items.length > MAX_VISIBLE;
    return (
      <div className="space-y-2">
        {visible.map(poll => (
          expandedPollId === poll.id ? (
            <div key={poll.id} className="space-y-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setExpandedPollId(null)}>
                ← {language === 'pt' ? 'Voltar' : 'Back'}
              </Button>
              <PollCard poll={poll} onVote={onVote} onAddOption={onAddOption} onEdit={onEdit} onDelete={onDelete} onRemoveVote={onRemoveVote} onFetchHistory={onFetchHistory} />
            </div>
          ) : (
            <PollCardMini key={poll.id} poll={poll} onClick={() => onPollClick ? onPollClick(poll) : setExpandedPollId(poll.id)} />
          )
        ))}
        {hasMore && (
          <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => setShowAll(!showAll)}>
            {showAll ? <><ChevronUp className="w-4 h-4" />{language === 'pt' ? 'Ver menos' : 'Show less'}</> :
              <><ChevronDown className="w-4 h-4" />{language === 'pt' ? 'Ver mais' : 'Show more'} ({items.length - MAX_VISIBLE})</>}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Em votação */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              {language === 'pt' ? 'Em Votação' : 'Voting'}
              <ProfileVisibilityToggle visible={settings.show_my_voting} onToggle={() => toggleSection('show_my_voting')} />
            </CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant={votingFilter === 'all' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setVotingFilter('all')}>
                {language === 'pt' ? 'Todos' : 'All'} ({votingCounts.all})
              </Button>
              <Button size="sm" variant={votingFilter === 'created' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setVotingFilter('created')}>
                {language === 'pt' ? 'Criadas' : 'Created'} ({votingCounts.created})
              </Button>
              <Button size="sm" variant={votingFilter === 'participating' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setVotingFilter('participating')}>
                {language === 'pt' ? 'Participando' : 'Participating'} ({votingCounts.participating})
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'pt' ? 'Enquetes em andamento' : 'Ongoing polls'}
          </p>
        </CardHeader>
        <CardContent>
          {renderList(votingPolls, showAllVoting, setShowAllVoting,
            language === 'pt' ? 'Nenhuma enquete em votação' : 'No active polls')}
        </CardContent>
      </Card>

      {/* Concluídas */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-primary" />
              {language === 'pt' ? 'Concluídas' : 'Completed'}
            </CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant={completedFilter === 'all' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setCompletedFilter('all')}>
                {language === 'pt' ? 'Todos' : 'All'} ({completedCounts.all})
              </Button>
              <Button size="sm" variant={completedFilter === 'created' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setCompletedFilter('created')}>
                {language === 'pt' ? 'Criadas' : 'Created'} ({completedCounts.created})
              </Button>
              <Button size="sm" variant={completedFilter === 'participating' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setCompletedFilter('participating')}>
                {language === 'pt' ? 'Participando' : 'Participating'} ({completedCounts.participating})
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'pt' ? 'Enquetes já encerradas' : 'Closed polls'}
          </p>
        </CardHeader>
        <CardContent>
          {renderList(completedPolls, showAllCompleted, setShowAllCompleted,
            language === 'pt' ? 'Nenhuma enquete concluída' : 'No completed polls')}
        </CardContent>
      </Card>
    </div>
  );
}
