import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Lock, Loader2, RotateCcw, Share2, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { AdventureScene } from '@/components/auth/AdventureScene';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { supabase } from '@/integrations/supabase/client';
import { LEVEL_THRESHOLDS } from '@/hooks/useBadges';
import { createJourney, evaluateJourney } from '@/hooks/useJourneys';
import { GUILD_QUIZ, OCCUPATIONS, buildJourneySteps, needsTag, occupationName, rankVocations, scoreAnswers, type VocationCategory } from '@/lib/guildQuiz';
import { OCCUPATION_IMAGES } from '@/lib/occupationImages';
import type { CapyveraPose } from '@/components/capy/Capyvera';
import garden from '@/assets/adventure/solarpunk-garden.jpg';

const db = supabase as any;
const POSES: CapyveraPose[] = ['wave', 'thinking', 'explorer', 'star', 'gardener', 'idle', 'planting', 'butterflies', 'teacher'];

export default function GuildQuiz() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const lang = language === 'pt' ? 'pt' : 'en';
  const pt = lang === 'pt';
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { tags, userTags } = useTags();
  const [answers, setAnswers] = useState<number[]>([]);
  const [remaining, setRemaining] = useState<Partial<Record<VocationCategory, number>>>({});
  const [tagId, setTagId] = useState<string | null>(null);
  const [tagConfirmed, setTagConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void db.rpc('get_public_user_badges', { _user_id: user.id }).then(({ data }: { data: any[] | null }) => {
      const r: Partial<Record<VocationCategory, number>> = {};
      for (const b of data ?? []) {
        const next = LEVEL_THRESHOLDS[b.level] ?? Infinity;
        const left = Math.max(0, next - (b.metric_value ?? 0));
        const c = b.category as VocationCategory;
        r[c] = Math.min(r[c] ?? Infinity, left);
      }
      setRemaining(r);
    });
  }, [user]);

  const step = answers.length;
  const finished = step >= GUILD_QUIZ.length;
  const ranking = useMemo(() => finished ? rankVocations(scoreAnswers(answers), remaining) : [], [finished, answers, remaining]);
  const main = ranking[0];
  const secondary = ranking[1];
  const askTag = !!main && needsTag(main) && !tagConfirmed;

  const tagOptions = useMemo(() => {
    if (!main || !needsTag(main)) return [];
    const cat = main === 'habits' ? 'skills' : 'communities';
    const followed = new Set(userTags.map((ut: any) => ut.tag_id));
    return (tags as any[]).filter(t => t.category === cat).sort((a, b) => Number(followed.has(b.id)) - Number(followed.has(a.id))).slice(0, 16);
  }, [main, tags, userTags]);
  const tagName = tagOptions.find(t => t.id === tagId)?.name ?? (tags as any[]).find(t => t.id === tagId)?.name ?? null;

  const restart = () => { setAnswers([]); setTagId(null); setTagConfirmed(false); };

  const accept = async () => {
    if (!user || !main) return;
    setSaving(true);
    try {
      const occ = occupationName(main, lang, 'neutral', tagName);
      const o = OCCUPATIONS[main];
      const steps = buildJourneySteps(main, tagId, lang);
      const journeyId = await createJourney({
        userId: user.id,
        title: pt ? `Missão do(a) ${occ}` : `${occ} Quest`,
        description: pt ? `${o.phrase.pt} Rumo ao selo ${o.badge.pt} e ao título ${occ}.` : `${o.phrase.en} Toward the ${o.badge.en} badge and the ${occ} title.`,
        image_url: garden,
        tag_ids: tagId ? [tagId] : [],
        is_ordered: true,
        steps,
        rewards: [{ description: pt ? `Rumo ao selo ${o.badge.pt} e ao título ${occ}. O título é conquistado junto com o selo.` : `Toward the ${o.badge.en} badge and the ${occ} title. The title is earned together with the badge.` }],
      });
      const { error: statusError } = await db.from('journeys').update({ status: 'private' }).eq('id', journeyId);
      if (statusError) throw statusError;
      const { error: joinError } = await db.from('journey_participants').insert({ journey_id: journeyId, user_id: user.id, status: 'active' });
      if (joinError) throw joinError;
      const { error: resultError } = await db.from('guild_quiz_results').upsert({
        user_id: user.id, primary_category: main, secondary_category: secondary ?? null, target_tag_id: tagId, journey_id: journeyId,
      }, { onConflict: 'user_id' });
      if (resultError) throw resultError;
      await evaluateJourney(journeyId).catch(() => undefined);
      toast.success(pt ? 'Missão aceita! Boa aventura.' : 'Quest accepted! Good adventure.');
      navigate(`/journeys/${journeyId}`);
    } catch (e) {
      console.error(e);
      toast.error(pt ? 'Não foi possível criar sua missão. Tente novamente.' : 'Could not create your quest. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    if (!main) return;
    const text = pt ? `Minha vocação aventureira no TaskMates é ${occupationName(main, 'pt', 'neutral', tagName)}! Descubra a sua:` : `My TaskMates adventurer vocation is ${occupationName(main, 'en', 'neutral', tagName)}! Find yours:`;
    const url = `${window.location.origin}/guild-quiz`;
    try {
      if (navigator.share) await navigator.share({ title: 'TaskMates', text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); toast.success(pt ? 'Convite copiado!' : 'Invite copied!'); }
    } catch { /* user cancelled */ }
  };

  const pose: CapyveraPose = finished ? 'trophy' : POSES[step % POSES.length] ?? 'idle';
  const anim = reduced ? {} : { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 }, transition: { duration: 0.3 } };

  return (
    <AdventureScene pose={pose} compact>
      <main className="relative z-10 mx-auto flex min-h-svh max-w-xl flex-col px-4 pb-40 pt-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => (step > 0 && !finished ? setAnswers(a => a.slice(0, -1)) : navigate(-1))}><ArrowLeft className="mr-1 h-4 w-4" />{pt ? 'Voltar' : 'Back'}</Button>
          <span className="text-xs font-black text-primary">{pt ? 'A vida é uma aventura!' : 'Life is an adventure!'}</span>
        </div>
        <div className="mt-3" aria-label={pt ? 'Trilha do quiz' : 'Quiz trail'}>
          <div className="flex gap-1">
            {GUILD_QUIZ.map((_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i < step ? 'bg-primary' : 'bg-card/80 border border-primary/30'}`} />)}
          </div>
          <p className="mt-1 text-[11px] font-bold text-muted-foreground">{finished ? (pt ? 'Trilha concluída!' : 'Trail complete!') : `${pt ? 'Pergunta' : 'Question'} ${step + 1}/${GUILD_QUIZ.length}`}</p>
        </div>

        <AnimatePresence mode="wait">
          {!finished && GUILD_QUIZ[step] && (
            <motion.section key={step} {...anim} className="mt-6 space-y-4">
              <h1 className="rounded-2xl border-2 border-primary/30 bg-card/90 p-4 text-xl font-black leading-snug shadow-[var(--clay-shadow-sm-card)] backdrop-blur">{GUILD_QUIZ[step].title[lang]}</h1>
              <div className="grid gap-3">
                {GUILD_QUIZ[step].answers.map((a, i) => (
                  <motion.button key={i} type="button" whileTap={reduced ? undefined : { scale: 0.97 }} whileHover={reduced ? undefined : { y: -2 }}
                    onClick={() => setAnswers(prev => [...prev, i])}
                    className="rounded-2xl border-2 border-primary/25 bg-card/95 p-4 text-left text-sm font-bold shadow-[var(--clay-shadow-sm-card)] transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {a.label[lang]}
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}

          {finished && askTag && main && (
            <motion.section key="tag" {...anim} className="mt-6 space-y-4">
              <h1 className="rounded-2xl border-2 border-primary/30 bg-card/90 p-4 text-xl font-black shadow-[var(--clay-shadow-sm-card)]">
                {main === 'habits' ? (pt ? 'Qual ofício você quer dominar?' : 'Which craft do you want to master?') : (pt ? 'Qual vila você quer proteger?' : 'Which village do you want to protect?')}
              </h1>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map(t => (
                  <Button key={t.id} size="sm" variant={tagId === t.id ? 'default' : 'outline'} className="rounded-full bg-card/90" onClick={() => setTagId(t.id)}>#{t.name}</Button>
                ))}
              </div>
              <Button className="w-full font-bold" disabled={!tagId} onClick={() => setTagConfirmed(true)}>{pt ? 'Revelar minha vocação' : 'Reveal my vocation'}</Button>
            </motion.section>
          )}

          {finished && !askTag && main && (
            <motion.section key="reveal" initial={reduced ? false : { opacity: 0, scale: 0.85, rotateY: 90 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} transition={{ duration: reduced ? 0 : 0.6, type: 'spring' }} className="mt-6 space-y-4">
              <div className="journey-card relative overflow-hidden rounded-3xl border-4 border-warning/70 p-5 text-center shadow-[var(--clay-shadow-sm-card)]">
                <p className="text-xs font-black uppercase tracking-wider text-warning">{pt ? 'Sua vocação' : 'Your vocation'}</p>
                <motion.div className="mx-auto my-3 w-40 overflow-hidden rounded-3xl border-4 border-warning/60 bg-card shadow-[var(--clay-shadow-sm-card)]" animate={reduced ? undefined : { y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>
                  <img src={OCCUPATION_IMAGES[main]} alt={pt ? `Capyvera como ${occupationName(main, 'pt', 'neutral', tagName)}` : `Capyvera as ${occupationName(main, 'en', 'neutral', tagName)}`} className="aspect-square w-full object-contain" />
                </motion.div>
                <h1 className="text-2xl font-black text-journey-foreground">{occupationName(main, lang, 'neutral', tagName)}</h1>
                <p className="mt-2 text-sm font-semibold italic text-journey-foreground/90">"{OCCUPATIONS[main].phrase[lang]}"</p>
                <div className="mt-4 rounded-xl bg-journey-foreground/15 p-3 text-left text-xs text-journey-foreground">
                  <p className="font-black">{pt ? 'Selo-alvo' : 'Target badge'}: {OCCUPATIONS[main].badge[lang]}</p>
                  <p className="mt-1">{OCCUPATIONS[main].criterion[lang]}</p>
                  <p className="mt-2 flex items-center gap-1 font-bold text-warning"><Lock className="h-3.5 w-3.5" />{pt ? 'Conquiste o selo para receber este título.' : 'Earn the badge to receive this title.'}</p>
                </div>
                {secondary && <p className="mt-3 text-xs font-bold text-journey-foreground/85">{pt ? 'Vocação secundária' : 'Secondary vocation'}: {OCCUPATIONS[secondary].emoji} {occupationName(secondary, lang, 'neutral', pt ? '[Tag]' : '[Tag]')}</p>}
              </div>
              <Button className="h-12 w-full gap-2 bg-warning text-base font-black text-warning-foreground hover:bg-warning/90" disabled={saving || !user} onClick={() => void accept()}>
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Swords className="h-5 w-5" />}{pt ? 'Aceitar a Missão' : 'Accept the Quest'}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2 bg-card/90" onClick={restart}><RotateCcw className="h-4 w-4" />{pt ? 'Refazer quiz' : 'Retake quiz'}</Button>
                <Button variant="outline" className="gap-2 bg-card/90" onClick={() => void share()}><Share2 className="h-4 w-4" />{pt ? 'Convidar Amigos' : 'Invite Friends'}</Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </AdventureScene>
  );
}
