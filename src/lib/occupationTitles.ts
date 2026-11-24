// Occupation titles are earned only from persisted badges; the quiz merely suggests a vocation.
import { occupationName, type TitleForm, type VocationCategory } from '@/lib/guildQuiz';

export interface BadgeLike { category: string; level: number; entity_name: string | null; earned_at: string; updated_at?: string }
export interface OccupationTitle { category: VocationCategory | 'taskmates'; level: number; name: string; earned_at: string }

const KNOWN = new Set(['leadership', 'collaboration', 'positive_impact', 'sociability', 'reliability', 'consistency', 'proactivity', 'habits', 'communities', 'taskmates']);

export function occupationTitles(badges: BadgeLike[], lang: 'pt' | 'en', form: TitleForm = 'neutral'): OccupationTitle[] {
  return badges
    .filter(b => b.level > 0 && KNOWN.has(b.category))
    .map(b => {
      const category = b.category as VocationCategory | 'taskmates';
      return { category, level: b.level, earned_at: b.updated_at ?? b.earned_at, name: `${occupationName(category, lang, form, b.entity_name)} Nv. ${b.level}` };
    })
    .sort((a, b) => b.level - a.level || Date.parse(b.earned_at) - Date.parse(a.earned_at));
}

/** Highest level wins; ties go to the most recent. */
export function featuredTitle(badges: BadgeLike[], lang: 'pt' | 'en', form: TitleForm = 'neutral'): OccupationTitle | null {
  return occupationTitles(badges, lang, form)[0] ?? null;
}
