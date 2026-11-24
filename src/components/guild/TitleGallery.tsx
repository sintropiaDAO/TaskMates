import { Compass, Crown, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { OCCUPATIONS, occupationName, type VocationCategory } from '@/lib/guildQuiz';
import { useGuildQuizResult } from '@/hooks/useOccupationTitles';
import type { OccupationTitle } from '@/lib/occupationTitles';

/** Featured title + vocation quiz call-to-action, in the vocation visual identity. */
export function TitleHighlight({ featured, isOwn, lang }: { featured: OccupationTitle | null; isOwn: boolean; lang: 'pt' | 'en' }) {
  const pt = lang === 'pt';
  const navigate = useNavigate();
  const { result } = useGuildQuizResult();
  if (!featured && !isOwn) return null;
  return (
    <section aria-labelledby="title-highlight" className="vocation-card relative my-5 overflow-hidden rounded-2xl border-2 border-vocation-accent/70 p-4">
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="vocation-emblem flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-vocation-accent bg-vocation-foreground/15 text-vocation-accent">
          {featured ? <Crown className="h-6 w-6" aria-hidden="true" /> : <Compass className="h-6 w-6" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <p id="title-highlight" className="text-xs font-bold text-vocation-foreground/85">{featured ? (pt ? 'Título em destaque' : 'Featured title') : (pt ? 'Sua vocação aventureira' : 'Your adventurer vocation')}</p>
          <p className="font-black text-vocation-foreground">
            {featured ? <><span aria-hidden="true">{OCCUPATIONS[featured.category].emoji} </span>{featured.name}</> : (pt ? 'Conquiste um selo para ganhar seu primeiro título.' : 'Earn a badge to get your first title.')}
          </p>
        </div>
        {isOwn && (
          <Button onClick={() => navigate('/guild-quiz')} className="w-full shrink-0 gap-2 bg-vocation-accent font-bold text-vocation-accent-foreground hover:bg-vocation-accent/90 sm:w-auto">
            {result ? (pt ? 'Refazer quiz de vocação' : 'Retake vocation quiz') : (pt ? 'Descobrir minha vocação' : 'Find my vocation')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </section>
  );
}

/** Title line shown inside each badge category: earned titles, or the locked title to aim for. */
export function CategoryTitles({ category, titles, lang }: { category: VocationCategory | 'taskmates'; titles: OccupationTitle[]; lang: 'pt' | 'en' }) {
  const pt = lang === 'pt';
  const occ = OCCUPATIONS[category];
  const mine = titles.filter(t => t.category === category);
  return (
    <div className="mb-4 rounded-xl border border-vocation-accent/40 bg-card/70 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{pt ? 'Título deste selo' : 'Title for this badge'}</p>
      {mine.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {mine.map(t => <span key={t.key} className="inline-flex items-center gap-1 rounded-full border border-warning/60 bg-warning/10 px-2.5 py-1 text-xs font-black"><Crown className="h-3 w-3 text-warning" aria-hidden="true" />{t.name}</span>)}
        </div>
      ) : (
        <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" /><span aria-hidden="true">{occ.emoji}</span>{occupationName(category, lang, 'neutral', '[Tag]')}
          <span className="font-normal text-xs">· {pt ? 'liberado ao ganhar o selo' : 'unlocked with the badge'}</span>
        </p>
      )}
    </div>
  );
}
