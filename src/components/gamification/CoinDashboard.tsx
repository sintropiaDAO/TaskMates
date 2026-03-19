import { CheckCircle, UserPlus, ThumbsUp, Star, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCoins, COIN_DEFINITIONS } from '@/hooks/useCoins';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';

const iconMap: Record<string, React.ElementType> = {
  CheckCircle,
  UserPlus,
  ThumbsUp,
  Star,
  Sparkles,
};

export function CoinDashboard() {
  const { getBalance, loading } = useCoins();
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        {language === 'pt' ? 'Moedas & Recompensas' : 'Coins & Rewards'}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {COIN_DEFINITIONS.map(coin => {
          const Icon = iconMap[coin.icon] || Star;
          const balance = getBalance(coin.key);
          const label = language === 'pt' ? coin.label : coin.labelEn;
          return (
            <Card key={coin.key} className="glass hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <div className={`p-2 rounded-full bg-muted ${coin.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground mt-1">{label}</span>
                <span className="text-2xl font-bold">{balance}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
