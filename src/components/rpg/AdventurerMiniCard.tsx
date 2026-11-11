import { useState } from 'react';
import { ChevronRight, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAdventurer } from '@/hooks/useAdventurer';
import { useLanguage } from '@/contexts/LanguageContext';
import { titleForRank } from '@/lib/rpg';
import { CharacterSheet } from './CharacterSheet';
import { Button } from '@/components/ui/button';

export function AdventurerMiniCard({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const { language } = useLanguage();
  const lang = language === 'pt' ? 'pt' : 'en';
  const { stats, loading } = useAdventurer(userId);
  const [open, setOpen] = useState(false);

  if (loading || !stats) return <div className={`animate-pulse bg-muted rounded-2xl ${compact ? 'h-10' : 'h-20'}`} />;
  const pct = stats.rankNext ? Math.min(100, ((stats.exp - stats.rankFloor) / Math.max(1, stats.rankNext - stats.rankFloor)) * 100) : 100;

  return (
    <>
      {compact ? (
        <Button variant="achievement" onClick={() => setOpen(true)}
          className="achievement-tone-forest w-full h-10 relative overflow-hidden rounded-xl p-1.5 flex items-center gap-2 text-left"
          aria-label={lang === 'pt' ? 'Status do Aventureiro' : 'Adventurer Status'}>
          <div className={`adventure-rank adventure-rank-${stats.rank} relative w-7 h-7 shrink-0 rounded-lg flex items-center justify-center`}>
            <span className="text-[11px] font-black leading-none">{stats.rank}</span>
          </div>
          <div className="relative flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-bold truncate">
              {titleForRank(stats.rank, lang)}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-6 sm:min-w-8">
              <div className="achievement-exp-fill h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">{stats.exp} EXP</span>
          </div>
          <ChevronRight className="relative w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:block" />
        </Button>
      ) : (
        <Button variant="achievement" onClick={() => setOpen(true)} aria-label={lang === 'pt' ? 'Status do Aventureiro' : 'Adventurer Status'}
          className="achievement-tone-forest w-full h-auto relative rounded-2xl p-3 flex items-center gap-3 text-left">
          <div className={`adventure-rank adventure-rank-${stats.rank} relative w-12 h-12 shrink-0 rounded-xl flex flex-col items-center justify-center`}>
            {stats.rank === 'SSS' && <Crown className="absolute -top-2.5 w-4 h-4 text-warning" />}
            <span className="text-[7px] uppercase font-bold">Rank</span>
            <span className="text-lg font-black leading-none">{stats.rank}</span>
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">{lang === 'pt' ? 'Status do Aventureiro' : 'Adventurer Status'}</p>
            <p className="text-sm font-bold truncate">{titleForRank(stats.rank, lang)} <span className="text-xs text-primary">· Rank {stats.rank}</span></p>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="achievement-exp-fill h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.exp} EXP · x{stats.multiplier.toFixed(1)}</p>
          </div>
          <ChevronRight className="relative w-4 h-4 text-muted-foreground" />
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined} className="achievement-world max-w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90svh] overflow-y-auto overflow-x-hidden p-4 pb-6 sm:p-6">
          <DialogTitle className="sr-only">{lang === 'pt' ? 'Status do Aventureiro' : 'Adventurer Status'}</DialogTitle>
          <CharacterSheet userId={userId} preloaded={stats} />
        </DialogContent>
      </Dialog>
    </>
  );
}
