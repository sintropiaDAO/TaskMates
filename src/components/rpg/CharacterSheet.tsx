import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Swords, Handshake, ScrollText, Shield, Sparkles, Crown } from 'lucide-react';
import { useAdventurer, type AdventurerStats } from '@/hooks/useAdventurer';
import { RANKS, EXP_RULES } from '@/lib/rpg';
import { useLanguage } from '@/contexts/LanguageContext';
import { titleForRank, RANK_STYLES } from '@/lib/rpg';
import { ScoresBoard } from './ScoresBoard';

export function CharacterSheet({ userId, preloaded }: { userId: string; preloaded?: AdventurerStats | null }) {
  const { language } = useLanguage();
  const lang = language === 'pt' ? 'pt' : 'en';
  const fetched = useAdventurer(preloaded ? undefined : userId);
  const stats = preloaded ?? fetched.stats;
  const loading = !preloaded && fetched.loading;
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (loading || !stats) return <div className="animate-pulse h-40 bg-muted rounded-2xl" />;

  const rs = RANK_STYLES[stats.rank];
  const pct = stats.rankNext ? Math.min(100, ((stats.exp - stats.rankFloor) / Math.max(1, stats.rankNext - stats.rankFloor)) * 100) : 100;

  const pt = lang === 'pt';
  const attrs = [
    { icon: Swords, label: pt ? 'Execução' : 'Execution', value: stats.execution, hint: pt ? 'Quests solo' : 'Solo quests', tone: 'from-rose-500/25 to-red-500/10 border-rose-400/40 text-rose-500',
      tip: pt ? 'Tarefas concluídas em que você foi o único executor: tarefas pessoais, ofertas suas e solicitações em que você foi o único colaborador.' : 'Completed tasks where you were the only doer: personal tasks, your offers and requests where you were the sole collaborator.' },
    { icon: Handshake, label: pt ? 'Cooperação' : 'Cooperation', value: stats.cooperation, hint: pt ? 'Quests em grupo' : 'Party quests', tone: 'from-emerald-500/25 to-teal-500/10 border-emerald-400/40 text-emerald-500',
      tip: pt ? 'Colaborações aprovadas em tarefas de outras pessoas e tarefas suas que receberam colaboração de outros participantes.' : 'Approved collaborations on other people’s tasks and your tasks that received collaboration from other participants.' },
    { icon: ScrollText, label: pt ? 'Sabedoria' : 'Wisdom', value: stats.wisdom, hint: pt ? 'Opiniões e votos' : 'Opinions & votes', tone: 'from-indigo-500/25 to-violet-500/10 border-indigo-400/40 text-indigo-500',
      tip: pt ? 'Opiniões criadas, votos dados e comentários em opiniões.' : 'Opinions created, votes cast and comments on opinions.' },
    { icon: Shield, label: pt ? 'Honra' : 'Honor', value: stats.honor, hint: pt ? 'Reputação (0-100)' : 'Reputation (0-100)', tone: 'from-amber-400/30 to-yellow-500/10 border-amber-400/50 text-amber-500',
      tip: pt ? 'Média das avaliações recebidas convertida para 0 a 100.' : 'Average of ratings received, scaled 0 to 100.' },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-5 border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-fuchsia-500/10 shadow-soft space-y-4"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-sky-500/20 blur-3xl" />

      <div className="relative flex items-center gap-4">
        <motion.div
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220 }}
          className={`relative w-20 h-20 shrink-0 rounded-2xl bg-gradient-to-br ${rs.badge} shadow-lg ${rs.glow} border-2 border-background/60 flex flex-col items-center justify-center`}
          title={rs.label[lang]}
        >
          {stats.rank === 'SSS' && <Crown className="absolute -top-3 w-5 h-5 text-amber-400 drop-shadow" />}
          <span className="text-[9px] uppercase font-bold tracking-widest text-primary-foreground/90">Rank</span>
          <span className="text-3xl font-black leading-none text-primary-foreground drop-shadow">{stats.rank}</span>
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{lang === 'pt' ? 'Status do Aventureiro' : 'Adventurer Status'}</p>
          <h2 className="text-lg font-bold truncate">
            {titleForRank(stats.rank, lang)} <span className="text-sm font-semibold text-primary">· Rank {stats.rank}</span>
          </h2>
          <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-fuchsia-500" />
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            <Sparkles className="w-3 h-3 text-amber-500 inline-block align-[-1.5px] mr-1" />
            {stats.exp} EXP · {stats.rankNext !== null
              ? (lang === 'pt' ? `faltam ${Math.max(0, stats.rankNext - stats.exp)} para o Rank ${RANKS[RANKS.indexOf(stats.rank) + 1]}` : `${Math.max(0, stats.rankNext - stats.exp)} to Rank ${RANKS[RANKS.indexOf(stats.rank) + 1]}`)
              : (lang === 'pt' ? 'Top 10 do app!' : 'App Top 10!')}
          </p>
        </div>
      </div>

      <div className="relative rounded-xl bg-background/50 border border-border/40 p-2.5">
        <p className="text-[10px] text-muted-foreground">
          {lang === 'pt'
            ? `Ganhe mais EXP: conclua tarefas (+${EXP_RULES.questCompleted}), colabore (+${EXP_RULES.questCollaborated}), receba 5★ (+${EXP_RULES.fiveStarRating}) e crie tarefas, produtos ou opiniões (+${EXP_RULES.itemCreated}).`
            : `Earn more EXP: complete tasks (+${EXP_RULES.questCompleted}), collaborate (+${EXP_RULES.questCollaborated}), get 5★ (+${EXP_RULES.fiveStarRating}) and create tasks, products or opinions (+${EXP_RULES.itemCreated}).`}
        </p>
      </div>

      <TooltipProvider delayDuration={0}>
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2">
          {attrs.map(a => (
            <Tooltip key={a.label} open={openKey === a.label ? true : undefined}
              onOpenChange={(o) => { if (!o && openKey === a.label) setOpenKey(null); }}>
              <TooltipTrigger asChild>
                <button type="button" onClick={() => setOpenKey(openKey === a.label ? null : a.label)}
                  className={`rounded-xl bg-gradient-to-br border p-3 text-center flex flex-col items-center cursor-help ${a.tone}`}>
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                    <a.icon className="w-3.5 h-3.5" />{a.label}
                  </div>
                  <p className="text-xl font-black mt-1 text-foreground">{a.value}</p>
                  <p className="text-[10px] text-muted-foreground">{a.hint}</p>
                </button>
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
