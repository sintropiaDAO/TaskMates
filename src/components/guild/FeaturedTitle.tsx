import { Crown } from 'lucide-react';
import { OCCUPATIONS } from '@/lib/guildQuiz';
import { useOccupationTitles } from '@/hooks/useOccupationTitles';

/** Shows the highest-level occupation title; renders nothing until a badge is earned. */
export function FeaturedTitle({ userId, lang }: { userId: string; lang: 'pt' | 'en' }) {
  const { featured, titles } = useOccupationTitles(userId, lang);
  if (!featured) return null;
  return (
    <p className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-warning/50 bg-warning/15 px-2.5 py-1 text-xs font-black text-foreground" title={lang === 'pt' ? `${titles.length} título(s) conquistado(s)` : `${titles.length} title(s) earned`}>
      <Crown className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
      <span aria-hidden="true">{OCCUPATIONS[featured.category].emoji}</span>
      <span className="truncate">{featured.name}</span>
    </p>
  );
}
