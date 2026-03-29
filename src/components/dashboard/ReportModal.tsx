import { useState, useEffect } from 'react';
import { CheckCircle, Star, Calendar, PieChart as PieChartIcon, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CoinDashboard } from '@/components/gamification/CoinDashboard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StarRating } from '@/components/ui/star-rating';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  recommendedCount: number;
  myTasksCount: number;
  completedCount: number;
}

interface RatingHistory {
  id: string;
  task_id: string;
  task_title: string;
  rating: number;
  rater_name: string | null;
  created_at: string;
  comment: string | null;
}

export function ReportModal({
  open,
  onClose,
  recommendedCount,
  myTasksCount,
  completedCount,
}: ReportModalProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [ratingHistory, setRatingHistory] = useState<RatingHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [completedByType, setCompletedByType] = useState({ offer: 0, request: 0, personal: 0 });

  useEffect(() => {
    if (open && user) {
      fetchRatingHistory();
      fetchCompletedByType();
    }
  }, [open, user]);

  const fetchCompletedByType = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('task_type')
      .eq('created_by', user.id)
      .eq('status', 'completed');
    if (data) {
      const counts = { offer: 0, request: 0, personal: 0 };
      data.forEach((t: any) => {
        if (t.task_type in counts) counts[t.task_type as keyof typeof counts]++;
      });
      setCompletedByType(counts);
    }
  };

  const fetchRatingHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get all ratings where this user was rated
      const { data: ratings, error } = await supabase
        .from('task_ratings')
        .select('id, task_id, rating, rater_user_id, created_at, comment')
        .eq('rated_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!ratings || ratings.length === 0) {
        setRatingHistory([]);
        setLoading(false);
        return;
      }

      // Get task titles in bulk
      const taskIds = [...new Set(ratings.map(r => r.task_id))];
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title')
        .in('id', taskIds);
      const taskTitleMap = Object.fromEntries((tasks || []).map(t => [t.id, t.title]));

      // Get rater names in bulk
      const raterIds = [...new Set(ratings.map(r => r.rater_user_id))];
      const { data: raterProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', raterIds);
      const raterNameMap = Object.fromEntries(
        (raterProfiles || []).map(p => [p.id, p.full_name])
      );

      const enrichedRatings: RatingHistory[] = ratings.map(rating => ({
        id: rating.id,
        task_id: rating.task_id,
        task_title: taskTitleMap[rating.task_id] || 'Unknown',
        rating: rating.rating,
        rater_name: raterNameMap[rating.rater_user_id] || null,
        created_at: rating.created_at,
        comment: rating.comment || null,
      }));

      setRatingHistory(enrichedRatings);
    } catch (error) {
      console.error('Error fetching rating history:', error);
    } finally {
      setLoading(false);
    }
  };

  const averageRating = ratingHistory.length > 0
    ? ratingHistory.reduce((sum, r) => sum + r.rating, 0) / ratingHistory.length
    : 0;

  const dateLocale = language === 'pt' ? ptBR : enUS;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            {t('dashboardReport')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Coins & Rewards */}
          <CoinDashboard />

          {/* Completed Tasks by Type - Pie Chart */}
          {completedCount > 0 && (() => {
            const pieData = [
              { name: language === 'pt' ? 'Oferta' : 'Offer', value: completedByType.offer, color: 'hsl(145, 60%, 40%)' },
              { name: language === 'pt' ? 'Solicitação' : 'Request', value: completedByType.request, color: 'hsl(330, 65%, 45%)' },
              { name: language === 'pt' ? 'Pessoal' : 'Personal', value: completedByType.personal, color: 'hsl(217, 91%, 60%)' },
            ].filter(d => d.value > 0);
            return (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  <span className="font-medium">{language === 'pt' ? 'Tarefas Concluídas por Tipo' : 'Completed Tasks by Type'}</span>
                  <TooltipProvider delayDuration={0}>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[240px] text-center">
                        <p className="text-xs">
                          {language === 'pt'
                            ? 'Contabiliza apenas tarefas criadas por você. Tarefas criadas por outros usuários nas quais você colaborou não são incluídas.'
                            : 'Counts only tasks you created. Tasks created by other users that you collaborated on are not included.'}
                        </p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {/* Avaliações Section */}
          <div className="glass rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-lg">{language === 'pt' ? 'Avaliações' : 'Ratings'}</span>
            </div>

            {/* Average Rating */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">{t('averageRating')}</span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={averageRating} size="sm" />
                <span className="text-sm text-muted-foreground">
                  ({ratingHistory.length} {t('ratings')})
                </span>
              </div>
            </div>

            {/* Rating History */}
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('ratingHistory')}
              </h4>

              {loading ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {t('loading')}
                </div>
              ) : ratingHistory.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {t('noRatingsYet')}
                </div>
              ) : (
                <div className="space-y-3">
                  {ratingHistory.map((rating) => (
                    <div key={rating.id} className="bg-muted/20 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate flex-1">{rating.task_title}</p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(rating.created_at), 'dd/MM/yyyy', { locale: dateLocale })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {language === 'pt' ? 'por' : 'by'} {rating.rater_name || t('anonymous')}
                        </span>
                        <StarRating rating={rating.rating} size="sm" />
                      </div>
                      {rating.comment && (
                        <p className="text-xs text-muted-foreground italic mt-1 bg-muted/30 rounded px-2 py-1">
                          "{rating.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
