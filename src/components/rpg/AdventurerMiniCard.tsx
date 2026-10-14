import { useState } from 'react';
import { ChevronRight, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAdventurer } from '@/hooks/useAdventurer';
import { useLanguage } from '@/contexts/LanguageContext';
import { titleForLevel, RANK_STYLES } from '@/lib/rpg';
import { CharacterSheet } from './CharacterSheet';

export function AdventurerMiniCard({ userId }: { userId: string }) {
  const { language } = useLanguage();
  const lang = language === 'pt' ? 'pt' : 'en';
  const { stats, loading } = useAdventurer(userId);
  const [open, setOpen] = useState(false);

  if (loading || !stats) return <div className="animate-pulse h-20 bg-muted rounded-2xl" />;
  const rs = RANK_STYLES[stats.rank];
  const pct = Math.min(100, ((stats.exp - stats.levelStart) / Math.max(1, stats.nextLevel - stats.levelStart)) * 100);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="w-full relative overflow-hidden rounded-2xl p-3 border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-fuchsia-500/10 shadow-soft flex items-center gap-3 text-left hover:shadow-md transition-shadow">
        <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-fuchsia-500/20 blur-2xl" />
        <div className={`relative w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${rs.badge} shadow ${rs.glow} flex flex-col items-center justify-center`}>
          {stats.rank === 'SSS' && <Crown className="absolute -top-2.5 w-4 h-4 text-amber-400" />}
          <span className="text-[7px] uppercase font-bold tracking-widest text-primary-foreground/90">Rank</span>
          <span className="text-lg font-black leading-none text-primary-foreground">{stats.rank}</span>
        </div>
        <div className="relative flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground">{lang === 'pt' ? 'Status do Aventureiro' : 'Adventurer Status'}</p>
          <p className="text-sm font-bold truncate">{titleForLevel(stats.level, lang)} <span className="text-xs text-primary">· {lang === 'pt' ? 'Nível' : 'Lv.'} {stats.level}</span></p>
          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-fuchsia-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stats.exp} EXP · {lang === 'pt' ? 'Toque para ver detalhes e pontuações' : 'Tap for details & scores'}</p>
        </div>
        <ChevronRight className="relative w-4 h-4 text-muted-foreground" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-3 sm:p-6">
          <DialogTitle className="sr-only">{lang === 'pt' ? 'Status do Aventureiro' : 'Adventurer Status'}</DialogTitle>
          <CharacterSheet userId={userId} preloaded={stats} />
        </DialogContent>
      </Dialog>
    </>
  );
}
