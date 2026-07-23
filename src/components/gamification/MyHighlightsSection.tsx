import { useEffect, useState } from 'react';
import { Sparkles, Clock, History, Package, ClipboardList, Loader2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfileVisibilityToggle } from '@/components/profile/ProfileVisibilityToggle';
import { useMyHighlights, HighlightEntry } from '@/hooks/useMyHighlights';
import { useProfileVisibility } from '@/hooks/useProfileVisibility';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInHours, differenceInMinutes, format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface MyHighlightsSectionProps {
  targetUserId?: string;
  /** When true, hides the visibility toggle and renders a profile-friendly variant */
  publicView?: boolean;
}

function useCountdown(expiresAt: string) {
  const [text, setText] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const compute = () => {
      const end = new Date(expiresAt);
      const now = new Date();
      if (end <= now) { setText(''); setExpired(true); return; }
      setExpired(false);
      const days = differenceInDays(end, now);
      const hours = differenceInHours(end, now) % 24;
      const minutes = differenceInMinutes(end, now) % 60;
      if (days > 0) setText(`${days}d ${hours}h`);
      else if (hours > 0) setText(`${hours}h ${minutes}m`);
      else setText(`${minutes}m`);
    };
    compute();
    const t = setInterval(compute, 30000);
    return () => clearInterval(t);
  }, [expiresAt]);

  return { text, expired };
}

function HighlightRow({ entry, language, onClick }: { entry: HighlightEntry; language: string; onClick?: () => void }) {
  const { text: countdown, expired } = useCountdown(entry.highlight_expires_at);
  const isTask = !!entry.task_id;
  const isPoll = !!entry.poll_id;
  const item = isTask ? entry.task : isPoll ? entry.poll : entry.product;
  const title = item?.title || (language === 'pt' ? '(item removido)' : '(item removed)');
  const Icon = isTask ? ClipboardList : isPoll ? BarChart3 : Package;
  const typeLabel = isTask
    ? (language === 'pt' ? 'Tarefa' : 'Task')
    : isPoll
    ? (language === 'pt' ? 'Opinião' : 'Poll')
    : (language === 'pt' ? 'Produto' : 'Product');
  const locale = language === 'pt' ? ptBR : enUS;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        expired ? 'bg-muted/30 border-border/40' : 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-900/40',
        onClick && 'cursor-pointer hover:bg-purple-50/70 dark:hover:bg-purple-950/30'
      )}
    >
      {item?.image_url ? (
        <img src={item.image_url} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {typeLabel}
          </span>
        </div>
        <h4 className="font-medium text-sm line-clamp-1">{title}</h4>
        <p className="text-[11px] text-muted-foreground">
          {language === 'pt' ? 'Destacado em ' : 'Highlighted on '}
          {format(new Date(entry.created_at), 'dd MMM yyyy', { locale })}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {expired ? (
          <Badge variant="outline" className="text-[10px] gap-1">
            {language === 'pt' ? 'Encerrado' : 'Ended'}
          </Badge>
        ) : (
          <Badge className="text-[10px] gap-1 bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300/40 hover:bg-purple-500/20">
            <Clock className="w-3 h-3" />
            {countdown}
          </Badge>
        )}
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Sparkles className="w-3 h-3 text-purple-500" />
          {entry.stars_spent}
        </span>
      </div>
    </div>
  );
}

export function MyHighlightsSection({ targetUserId, publicView = false }: MyHighlightsSectionProps) {
  const { language } = useLanguage();
  const { active, past, loading } = useMyHighlights(targetUserId);
  const { settings, toggleSection } = useProfileVisibility();

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-purple-500" />
            {language === 'pt' ? 'Meus Destaques' : 'My Highlights'}
            {!publicView && (
              <ProfileVisibilityToggle
                visible={settings.show_my_highlights}
                onToggle={() => toggleSection('show_my_highlights')}
              />
            )}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              {active.length} {language === 'pt' ? 'ativo(s)' : 'active'}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <History className="w-3.5 h-3.5" />
              {past.length} {language === 'pt' ? 'passado(s)' : 'past'}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {language === 'pt'
            ? 'Tarefas e produtos que você destacou usando Estrelas da Sorte. Cada destaque dura 7 dias.'
            : 'Tasks and products you highlighted using Lucky Stars. Each highlight lasts 7 days.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Active highlights */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                {language === 'pt' ? 'Destaques ativos' : 'Active highlights'}
              </h4>
              {active.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                  {language === 'pt'
                    ? 'Nenhum destaque ativo no momento.'
                    : 'No active highlights right now.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {active.map(h => <HighlightRow key={h.id} entry={h} language={language} />)}
                </div>
              )}
            </div>

            {/* History */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                {language === 'pt' ? 'Histórico' : 'History'}
              </h4>
              {past.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                  {language === 'pt'
                    ? 'Ainda sem destaques encerrados.'
                    : 'No past highlights yet.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {past.slice(0, 10).map(h => <HighlightRow key={h.id} entry={h} language={language} />)}
                  {past.length > 10 && (
                    <p className="text-[11px] text-muted-foreground text-center pt-1">
                      +{past.length - 10} {language === 'pt' ? 'mais' : 'more'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
