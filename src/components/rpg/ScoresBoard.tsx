import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, UserPlus, ThumbsUp, Star, Sparkles, Package, Megaphone, CalendarCheck, Map as MapIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchConfirmedAttendances } from '@/lib/eventAttendance';
import { useCoins } from '@/hooks/useCoins';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const head = { count: 'exact' as const, head: true };

const ITEMS = [
  { key: 'TASKS', icon: CheckCircle, pt: 'Tarefas Concluídas', en: 'Completed Tasks', tone: 'achievement-tone-forest',
    tip: { pt: 'Todas as tarefas concluídas em que você participou, em qualquer papel: criador, solicitante ou colaborador.', en: 'All completed tasks you took part in, in any role: creator, requester or collaborator.' } },
  { key: 'SUPPLIED', icon: Package, pt: 'Fornecidos', en: 'Supplied', tone: 'achievement-tone-forest',
    tip: { pt: 'Produtos que você forneceu e tiveram a entrega confirmada.', en: 'Products you supplied that had delivery confirmed.' } },
  { key: 'SOLICITATIONS', icon: UserPlus, pt: 'Solicitações', en: 'Requests', tone: 'achievement-tone-water',
    tip: { pt: 'Solicitações recebidas nas suas tarefas. +1 ao receber, -1 se retirada.', en: 'Requests received on your tasks. +1 when received, -1 if withdrawn.' } },
  { key: 'VOICE', icon: Megaphone, pt: 'Voz Ativa', en: 'Active Voice', tone: 'achievement-tone-water',
    tip: { pt: 'Votos que você registrou em opiniões e enquetes da comunidade.', en: 'Votes you cast in community opinions and polls.' } },
  { key: 'ATTENDANCE', icon: CalendarCheck, pt: 'Presenças', en: 'Attendances', tone: 'achievement-tone-flower',
    tip: { pt: 'Eventos com presença confirmada (+5 EXP cada). Não conta eventos que você criou ou em que colaborou.', en: 'Events with confirmed attendance (+5 EXP each). Excludes events you created or collaborated on.' } },
  { key: 'JOURNEYS', icon: MapIcon, pt: 'Jornadas', en: 'Journeys', tone: 'achievement-tone-magic',
    tip: { pt: 'Jornadas concluídas. Cada uma dá +15 EXP e +10% no multiplicador de EXP (até x2), para você subir de nível mais rápido.', en: 'Completed journeys. Each gives +15 EXP and +10% EXP multiplier (up to x2), so you level up faster.' } },
  { key: 'LIKES', icon: ThumbsUp, pt: 'Likes', en: 'Likes', tone: 'achievement-tone-sun',
    tip: { pt: 'Curtidas recebidas em comentários.', en: 'Likes received on comments.' } },
  { key: 'MAX_RATING', icon: Star, pt: 'Avaliação Máxima', en: 'Max Rating', tone: 'achievement-tone-sun',
    tip: { pt: 'Avaliações 5/5 recebidas, menos denúncias.', en: '5/5 ratings received, minus reports.' } },
];

const LUCKY_TIP = { pt: 'Estrelas ganhas ao completar tarefas. Use para destacar publicações por 7 dias.', en: 'Stars earned by completing tasks. Use to highlight posts for 7 days.' };

export function ScoresBoard({ userId, tasksCount }: { userId: string; tasksCount?: number }) {
  const { getBalance, loading } = useCoins(userId);
  const { language } = useLanguage();
  const lang = language === 'pt' ? 'pt' : 'en';
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [voiceCount, setVoiceCount] = useState<number | null>(null);
  const [attendCount, setAttendCount] = useState<number | null>(null);
  const [openSide, setOpenSide] = useState<'top' | 'bottom'>('bottom');
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.from('poll_votes').select('id', head).eq('user_id', userId)
      .then(({ count }) => { if (!cancelled) setVoiceCount(count ?? 0); });
    fetchConfirmedAttendances(userId).then(n => { if (!cancelled) setAttendCount(n); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />;

  const tipProps = (key: string) => ({
    open: openKey === key ? true : undefined,
    onOpenChange: (o: boolean) => { if (!o && openKey === key) setOpenKey(null); },
  });
  const toggle = (key: string) => setOpenKey(openKey === key ? null : key);
  const updateSide = (el: HTMLElement | null) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setOpenSide(rect.bottom > window.innerHeight - 170 ? 'top' : 'bottom');
  };

  const valueFor = (key: string) => {
    if (key === 'TASKS' && tasksCount !== undefined) return tasksCount;
    if (key === 'VOICE' && voiceCount !== null) return voiceCount;
    if (key === 'ATTENDANCE') return attendCount ?? 0;
    return getBalance(key);
  };

  return (
    <div className="relative space-y-2">
      <h3 className="text-base font-black flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />{lang === 'pt' ? 'Pontuações' : 'Scores'}
      </h3>
      <TooltipProvider delayDuration={0}>
        <Tooltip {...tipProps('LUCKY_STARS')}>
          <TooltipTrigger asChild>
            <Button variant="achievement" aria-label={lang === 'pt' ? 'Estrelas da Sorte' : 'Lucky Stars'}
              onClick={(e) => { toggle('LUCKY_STARS'); updateSide(e.currentTarget); }}
              onPointerEnter={(e) => updateSide(e.currentTarget)}
              onFocus={(e) => updateSide(e.currentTarget)}
              className="achievement-tone-sun w-full h-auto relative rounded-lg p-3 flex items-center gap-3 text-left cursor-help"
            >
              <motion.div animate={reduced ? undefined : { rotate: [0, 10, -10, 0] }} transition={{ duration: 1.8 }}
                className="w-11 h-11 shrink-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{lang === 'pt' ? 'Estrelas da Sorte' : 'Lucky Stars'}</p>
              </div>
              <span className="text-3xl font-black text-foreground">{getBalance('LUCKY_STARS')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side={openSide} className="max-w-[220px] text-center"><p className="text-xs">{LUCKY_TIP[lang]}</p></TooltipContent>
        </Tooltip>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ITEMS.map(it => (
            <Tooltip key={it.key} {...tipProps(it.key)}>
              <TooltipTrigger asChild>
                <Button variant="achievement" aria-label={it[lang]}
                  onClick={(e) => { toggle(it.key); updateSide(e.currentTarget); }}
                  onPointerEnter={(e) => updateSide(e.currentTarget)}
                  onFocus={(e) => updateSide(e.currentTarget)}
                  className={`h-auto min-h-24 p-3 flex flex-col items-center text-center gap-1 cursor-help ${it.tone}`}>
                  <it.icon className="w-4 h-4" />
                  <span className="text-[11px] font-semibold leading-tight">{it[lang]}</span>
                  <span className="text-2xl font-black text-foreground">{valueFor(it.key)}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side={openSide} className="max-w-[220px] text-center"><p className="text-xs">{it.tip[lang]}</p></TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
