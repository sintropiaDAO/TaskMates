import { useState } from 'react';
import { ChevronDown, Map, Plus } from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useJourneysForTags } from '@/hooks/useJourneys';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SectionHeading } from '@/components/dashboard/SectionHeading';
import { JourneyCard } from './JourneyCard';

/** Horizontal list of journey cards for the given tags (dashboard: followed tags; tag page: that tag). */
export function JourneysStrip({ tagIds, userId, showCreate = false, includeMine = false, collapsible = false }: { tagIds: string[]; userId?: string; showCreate?: boolean; includeMine?: boolean; collapsible?: boolean }) {
  const { journeys, loading } = useJourneysForTags(tagIds, userId, true, includeMine);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const pt = language === 'pt';
  const [open, setOpen] = useState(true);
  if (loading || (!journeys.length && !showCreate)) return null;
  // Show unfinished first
  const sorted = [...journeys].sort((a, b) => Number(a.my_status === 'completed') - Number(b.my_status === 'completed'));
  return (
    <Collapsible open={!collapsible || open} onOpenChange={setOpen} asChild>
    <section aria-label={pt ? 'Jornadas' : 'Journeys'} className={collapsible ? 'my-5 min-w-0 border-y-2 border-border bg-card/70 py-3 shadow-[var(--clay-shadow-inset)]' : 'space-y-2'}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex items-center gap-1">
          <SectionHeading title={pt ? 'Jornadas' : 'Journeys'} icon={Map} />
          {collapsible && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={pt ? (open ? 'Recolher Jornadas' : 'Expandir Jornadas') : (open ? 'Collapse Journeys' : 'Expand Journeys')} title={pt ? (open ? 'Recolher Jornadas' : 'Expandir Jornadas') : (open ? 'Collapse Journeys' : 'Expand Journeys')}>
                <ChevronDown className={`transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        <div className="flex items-center gap-1">
          {showCreate && <Button variant="ghost" size="sm" onClick={() => navigate('/journeys/new')} className="h-8 gap-1 px-2 text-xs text-primary"><Plus />{pt ? 'Criar' : 'Create'}</Button>}
          <Button variant="link" size="sm" className="h-8 px-2 text-xs" onClick={() => navigate('/journeys')}>{pt ? 'Minhas jornadas' : 'My journeys'}</Button>
        </div>
      </div>
      <CollapsibleContent className="pt-3">
      {sorted.length ? (
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
          {sorted.map(j => <JourneyCard key={j.id} journey={j} compact />)}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{pt ? 'Nenhuma jornada ainda. Crie a primeira!' : 'No journeys yet. Create the first one!'}</p>
      )}
      </CollapsibleContent>
    </section>
    </Collapsible>
  );
}
