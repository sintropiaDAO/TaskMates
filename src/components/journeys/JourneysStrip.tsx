import { Map, Plus } from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useJourneysForTags } from '@/hooks/useJourneys';
import { JourneyCard } from './JourneyCard';

/** Horizontal list of journey cards for the given tags (dashboard: followed tags; tag page: that tag). */
export function JourneysStrip({ tagIds, userId, showCreate = false }: { tagIds: string[]; userId?: string; showCreate?: boolean }) {
  const { journeys, loading } = useJourneysForTags(tagIds, userId);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const pt = language === 'pt';
  if (loading || (!journeys.length && !showCreate)) return null;
  // Show unfinished first
  const sorted = [...journeys].sort((a, b) => Number(a.my_status === 'completed') - Number(b.my_status === 'completed'));
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black flex items-center gap-1.5"><Map className="w-4 h-4 text-violet-500" />{pt ? 'Jornadas' : 'Journeys'}</h2>
        <div className="flex gap-3 text-xs font-semibold text-primary">
          {showCreate && <button onClick={() => navigate('/journeys/new')} className="flex items-center gap-1"><Plus className="w-3 h-3" />{pt ? 'Criar' : 'Create'}</button>}
          <button onClick={() => navigate('/journeys')}>{pt ? 'Minhas jornadas' : 'My journeys'}</button>
        </div>
      </div>
      {sorted.length ? (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {sorted.map(j => <JourneyCard key={j.id} journey={j} compact />)}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{pt ? 'Nenhuma jornada ainda. Crie a primeira!' : 'No journeys yet. Create the first one!'}</p>
      )}
    </section>
  );
}
