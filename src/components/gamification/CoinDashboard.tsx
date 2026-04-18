import { useState } from 'react';
import { CheckCircle, UserPlus, ThumbsUp, Star, Sparkles, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCoins, COIN_DEFINITIONS } from '@/hooks/useCoins';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const iconMap: Record<string, React.ElementType> = {
  CheckCircle,
  UserPlus,
  ThumbsUp,
  Star,
  Sparkles,
  Package,
};

const tooltipMap: Record<string, { pt: string; en: string }> = {
  TASKS: {
    pt: 'Quantidade de tarefas que você concluiu com sucesso.',
    en: 'Number of tasks you have successfully completed.',
  },
  SUPPLIED: {
    pt: 'Produtos que você forneceu e tiveram a entrega confirmada.',
    en: 'Products you supplied that had delivery confirmed.',
  },
  SOLICITATIONS: {
    pt: 'Solicitações recebidas nas suas tarefas. +1 ao receber, -1 se retirada.',
    en: 'Requests received on your tasks. +1 when received, -1 if withdrawn.',
  },
  LIKES: {
    pt: 'Total global de curtidas em comentários da plataforma.',
    en: 'Global total of likes on platform comments.',
  },
  MAX_RATING: {
    pt: 'Total global de avaliações 5/5 recebidas, menos denúncias.',
    en: 'Global total of 5/5 ratings received, minus reports.',
  },
  LUCKY_STARS: {
    pt: 'Estrelas ganhas ao completar tarefas. Use para destacar publicações por 7 dias.',
    en: 'Stars earned by completing tasks. Use to highlight posts for 7 days.',
  },
};

interface CoinDashboardProps {
  userId?: string;
  hideTitle?: boolean;
}

export function CoinDashboard({ userId, hideTitle }: CoinDashboardProps = {}) {
  const { getBalance, loading } = useCoins(userId);
  const { language } = useLanguage();
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="glass">
            <CardContent className="p-4">
              <Skeleton className="h-8 w-8 rounded-full mb-2" />
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-10" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!hideTitle && (
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {language === 'pt' ? 'Pontuações' : 'Scores'}
        </h3>
      )}
      <TooltipProvider delayDuration={0}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COIN_DEFINITIONS.map(coin => {
            const Icon = iconMap[coin.icon] || Star;
            const balance = getBalance(coin.key);
            const label = language === 'pt' ? coin.label : coin.labelEn;
            const tip = tooltipMap[coin.key];
            const tooltipText = tip ? (language === 'pt' ? tip.pt : tip.en) : '';
            return (
              <Tooltip key={coin.key}>
                <TooltipTrigger asChild>
                  <Card className="glass hover:shadow-md transition-shadow cursor-help">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                      <div className={`p-2 rounded-full bg-muted ${coin.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground mt-1">{label}</span>
                      <span className="text-2xl font-bold">{balance}</span>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                {tooltipText && (
                  <TooltipContent side="bottom" className="max-w-[220px] text-center">
                    <p className="text-xs">{tooltipText}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}