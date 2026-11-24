import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOccupationTitles } from '@/hooks/useOccupationTitles';
import { unseenTitles } from '@/lib/occupationTitles';
import { dispatchCompletionCelebration } from '@/lib/completion-celebration';

/** App-wide: celebrates occupation titles earned or leveled up since the last visit (presentation only). */
export function NewTitleWatcher() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { titles, loaded } = useOccupationTitles(user?.id, language === 'pt' ? 'pt' : 'en');
  useEffect(() => {
    if (!user || !loaded) return;
    const key = `taskmates:seen-titles:${user.id}`;
    let seen: string[] | null = null;
    try { const raw = localStorage.getItem(key); seen = raw ? JSON.parse(raw) : null; } catch { seen = null; }
    for (const t of unseenTitles(titles, seen)) {
      dispatchCompletionCelebration({ kind: 'title', id: t.key, title: t.name, level: t.level });
    }
    localStorage.setItem(key, JSON.stringify([...new Set([...(seen ?? []), ...titles.map(t => t.key)])]));
  }, [user, loaded, titles]);
  return null;
}
