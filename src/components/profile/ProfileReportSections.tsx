import { useState, useEffect } from 'react';
import { Star, Calendar, PieChart as PieChartIcon, Info, Sparkles, EyeOff, Award, Activity } from 'lucide-react';
import { RecentActivitySection } from '@/components/profile/RecentActivitySection';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CoinDashboard } from '@/components/gamification/CoinDashboard';
import { StarRating } from '@/components/ui/star-rating';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProfileVisibility, VisibilityKey } from '@/hooks/useProfileVisibility';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface ProfileReportSectionsProps {
  userId: string;
  isOwnProfile: boolean;
}

interface RatingHistory {
  id: string;
  task_title: string;
  rating: number;
  rater_name: string | null;
  created_at: string;
  comment: string | null;
}

function HideButton({ onHide }: { onHide: () => void }) {
  const { language } = useLanguage();
  return (
    <TooltipProvider delayDuration={0}>
      <UITooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onHide} className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive">
            <EyeOff className="w-3.5 h-3.5" />
            {language === 'pt' ? 'Ocultar' : 'Hide'}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{language === 'pt' ? 'Ocultar do perfil público' : 'Hide from public profile'}</p>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

export function ProfileReportSections({ userId, isOwnProfile }: ProfileReportSectionsProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { settings, toggleSection } = useProfileVisibility(userId);
  const dateLocale = language === 'pt' ? ptBR : enUS;

  const [completedByType, setCompletedByType] = useState({ offer: 0, request: 0, personal: 0 });
  const [ratingHistory, setRatingHistory] = useState<RatingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Completed by type
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('task_type')
        .eq('created_by', userId)
        .eq('status', 'completed');
      if (tasksData) {
        const counts = { offer: 0, request: 0, personal: 0 };
        tasksData.forEach((t: any) => {
          if (t.task_type in counts) counts[t.task_type as keyof typeof counts]++;
        });
        setCompletedByType(counts);
      }

      // Ratings
      const { data: ratings } = await supabase
        .from('task_ratings')
        .select('id, task_id, rating, rater_user_id, created_at, comment')
        .eq('rated_user_id', userId)
        .order('created_at', { ascending: false });

      if (ratings && ratings.length > 0) {
        const taskIds = [...new Set(ratings.map(r => r.task_id))];
        const { data: tasks } = await supabase.from('tasks').select('id, title').in('id', taskIds);
        const taskTitleMap = Object.fromEntries((tasks || []).map(t => [t.id, t.title]));
        const raterIds = [...new Set(ratings.map(r => r.rater_user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', raterIds);
        const raterNameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));

        setRatingHistory(ratings.map(r => ({
          id: r.id,
          task_title: taskTitleMap[r.task_id] || 'Unknown',
          rating: r.rating,
          rater_name: raterNameMap[r.rater_user_id] || null,
          created_at: r.created_at,
          comment: r.comment || null,
        })));
      }
    } catch (err) {
      console.error('Error fetching report data for profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const averageRating = ratingHistory.length > 0
    ? ratingHistory.reduce((sum, r) => sum + r.rating, 0) / ratingHistory.length
    : 0;

  const totalCompleted = completedByType.offer + completedByType.request + completedByType.personal;

  const handleHide = (key: VisibilityKey) => {
    if (isOwnProfile && user?.id === userId) {
      toggleSection(key, false);
    }
  };

  return (
    <>
      {/* Coins */}
      {settings.show_coins && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
        >
          <div className="flex items-center justify-between mb-2">
            <div />
            {isOwnProfile && <HideButton onHide={() => handleHide('show_coins')} />}
          </div>
          <CoinDashboard userId={userId} />
        </motion.div>
      )}

      {/* Completed Chart */}
      {settings.show_completed_chart && totalCompleted > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
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
                        ? 'Contabiliza apenas tarefas criadas pelo usuário.'
                        : 'Counts only tasks created by the user.'}
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            {isOwnProfile && <HideButton onHide={() => handleHide('show_completed_chart')} />}
          </div>
          {(() => {
            const pieData = [
              { name: language === 'pt' ? 'Oferta' : 'Offer', value: completedByType.offer, color: 'hsl(145, 60%, 40%)' },
              { name: language === 'pt' ? 'Solicitação' : 'Request', value: completedByType.request, color: 'hsl(330, 65%, 45%)' },
              { name: language === 'pt' ? 'Pessoal' : 'Personal', value: completedByType.personal, color: 'hsl(217, 91%, 60%)' },
            ].filter(d => d.value > 0);
            return (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Reputation */}
      {settings.show_ratings && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-lg">{language === 'pt' ? 'Reputação' : 'Reputation'}</span>
            </div>
            {isOwnProfile && <HideButton onHide={() => handleHide('show_ratings')} />}
          </div>

          {/* Average */}
          <div className="bg-gradient-to-r from-yellow-500/5 to-orange-500/5 rounded-xl p-4 border border-yellow-500/10">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <StarRating rating={averageRating} size="lg" />
                <p className="text-2xl font-bold mt-1">
                  {averageRating > 0 ? averageRating.toFixed(1) : '-'}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>{ratingHistory.length} {language === 'pt' ? 'avaliações recebidas' : 'ratings received'}</p>
                {ratingHistory.length === 0 && (
                  <p className="text-xs mt-1">{language === 'pt' ? 'Nenhuma avaliação ainda' : 'No ratings yet'}</p>
                )}
              </div>
            </div>
          </div>

          {/* History */}
          {ratingHistory.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('ratingHistory')}
              </h4>
              <div className="space-y-3">
                {ratingHistory.slice(0, 5).map((rating) => (
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
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}
