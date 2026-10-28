import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { ArrowLeft, Map, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMyJourneys, type JourneySummary } from '@/hooks/useJourneys';
import { JourneyCard } from '@/components/journeys/JourneyCard';
import { JourneysStrip } from '@/components/journeys/JourneysStrip';
import { useTags } from '@/hooks/useTags';

export default function MyJourneys() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const pt = language === 'pt';
  const navigate = useNavigate();
  const { participating, created, loading } = useMyJourneys(user?.id);
  const { userTags } = useTags();
  const [tab, setTab] = useState<'in' | 'mine'>('in');
  const list: JourneySummary[] = tab === 'in' ? participating : created;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" />{pt ? 'Voltar' : 'Back'}</Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><span className="journey-card flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-warning/60"><Map className="h-6 w-6 text-warning" /></span><div className="min-w-0"><h1 className="text-xl sm:text-2xl font-black">{pt ? 'Minhas Jornadas' : 'My Journeys'}</h1><p className="text-xs text-muted-foreground">{pt ? 'Acompanhe seu progresso e descubra novas jornadas' : 'Track progress and discover new journeys'}</p></div></div>
        <Button size="sm" className="journey-card border-2 border-warning/60" onClick={() => navigate('/journeys/new')}><Plus className="w-4 h-4 mr-1" />{pt ? 'Criar' : 'Create'}</Button>
      </div>
      {user && <JourneysStrip tagIds={userTags.map(ut => ut.tag_id)} userId={user.id} includeMine variant="suggestions" />}
      <div className="journey-card flex gap-1 rounded-xl p-1">
        {([['in', pt ? `Participando (${participating.length})` : `Joined (${participating.length})`], ['mine', pt ? `Criadas (${created.length})` : `Created (${created.length})`]] as const).map(([k, l]) => (
          <Button
            key={k}
            size="sm"
            className={`h-9 flex-1 rounded-lg text-sm font-bold ${tab === k ? 'bg-white text-journey-surface shadow-md hover:bg-white' : 'bg-transparent text-white/85 hover:bg-white/20 hover:text-white'}`}
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
          >{l}</Button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
        : list.length ? <div className="grid gap-3">{list.map(j => <JourneyCard key={j.id} journey={j} />)}</div>
        : <p className="text-sm text-muted-foreground text-center py-10">{tab === 'in' ? (pt ? 'Você ainda não participa de nenhuma jornada.' : 'You have not joined any journey yet.') : (pt ? 'Você ainda não criou jornadas.' : 'You have not created journeys yet.')}</p>}
    </div>
  );
}
