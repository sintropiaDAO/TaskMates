import { useEffect, useState } from 'react';
import { Castle, ScrollText, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { rankFromExp, EXP_RULES } from '@/lib/rpg';

export function GuildBanner({ tagId }: { tagId: string }) {
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
  const { rank } = rankFromExp(data.done * EXP_RULES.questCompleted, 0);

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-soft p-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-info/15 border-2 border-info/40 flex flex-col items-center justify-center shrink-0">
        <Castle className="w-5 h-5 text-info" />
        <span className="text-xs font-bold text-info">{rank}</span>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-2 text-center">
        <Stat icon={Users} value={data.members} label={pt ? 'Aventureiros' : 'Adventurers'} />
        <Stat icon={ScrollText} value={data.open} label={pt ? 'Quests abertas' : 'Open quests'} />
        <Stat icon={Castle} value={data.done} label={pt ? 'Concluídas' : 'Completed'} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return (
    <div>
      <p className="text-lg font-bold flex items-center justify-center gap-1"><Icon className="w-4 h-4 text-muted-foreground" />{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
