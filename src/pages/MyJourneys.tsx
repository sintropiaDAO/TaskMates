import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { ArrowLeft, Map, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMyJourneys, type JourneySummary } from '@/hooks/useJourneys';
import { JourneyCard } from '@/components/journeys/JourneyCard';

export default function MyJourneys() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const pt = language === 'pt';
  const navigate = useNavigate();
  const { participating, created, loading } = useMyJourneys(user?.id);
  const [tab, setTab] = useState<'in' | 'mine'>('in');
  const list: JourneySummary[] = tab === 'in' ? participating : created;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" />{pt ? 'Voltar' : 'Back'}</Button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2"><Map className="w-6 h-6 text-violet-500" />{pt ? 'Minhas Jornadas' : 'My Journeys'}</h1>
        <Button size="sm" onClick={() => navigate('/journeys/new')}><Plus className="w-4 h-4 mr-1" />{pt ? 'Criar' : 'Create'}</Button>
      </div>
      <div className="flex gap-2">
        {([['in', pt ? `Participando (${participating.length})` : `Joined (${participating.length})`], ['mine', pt ? `Criadas (${created.length})` : `Created (${created.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm font-bold border ${tab === k ? 'bg-primary text-primary-foreground' : ''}`}>{l}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
        : list.length ? <div className="grid gap-3">{list.map(j => <JourneyCard key={j.id} journey={j} />)}</div>
        : <p className="text-sm text-muted-foreground text-center py-10">{tab === 'in' ? (pt ? 'Você ainda não participa de nenhuma jornada.' : 'You have not joined any journey yet.') : (pt ? 'Você ainda não criou jornadas.' : 'You have not created journeys yet.')}</p>}
    </div>
  );
}
