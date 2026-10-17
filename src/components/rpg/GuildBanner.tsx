import { useEffect, useState } from 'react';
import { Castle, ScrollText, Users, Trophy, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { rankFromExp, EXP_RULES, RANK_STYLES } from '@/lib/rpg';
import { cn } from '@/lib/utils';

export type GuildMetric = 'rank' | 'adventurers' | 'open' | 'done';

export interface GuildStats {
  members: number;
  open: number;
  done: number;
  rank: string;
  exp: number;
}

export function GuildBanner({ tagId, onSelect }: { tagId: string; onSelect?: (metric: GuildMetric, stats: GuildStats) => void }) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const [data, setData] = useState<{ members: number; open: number; done: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [members, links] = await Promise.all([
        supabase.from('user_tags').select('id', { count: 'exact', head: true }).eq('tag_id', tagId),
        supabase.from('task_tags').select('task:tasks(status)').eq('tag_id', tagId),
      ]);
      const rows = (links.data ?? []) as unknown as { task: { status: string } | null }[];
      const done = rows.filter(r => r.task?.status === 'completed').length;
      const open = rows.filter(r => r.task && r.task.status !== 'completed').length;
      setData({ members: members.count ?? 0, open, done });
    })();
  }, [tagId]);

  if (!data) return null;
  const exp = data.done * EXP_RULES.questCompleted;
  const { rank } = rankFromExp(exp, 0);
  const rs = RANK_STYLES[rank as keyof typeof RANK_STYLES];
  const stats: GuildStats = { ...data, rank, exp };

  const tiles: { key: GuildMetric; icon: typeof Users; value: number | string; label: string; tone: string }[] = [
    { key: 'rank', icon: Trophy, value: rank, label: pt ? 'Status da Guilda' : 'Guild Status', tone: 'from-amber-400/30 to-yellow-500/10 border-amber-400/50 text-amber-500' },
    { key: 'adventurers', icon: Users, value: data.members, label: pt ? 'Aventureiros' : 'Adventurers', tone: 'from-emerald-500/25 to-teal-500/10 border-emerald-400/40 text-emerald-500' },
    { key: 'open', icon: ScrollText, value: data.open, label: pt ? 'Quests abertas' : 'Open quests', tone: 'from-sky-500/25 to-blue-500/10 border-sky-400/40 text-sky-500' },
    { key: 'done', icon: Castle, value: data.done, label: pt ? 'Concluídas' : 'Completed', tone: 'from-fuchsia-500/25 to-purple-500/10 border-fuchsia-400/40 text-fuchsia-500' },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 border border-info/30 bg-gradient-to-br from-info/15 via-card to-sky-500/10 shadow-soft space-y-3">
      <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="relative flex items-center gap-3">
        <div className={cn('w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br shadow flex flex-col items-center justify-center', rs.badge, rs.glow)}>
          <Castle className="w-4 h-4 text-primary-foreground" />
          <span className="text-xs font-black leading-none text-primary-foreground">{rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground">{pt ? 'Status da Guilda' : 'Guild Status'}</p>
          <p className="text-sm font-bold truncate">
            {rs.label[pt ? 'pt' : 'en']} <span className="text-xs text-info">· Rank {rank}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">{exp} EXP</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tiles.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => onSelect?.(t.key, stats)}
            className={cn(
              'rounded-xl bg-gradient-to-br border p-3 text-center flex flex-col items-center transition-transform hover:scale-[1.03] active:scale-[0.98]',
              t.tone,
            )}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </div>
            <p className="text-xl font-black mt-1 text-foreground">{t.value}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
