import { useState, useEffect } from 'react';
import { History, User } from 'lucide-react';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { PollHistoryEntry } from '@/hooks/usePolls';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface PollHistorySectionProps {
  pollId: string;
  fetchHistory: (pollId: string) => Promise<PollHistoryEntry[]>;
}

const ACTION_LABELS: Record<string, { pt: string; en: string }> = {
  created: { pt: 'Criou a enquete', en: 'Created the poll' },
  updated: { pt: 'Atualizou', en: 'Updated' },
  option_added: { pt: 'Adicionou opção', en: 'Added option' },
  option_removed: { pt: 'Removeu opção', en: 'Removed option' },
};

const FIELD_LABELS: Record<string, { pt: string; en: string }> = {
  title: { pt: 'título', en: 'title' },
  description: { pt: 'descrição', en: 'description' },
  deadline: { pt: 'prazo', en: 'deadline' },
  option: { pt: 'opção', en: 'option' },
};

export function PollHistorySection({ pollId, fetchHistory }: PollHistorySectionProps) {
  const { language } = useLanguage();
  const [history, setHistory] = useState<PollHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const dateLocale = language === 'pt' ? ptBR : enUS;

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchHistory(pollId).then(data => {
      if (active) {
        setHistory(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [pollId, fetchHistory]);

  const getActionLabel = (entry: PollHistoryEntry) => {
    const base = ACTION_LABELS[entry.action]?.[language] || entry.action;
    if (entry.action === 'updated' && entry.field_changed) {
      const field = FIELD_LABELS[entry.field_changed]?.[language] || entry.field_changed;
      return `${base} ${field}`;
    }
    if ((entry.action === 'option_added' || entry.action === 'option_removed') && (entry.new_value || entry.old_value)) {
      const val = entry.new_value || entry.old_value;
      return `${base}: "${val}"`;
    }
    return base;
  };

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 rounded-lg bg-muted/50" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {language === 'pt' ? 'Nenhum histórico registrado' : 'No history recorded'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          {language === 'pt' ? 'Histórico de alterações' : 'Change history'}
        </span>
      </div>
      {history.map(entry => (
        <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/30">
          <UserAvatar
            userId={entry.user_id}
            name={entry.profile?.full_name}
            avatarUrl={entry.profile?.avatar_url}
            size="sm"
            clickable={false}
            className="flex-shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{entry.profile?.full_name || (language === 'pt' ? 'Usuário' : 'User')}</span>
              {' '}
              <span className="text-muted-foreground">{getActionLabel(entry)}</span>
            </p>
            {entry.action === 'updated' && entry.old_value && entry.new_value && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                <span className="line-through opacity-60">{entry.old_value}</span>
                {' → '}
                <span>{entry.new_value}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(entry.created_at), language === 'pt' ? "dd 'de' MMM, HH:mm" : "MMM dd, HH:mm", { locale: dateLocale })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
