import { Loader2, Map, Plus, Sparkles } from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useJourneysForTags } from '@/hooks/useJourneys';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/dashboard/SectionHeading';
import { JourneyCard } from './JourneyCard';

/** Shared horizontal list: followed tags on My Journeys; the current tag on tag pages. */
export function JourneysStrip({ tagIds, userId, showCreate = false, includeMine = false, variant = 'tags' }: { tagIds: string[]; userId?: string; showCreate?: boolean; includeMine?: boolean; variant?: 'tags' | 'suggestions' }) {
  const { journeys, loading } = useJourneysForTags(tagIds, userId, true, includeMine);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const pt = language === 'pt';
  const suggestions = variant === 'suggestions';
  const title = suggestions ? (pt ? 'Sugestões' : 'Suggestions') : (pt ? 'Jornadas' : 'Journeys');
  if (!suggestions && (loading || (!journeys.length && !showCreate))) return null;
  // Show unfinished first
  const sorted = [...journeys].sort((a, b) => Number(a.my_status === 'completed') - Number(b.my_status === 'completed'));
  return (
    <section aria-label={title} className={suggestions ? 'min-w-0 rounded-2xl border border-border bg-card p-4 shadow-[var(--clay-shadow-sm-card)]' : 'space-y-2'}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex items-center gap-1">
          <SectionHeading title={title} icon={suggestions ? Sparkles : Map} />
        </div>
        <div className="flex items-center gap-1">
          {showCreate && <Button variant="ghost" size="sm" onClick={() => navigate('/journeys/new')} className="h-8 gap-1 px-2 text-xs text-primary"><Plus />{pt ? 'Criar' : 'Create'}</Button>}
          {!suggestions && <Button variant="link" size="sm" className="h-8 px-2 text-xs" onClick={() => navigate('/journeys')}>{pt ? 'Minhas jornadas' : 'My journeys'}</Button>}
        </div>
      </div>
      <div className="pt-3">
      {loading ? (
        <div role="status" aria-label={pt ? 'Carregando sugestões' : 'Loading suggestions'} className="flex justify-center py-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" /></div>
      ) : sorted.length ? (
        <div role="region" aria-label={pt ? 'Lista de Jornadas' : 'Journey list'} tabIndex={0} className="flex min-w-0 items-start gap-3 overflow-x-auto overscroll-x-contain snap-x pt-2 pb-5 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {sorted.map(j => <div key={j.id} className="snap-start shrink-0"><JourneyCard journey={j} compact /></div>)}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{suggestions ? (pt ? 'Nenhuma sugestão de jornada no momento.' : 'No journey suggestions right now.') : (pt ? 'Nenhuma jornada ainda. Crie a primeira!' : 'No journeys yet. Create the first one!')}</p>
      )}
      </div>
    </section>
  );
}
