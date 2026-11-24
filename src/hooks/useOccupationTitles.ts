import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { occupationTitles, type OccupationTitle, type BadgeLike } from '@/lib/occupationTitles';
import type { TitleForm, VocationCategory } from '@/lib/guildQuiz';

const db = supabase as any;

export interface GuildQuizResult {
  user_id: string;
  primary_category: VocationCategory;
  secondary_category: VocationCategory | null;
  target_tag_id: string | null;
  journey_id: string | null;
  title_form: TitleForm;
}

export function useGuildQuizResult() {
  const { user } = useAuth();
  const [result, setResult] = useState<GuildQuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await db.from('guild_quiz_results').select('*').eq('user_id', user.id).maybeSingle();
    setResult((data as GuildQuizResult) ?? null);
    setLoading(false);
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  const setTitleForm = useCallback(async (form: TitleForm) => {
    if (!user) return;
    const { error } = await db.from('guild_quiz_results').upsert({ user_id: user.id, title_form: form, primary_category: result?.primary_category ?? 'leadership' }, { onConflict: 'user_id' });
    if (!error) setResult(r => r ? { ...r, title_form: form } : { user_id: user.id, title_form: form, primary_category: 'leadership', secondary_category: null, target_tag_id: null, journey_id: null });
  }, [user, result]);
  return { result, loading, reload: load, setTitleForm };
}

/** Earned titles from public badges, always shown in the neutral title form. */
export function useOccupationTitles(userId: string | undefined, lang: 'pt' | 'en') {
  const [badges, setBadges] = useState<BadgeLike[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void (async () => {
      const { data } = await db.rpc('get_public_user_badges', { _user_id: userId });
      if (!alive) return;
      setBadges((data ?? []) as BadgeLike[]);
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [userId]);
  const titles: OccupationTitle[] = useMemo(() => occupationTitles(badges, lang, 'neutral'), [badges, lang]);
  return { titles, featured: titles[0] ?? null, loaded };
}
