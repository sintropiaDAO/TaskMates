import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, UserPlus, ThumbsUp, Star, Sparkles, Package } from 'lucide-react';
import { useCoins } from '@/hooks/useCoins';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ITEMS = [
  { key: 'TASKS', icon: CheckCircle, pt: 'Tarefas Concluídas', en: 'Completed Tasks', tone: 'from-emerald-500/25 to-green-500/10 border-emerald-400/40 text-emerald-500',
    tip: { pt: 'Todas as tarefas concluídas em que você participou, em qualquer papel: criador, solicitante ou colaborador.', en: 'All completed tasks you took part in, in any role: creator, requester or collaborator.' } },
  { key: 'SUPPLIED', icon: Package, pt: 'Fornecidos', en: 'Supplied', tone: 'from-teal-500/25 to-cyan-500/10 border-teal-400/40 text-teal-500',
    tip: { pt: 'Produtos que você forneceu e tiveram a entrega confirmada.', en: 'Products you supplied that had delivery confirmed.' } },
  { key: 'SOLICITATIONS', icon: UserPlus, pt: 'Solicitações', en: 'Requests', tone: 'from-sky-500/25 to-blue-500/10 border-sky-400/40 text-sky-500',
    tip: { pt: 'Solicitações recebidas nas suas tarefas. +1 ao receber, -1 se retirada.', en: 'Requests received on your tasks. +1 when received, -1 if withdrawn.' } },
  { key: 'LIKES', icon: ThumbsUp, pt: 'Likes', en: 'Likes', tone: 'from-yellow-400/30 to-amber-500/10 border-yellow-400/50 text-yellow-500',
    tip: { pt: 'Curtidas recebidas em comentários.', en: 'Likes received on comments.' } },
  { key: 'MAX_RATING', icon: Star, pt: 'Avaliação Máxima', en: 'Max Rating', tone: 'from-orange-400/30 to-amber-500/10 border-orange-400/50 text-orange-500',
    tip: { pt: 'Avaliações 5/5 recebidas, menos denúncias.', en: '5/5 ratings received, minus reports.' } },
];

const LUCKY_TIP = { pt: 'Estrelas ganhas ao completar tarefas. Use para destacar publicações por 7 dias.', en: 'Stars earned by completing tasks. Use to highlight posts for 7 days.' };

export function ScoresBoard({ userId, tasksCount }: { userId: string; tasksCount?: number }) {
  const { getBalance, loading } = useCoins(userId);
  const { language } = useLanguage();
  const lang = language === 'pt' ? 'pt' : 'en';
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />;

  const tipProps = (key: string) => ({
    open: openKey === key ? true : undefined,
    onOpenChange: (o: boolean) => { if (!o && openKey === key) setOpenKey(null); },
  });
  const toggle = (key: string) => setOpenKey(openKey === key ? null : key);

  return (
    <div className="relative space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />{lang === 'pt' ? 'Pontuações' : 'Scores'}
      </p>
      <TooltipProvider delayDuration={0}>
        <Tooltip {...tipProps('LUCKY_STARS')}>
          <TooltipTrigger asChild>
            <motion.button
              type="button"
              onClick={() => toggle('LUCKY_STARS')}
              whileHover={{ scale: 1.01 }}
              className="w-full relative overflow-hidden rounded-xl p-3 border-2 border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/30 via-violet-500/20 to-amber-400/30 shadow-lg shadow-fuchsia-500/20 flex items-center gap-3 text-left cursor-help"
            >
              <motion.div animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }}
                className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-500 to-amber-400 flex items-center justify-center shadow-md">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-fuchsia-500">{lang === 'pt' ? 'Estrelas da Sorte' : 'Lucky Stars'}</p>
                <p className="text-[10px] text-muted-foreground">{lang === 'pt' ? 'Destaque suas publicações por 7 dias' : 'Highlight your posts for 7 days'}</p>
              </div>
              <span className="text-3xl font-black text-foreground">{getBalance('LUCKY_STARS')}</span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px] text-center"><p className="text-xs">{LUCKY_TIP[lang]}</p></TooltipContent>
        </Tooltip>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ITEMS.map(it => (
            <Tooltip key={it.key} {...tipProps(it.key)}>
              <TooltipTrigger asChild>
                <button type="button" onClick={() => toggle(it.key)}
                  className={`rounded-xl bg-gradient-to-br border p-2.5 flex flex-col items-center text-center gap-0.5 cursor-help ${it.tone}`}>
                  <it.icon className="w-4 h-4" />
                  <span className="text-[10px] font-semibold leading-tight">{it[lang]}</span>
                  <span className="text-lg font-black text-foreground">{it.key === 'TASKS' && tasksCount !== undefined ? tasksCount : getBalance(it.key)}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-center"><p className="text-xs">{it.tip[lang]}</p></TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
