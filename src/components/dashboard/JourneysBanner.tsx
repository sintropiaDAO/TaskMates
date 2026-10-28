import { useState } from 'react';
import { ArrowRight, Map, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';

export function JourneysBanner() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const pt = language === 'pt';

  if (dismissed) return null;

  return (
    <section aria-labelledby="journeys-invitation-title" className="relative mb-6 overflow-hidden rounded-2xl journey-card border-2 border-warning/60 p-5 shadow-[var(--clay-shadow-sm-card)] sm:p-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDismissed(true)}
        aria-label={pt ? 'Fechar convite para Jornadas' : 'Dismiss journey invitation'}
        title={pt ? 'Fechar convite para Jornadas' : 'Dismiss journey invitation'}
        className="absolute right-2 top-2 h-8 w-8 text-journey-foreground/80 hover:bg-journey-foreground/15 hover:text-journey-foreground"
      >
        <X aria-hidden="true" />
      </Button>
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:pr-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-warning/60 bg-journey-foreground/15 text-warning">
          <Map className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="journeys-invitation-title" className="mb-1 text-lg font-black text-journey-foreground">
            {pt ? 'Sua próxima Jornada começa aqui' : 'Your next Journey starts here'}
          </h2>
          <p className="text-sm text-journey-foreground/85">
            {pt ? 'Complete etapas, conquiste recompensas e avance de nível com a comunidade.' : 'Complete steps, earn rewards and level up with the community.'}
          </p>
        </div>
        <Button onClick={() => navigate('/journeys')} className="w-full shrink-0 gap-2 bg-warning font-bold text-warning-foreground hover:bg-warning/90 md:w-auto">
          {pt ? 'Explorar Jornadas' : 'Explore Journeys'}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}