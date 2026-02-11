import { useState, useEffect } from 'react';
import { TrendingUp, ListTodo, CheckCircle, Star, Calendar, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
        .select('id, task_id, rating, rater_user_id, created_at')
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
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-xl p-4 text-center">
              <TrendingUp className="w-6 h-6 text-icon mx-auto mb-2" />
              <p className="text-2xl font-bold">{recommendedCount}</p>
              <p className="text-xs text-muted-foreground">{t('dashboardRecommended')}</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <ListTodo className="w-6 h-6 text-icon-secondary mx-auto mb-2" />
              <p className="text-2xl font-bold">{myTasksCount}</p>
              <p className="text-xs text-muted-foreground">{t('dashboardMyTasks')}</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <CheckCircle className="w-6 h-6 text-icon mx-auto mb-2" />
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">{t('dashboardCompleted')}</p>
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-icon" />
                <span className="font-medium">{t('averageRating')}</span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={averageRating} size="sm" />
                <span className="text-sm text-muted-foreground">
                  ({ratingHistory.length} {t('ratings')})
                </span>
              </div>
            </div>
          </div>

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
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {/* Rating History */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t('ratingHistory')}
            </h3>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('loading')}
              </div>
            ) : ratingHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('noRatingsYet')}
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('task')}</TableHead>
                      <TableHead>{t('rater')}</TableHead>
                      <TableHead>{t('rating')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('date')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ratingHistory.map((rating) => (
                      <TableRow key={rating.id}>
                        <TableCell className="font-medium max-w-[120px] truncate">
                          {rating.task_title}
                        </TableCell>
                        <TableCell className="max-w-[100px] truncate">
                          {rating.rater_name || t('anonymous')}
                        </TableCell>
                        <TableCell>
                          <StarRating rating={rating.rating} size="sm" />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {format(new Date(rating.created_at), 'dd/MM/yyyy', { locale: dateLocale })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
