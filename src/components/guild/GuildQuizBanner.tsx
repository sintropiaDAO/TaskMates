import { useState } from 'react';
import { ArrowRight, Compass, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildQuizResult } from '@/hooks/useOccupationTitles';

export function GuildQuizBanner({ hideWhenDone = false }: { hideWhenDone?: boolean }) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const navigate = useNavigate();
  const { result, loading } = useGuildQuizResult();
  const [dismissed, setDismissed] = useState(false);
  if (loading || dismissed || (hideWhenDone && result)) return null;
  return (
    <section aria-labelledby="guild-quiz-title" className="relative mb-6 overflow-hidden rounded-2xl journey-card border-2 border-warning/60 p-5 shadow-[var(--clay-shadow-sm-card)]">
      {hideWhenDone && (
        <Button variant="ghost" size="icon" onClick={() => setDismissed(true)} aria-label={pt ? 'Fechar' : 'Dismiss'} className="absolute right-2 top-2 h-8 w-8 text-journey-foreground/80 hover:bg-journey-foreground/15 hover:text-journey-foreground"><X aria-hidden="true" /></Button>
      )}
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:pr-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-warning/60 bg-journey-foreground/15 text-warning"><Compass className="h-7 w-7" aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <h2 id="guild-quiz-title" className="mb-1 text-lg font-black text-journey-foreground">{result ? (pt ? 'Sua vocação aventureira' : 'Your adventurer vocation') : (pt ? 'Descubra sua vocação aventureira!' : 'Discover your adventurer vocation!')}</h2>
          <p className="text-sm text-journey-foreground/85">{pt ? 'Responda 9 perguntas, conheça sua Ocupação e receba uma missão para conquistar seu primeiro selo.' : 'Answer 9 questions, meet your Occupation and get a quest to earn your first badge.'}</p>
        </div>
        <Button onClick={() => navigate('/guild-quiz')} className="w-full shrink-0 gap-2 bg-warning font-bold text-warning-foreground hover:bg-warning/90 md:w-auto">
          {result ? (pt ? 'Refazer quiz' : 'Retake quiz') : (pt ? 'Começar' : 'Start')}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
