import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Swords, Handshake, ScrollText, Shield, Sparkles, Crown, Info } from 'lucide-react';
import { useAdventurer, type AdventurerStats } from '@/hooks/useAdventurer';
import { RANKS, EXP_RULES } from '@/lib/rpg';
import { useLanguage } from '@/contexts/LanguageContext';
import { titleForRank } from '@/lib/rpg';
import { ScoresBoard } from './ScoresBoard';
import { AdventureHeading } from './AdventureHeading';
import { Button } from '@/components/ui/button';

export function CharacterSheet({ userId, preloaded, showHeading = true }: { userId: string; preloaded?: AdventurerStats | null; showHeading?: boolean }) {
  const { language } = useLanguage();
  const lang = language === 'pt' ? 'pt' : 'en';
  const fetched = useAdventurer(preloaded ? undefined : userId);
  const stats = preloaded ?? fetched.stats;
  const loading = !preloaded && fetched.loading;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const reduced = useReducedMotion();

  if (loading || !stats) return <div className="animate-pulse h-40 bg-muted rounded-2xl" />;

  const pct = stats.rankNext ? Math.min(100, ((stats.exp - stats.rankFloor) / Math.max(1, stats.rankNext - stats.rankFloor)) * 100) : 100;

  const pt = lang === 'pt';
  const attrs = [
    { icon: Swords, label: pt ? 'Execução' : 'Execution', value: stats.execution, hint: pt ? 'Quests solo' : 'Solo quests', tone: 'achievement-tone-flower',
      tip: pt ? 'Tarefas concluídas em que você foi o único executor: tarefas pessoais, ofertas suas e solicitações em que você foi o único colaborador.' : 'Completed tasks where you were the only doer: personal tasks, your offers and requests where you were the sole collaborator.' },
    { icon: Handshake, label: pt ? 'Cooperação' : 'Cooperation', value: stats.cooperation, hint: pt ? 'Quests em grupo' : 'Party quests', tone: 'achievement-tone-forest',
      tip: pt ? 'Colaborações aprovadas em tarefas de outras pessoas e tarefas suas que receberam colaboração de outros participantes.' : 'Approved collaborations on other people’s tasks and your tasks that received collaboration from other participants.' },
    { icon: ScrollText, label: pt ? 'Sabedoria' : 'Wisdom', value: stats.wisdom, hint: pt ? 'Opiniões e votos' : 'Opinions & votes', tone: 'achievement-tone-water',
      tip: pt ? 'Opiniões criadas, votos dados e comentários em opiniões.' : 'Opinions created, votes cast and comments on opinions.' },
    { icon: Shield, label: pt ? 'Honra' : 'Honor', value: stats.honor, hint: pt ? 'Reputação (0-100)' : 'Reputation (0-100)', tone: 'achievement-tone-sun',
      tip: pt ? 'Média das avaliações recebidas convertida para 0 a 100.' : 'Average of ratings received, scaled 0 to 100.' },
  ];

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="achievement-world relative min-w-0 space-y-5"
    >
      {showHeading && <AdventureHeading title={pt ? 'Status do Aventureiro' : 'Adventurer Status'} subtitle={pt ? 'A vida é uma aventura!' : 'Life is an adventure!'} />}
      <div className="flex items-center gap-4 px-1">
        <motion.div
          initial={reduced ? false : { scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220 }}
          className={`adventure-rank adventure-rank-${stats.rank} relative w-20 h-20 shrink-0 rounded-xl border-2 border-card flex flex-col items-center justify-center`}
          title={titleForRank(stats.rank, lang)}
        >
          {stats.rank === 'SSS' && <Crown className="absolute -top-3 w-5 h-5 text-warning" />}
          <span className="text-[9px] uppercase font-bold">Rank</span>
          <span className="text-3xl font-black leading-none">{stats.rank}</span>
        </motion.div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black break-words">
            {titleForRank(stats.rank, lang)} <span className="text-sm font-semibold text-primary">· Rank {stats.rank}</span>
          </h3>
          <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div initial={reduced ? false : { width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: reduced ? 0 : 0.8 }}
              className="achievement-exp-fill h-full rounded-full" />
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary inline-block align-[-1.5px] mr-1" />
            {stats.exp} EXP · {stats.rankNext !== null
              ? (lang === 'pt' ? `faltam ${Math.max(0, stats.rankNext - stats.exp)} para o Rank ${RANKS[RANKS.indexOf(stats.rank) + 1]}` : `${Math.max(0, stats.rankNext - stats.exp)} to Rank ${RANKS[RANKS.indexOf(stats.rank) + 1]}`)
              : (lang === 'pt' ? 'Top 10 do app!' : 'App Top 10!')}
          </p>
        </div>
      </div>

      <details className="border-y border-border py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-primary"><Info className="h-4 w-4" />{pt ? 'EXP e multiplicador de jornadas' : 'EXP and journey multiplier'}<span className="ml-auto">x{stats.multiplier.toFixed(1)}</span></summary>
        <p className="mt-3 text-xs text-muted-foreground">
          {lang === 'pt'
            ? `Ganhe mais EXP: conclua tarefas (+${EXP_RULES.questCompleted}), colabore (+${EXP_RULES.questCollaborated}), receba 5★ (+${EXP_RULES.fiveStarRating}) e crie tarefas, produtos ou opiniões (+${EXP_RULES.itemCreated}).`
            : `Earn more EXP: complete tasks (+${EXP_RULES.questCompleted}), collaborate (+${EXP_RULES.questCollaborated}), get 5★ (+${EXP_RULES.fiveStarRating}) and create tasks, products or opinions (+${EXP_RULES.itemCreated}).`}
        </p>
        <p className="mt-2 text-xs font-semibold text-primary">
          {lang === 'pt'
            ? `🗺️ Multiplicador de Jornadas: x${stats.multiplier.toFixed(1)} (${stats.journeysCompleted} concluídas). Cada jornada concluída dá +${EXP_RULES.journeyCompleted} EXP e +10% em todo o seu EXP, até x2.`
            : `🗺️ Journey multiplier: x${stats.multiplier.toFixed(1)} (${stats.journeysCompleted} completed). Each completed journey gives +${EXP_RULES.journeyCompleted} EXP and +10% on all your EXP, up to x2.`}
        </p>
      </details>

      <TooltipProvider delayDuration={0}>
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2">
          {attrs.map(a => (
            <Tooltip key={a.label} open={openKey === a.label ? true : undefined}
              onOpenChange={(o) => { if (!o && openKey === a.label) setOpenKey(null); }}>
              <TooltipTrigger asChild>
                <Button variant="achievement" onClick={() => setOpenKey(openKey === a.label ? null : a.label)}
                  aria-label={a.label}
                  className={`h-auto min-h-28 p-3 text-center flex flex-col items-center cursor-help ${a.tone}`}>
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                    <a.icon className="w-3.5 h-3.5" />{a.label}
                  </div>
                  <p className="text-xl font-black mt-1 text-foreground">{a.value}</p>
                  <p className="text-[10px] text-muted-foreground">{a.hint}</p>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-center"><p className="text-xs">{a.tip}</p></TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      <ScoresBoard userId={userId} tasksCount={stats.tasksParticipated} />
    </motion.section>
  );
}
