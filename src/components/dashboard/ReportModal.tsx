import { useState, useEffect } from 'react';
import { TrendingUp, ListTodo, CheckCircle, Star, Calendar } from 'lucide-react';
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

  useEffect(() => {
    if (open && user) {
      fetchRatingHistory();
    }
  }, [open, user]);

  const fetchRatingHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get ratings for tasks created by the user
      const { data: ratings, error } = await supabase
        .from('task_ratings')
        .select(`
          id,
          task_id,
          rating,
          rater_user_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get task titles and rater names
      const enrichedRatings: RatingHistory[] = [];
      
      for (const rating of ratings || []) {
        // Get task info
        const { data: task } = await supabase
          .from('tasks')
          .select('title, created_by')
          .eq('id', rating.task_id)
          .single();

        // Only include ratings for tasks created by this user
        if (task?.created_by !== user.id) continue;

        // Get rater name
        const { data: raterProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', rating.rater_user_id)
          .single();

        enrichedRatings.push({
          id: rating.id,
          task_id: rating.task_id,
          task_title: task?.title || 'Unknown',
          rating: rating.rating,
          rater_name: raterProfile?.full_name || null,
          created_at: rating.created_at,
        });
      }

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
