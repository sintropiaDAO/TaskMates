import { motion } from 'framer-motion';
import { Swords, Handshake, ScrollText, Shield, Sparkles } from 'lucide-react';
import { useAdventurer } from '@/hooks/useAdventurer';
import { useLanguage } from '@/contexts/LanguageContext';
import { titleForLevel } from '@/lib/rpg';

export function CharacterSheet({ userId }: { userId: string }) {
  const { language } = useLanguage();
  const lang = language === 'pt' ? 'pt' : 'en';
  const { stats, loading } = useAdventurer(userId);

  if (loading || !stats) return <div className="animate-pulse h-40 bg-muted rounded-2xl" />;

  const span = Math.max(1, stats.nextLevel - stats.levelStart);
  const pct = Math.min(100, ((stats.exp - stats.levelStart) / span) * 100);

  const attrs = [
    { icon: Swords, label: lang === 'pt' ? 'Execução' : 'Execution', value: stats.execution, hint: lang === 'pt' ? 'Quests concluídas' : 'Quests completed' },
    { icon: Handshake, label: lang === 'pt' ? 'Cooperação' : 'Cooperation', value: stats.cooperation, hint: lang === 'pt' ? 'Quests em grupo' : 'Party quests' },
    { icon: ScrollText, label: lang === 'pt' ? 'Sabedoria' : 'Wisdom', value: stats.wisdom, hint: lang === 'pt' ? 'Opiniões e votos' : 'Opinions & votes' },
    { icon: Shield, label: lang === 'pt' ? 'Honra' : 'Honor', value: stats.honor, hint: lang === 'pt' ? 'Reputação (0-100)' : 'Reputation (0-100)' },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 border border-border/50 shadow-soft space-y-4"
    >
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0 rounded-2xl bg-primary/15 border-2 border-primary/40 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase font-semibold text-primary">{lang === 'pt' ? 'Nível' : 'Level'}</span>
          <span className="text-2xl font-bold text-primary leading-none">{stats.level}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{lang === 'pt' ? 'Status do Aventureiro' : 'Adventurer Status'}</p>
          <h2 className="text-lg font-bold truncate">{titleForLevel(stats.level, lang)}</h2>
          <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            {stats.exp} EXP · {stats.nextLevel - stats.exp} {lang === 'pt' ? 'para o próximo nível' : 'to next level'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {attrs.map(a => (
          <div key={a.label} className="rounded-xl bg-muted/40 border border-border/40 p-3" title={a.hint}>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <a.icon className="w-3.5 h-3.5 text-primary" />{a.label}
            </div>
            <p className="text-xl font-bold mt-1">{a.value}</p>
            <p className="text-[10px] text-muted-foreground">{a.hint}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
