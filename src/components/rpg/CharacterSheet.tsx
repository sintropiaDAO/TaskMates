import { motion } from 'framer-motion';
import { Swords, Handshake, ScrollText, Shield, Sparkles, Crown } from 'lucide-react';
import { useAdventurer, type AdventurerStats } from '@/hooks/useAdventurer';
import { RANKS, EXP_RULES } from '@/lib/rpg';
import { useLanguage } from '@/contexts/LanguageContext';
import { titleForLevel, RANK_STYLES } from '@/lib/rpg';
import { ScoresBoard } from './ScoresBoard';

export function CharacterSheet({ userId, preloaded }: { userId: string; preloaded?: AdventurerStats | null }) {
  const { language } = useLanguage();
  const lang = language === 'pt' ? 'pt' : 'en';
  const fetched = useAdventurer(preloaded ? undefined : userId);
  const stats = preloaded ?? fetched.stats;
  const loading = !preloaded && fetched.loading;

  if (loading || !stats) return <div className="animate-pulse h-40 bg-muted rounded-2xl" />;

  const span = Math.max(1, stats.nextLevel - stats.levelStart);
  const pct = Math.min(100, ((stats.exp - stats.levelStart) / span) * 100);
  const rs = RANK_STYLES[stats.rank];
  const rankPct = stats.rankNext ? Math.min(100, ((stats.exp - stats.rankFloor) / Math.max(1, stats.rankNext - stats.rankFloor)) * 100) : 100;

  const attrs = [
    { icon: Swords, label: lang === 'pt' ? 'Execução' : 'Execution', value: stats.execution, hint: lang === 'pt' ? 'Quests concluídas' : 'Quests completed', tone: 'from-rose-500/25 to-red-500/10 border-rose-400/40 text-rose-500' },
    { icon: Handshake, label: lang === 'pt' ? 'Cooperação' : 'Cooperation', value: stats.cooperation, hint: lang === 'pt' ? 'Quests em grupo' : 'Party quests', tone: 'from-emerald-500/25 to-teal-500/10 border-emerald-400/40 text-emerald-500' },
    { icon: ScrollText, label: lang === 'pt' ? 'Sabedoria' : 'Wisdom', value: stats.wisdom, hint: lang === 'pt' ? 'Opiniões e votos' : 'Opinions & votes', tone: 'from-indigo-500/25 to-violet-500/10 border-indigo-400/40 text-indigo-500' },
    { icon: Shield, label: lang === 'pt' ? 'Honra' : 'Honor', value: stats.honor, hint: lang === 'pt' ? 'Reputação (0-100)' : 'Reputation (0-100)', tone: 'from-amber-400/30 to-yellow-500/10 border-amber-400/50 text-amber-500' },
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
            {titleForLevel(stats.level, lang)} <span className="text-sm font-semibold text-primary">· {lang === 'pt' ? 'Nível' : 'Lv.'} {stats.level}</span>
          </h2>
          <p className="text-[11px] font-medium bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">{rs.label[lang]}</p>
          <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-fuchsia-500" />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            {stats.exp} EXP · {lang === 'pt' ? `faltam ${stats.nextLevel - stats.exp} para o Nível ${stats.level + 1}` : `${stats.nextLevel - stats.exp} to Level ${stats.level + 1}`}
          </p>
        </div>
      </div>

      <div className="relative rounded-xl bg-background/50 border border-border/40 p-2.5">
        <div className="flex justify-between text-[11px] font-medium mb-1">
          <span>Rank {stats.rank}</span>
          <span className="text-muted-foreground">
            {stats.rankNext !== null
              ? (lang === 'pt' ? `faltam ${Math.max(0, stats.rankNext - stats.exp)} EXP para o Rank ${RANKS[RANKS.indexOf(stats.rank) + 1]}` : `${Math.max(0, stats.rankNext - stats.exp)} EXP to Rank ${RANKS[RANKS.indexOf(stats.rank) + 1]}`)
              : (lang === 'pt' ? 'Top 10 do app!' : 'App Top 10!')}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${rankPct}%` }} transition={{ duration: 0.9 }}
            className={`h-full rounded-full bg-gradient-to-r ${rs.badge}`} />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {lang === 'pt'
            ? `Ganhe mais EXP: conclua tarefas (+${EXP_RULES.questCompleted}), colabore (+${EXP_RULES.questCollaborated}), receba 5★ (+${EXP_RULES.fiveStarRating}) e crie tarefas, produtos ou opiniões (+${EXP_RULES.itemCreated}).`
            : `Earn more EXP: complete tasks (+${EXP_RULES.questCompleted}), collaborate (+${EXP_RULES.questCollaborated}), get 5★ (+${EXP_RULES.fiveStarRating}) and create tasks, products or opinions (+${EXP_RULES.itemCreated}).`}
        </p>
      </div>

      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2">
        {attrs.map(a => (
          <div key={a.label} className={`rounded-xl bg-gradient-to-br border p-3 ${a.tone}`} title={a.hint}>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <a.icon className="w-3.5 h-3.5" />{a.label}
            </div>
            <p className="text-xl font-black mt-1 text-foreground">{a.value}</p>
            <p className="text-[10px] text-muted-foreground">{a.hint}</p>
          </div>
        ))}
      </div>

      <ScoresBoard userId={userId} />
    </motion.section>
  );
}
