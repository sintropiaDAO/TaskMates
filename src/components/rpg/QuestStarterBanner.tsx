import { motion } from 'framer-motion';
import { Swords, Handshake, Star, PlusCircle, Sparkles } from 'lucide-react';
import { useAdventurer } from '@/hooks/useAdventurer';
import { useLanguage } from '@/contexts/LanguageContext';
import { EXP_RULES } from '@/lib/rpg';

/** Call-to-action shown to adventurers who still have 0 EXP. */
export function QuestStarterBanner({ userId, onCreate, onExplore }: { userId: string; onCreate: () => void; onExplore: () => void }) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { stats, loading } = useAdventurer(userId);
  if (loading || !stats || stats.exp > 0) return null;

  const actions = [
    { icon: PlusCircle, exp: EXP_RULES.itemCreated, label: pt ? 'Crie sua 1ª quest, produto ou opinião' : 'Create your 1st quest, product or opinion', tone: 'from-sky-500/25 to-sky-500/5 text-sky-500', onClick: onCreate },
    { icon: Handshake, exp: EXP_RULES.questCollaborated, label: pt ? 'Colabore em uma quest de outra pessoa' : 'Join someone else\'s quest', tone: 'from-emerald-500/25 to-emerald-500/5 text-emerald-500', onClick: onExplore },
    { icon: Swords, exp: EXP_RULES.questCompleted, label: pt ? 'Conclua uma quest' : 'Complete a quest', tone: 'from-rose-500/25 to-rose-500/5 text-rose-500', onClick: onCreate },
    { icon: Star, exp: EXP_RULES.fiveStarRating, label: pt ? 'Receba uma avaliação 5 estrelas' : 'Earn a 5-star rating', tone: 'from-amber-400/30 to-amber-400/5 text-amber-500', onClick: onExplore },
  ];

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-4 mb-4 border border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/15 via-card to-sky-500/15 shadow-soft">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-stone-500 to-stone-700 flex flex-col items-center justify-center shadow-lg">
          <span className="text-[8px] font-bold uppercase text-primary-foreground/90">Rank</span>
          <span className="text-xl font-black text-primary-foreground leading-none">F</span>
        </div>
        <div className="min-w-0">
          <h3 className="font-bold flex items-center gap-1"><Sparkles className="w-4 h-4 text-amber-500" />{pt ? 'Sua jornada começa agora!' : 'Your journey starts now!'}</h3>
          <p className="text-xs text-muted-foreground">{pt ? 'Você tem 0 EXP. Complete ações para subir de Rank F até SSS.' : 'You have 0 EXP. Complete actions to climb from Rank F to SSS.'}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map(a => (
          <button key={a.label} onClick={a.onClick}
            className={`flex items-center gap-2 rounded-xl bg-gradient-to-r ${a.tone} border border-border/40 p-2.5 text-left hover:scale-[1.02] transition-transform`}>
            <a.icon className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-xs font-medium text-foreground">{a.label}</span>
            <span className="text-xs font-black">+{a.exp} EXP</span>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
