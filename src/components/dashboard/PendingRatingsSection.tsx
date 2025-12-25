import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { usePendingRatings } from '@/hooks/usePendingRatings';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';

interface PendingRatingsSectionProps {
  onTaskClick: (task: Task) => void;
}

export function PendingRatingsSection({ onTaskClick }: PendingRatingsSectionProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { pendingRatings, loading, refetch } = usePendingRatings();
  const [submittedRatings, setSubmittedRatings] = useState<Set<string>>(new Set());

  const handleRate = async (taskId: string, ratedUserId: string, rating: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('task_ratings')
      .upsert({
        task_id: taskId,
        rated_user_id: ratedUserId,
        rater_user_id: user.id,
        rating,
      }, { onConflict: 'task_id,rated_user_id,rater_user_id' });

    if (!error) {
      setSubmittedRatings(prev => new Set([...prev, `${taskId}-${ratedUserId}`]));
      toast({ title: t('ratingSubmitted') });
      // Refetch after a short delay to update the list
      setTimeout(() => refetch(), 1000);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6 mb-8 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (pendingRatings.length === 0) {
    return null;
  }

  const getRoleLabel = (role: 'collaborator' | 'requester' | 'owner') => {
    switch (role) {
      case 'collaborator':
        return t('taskCollaborators');
      case 'requester':
        return t('taskRequesters');
      case 'owner':
        return t('rateTaskOwner');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-6 mb-8 border-2 border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        <h3 className="font-semibold text-lg">{t('pendingRatings')}</h3>
        <span className="ml-auto text-sm text-muted-foreground">
          {pendingRatings.reduce((acc, p) => acc + p.usersToRate.length, 0)} {t('pendingRatingsCount')}
        </span>
      </div>

      <div className="space-y-4">
        {pendingRatings.slice(0, 3).map(({ task, usersToRate }) => (
          <div key={task.id} className="bg-background/50 rounded-lg p-4">
            <button
              onClick={() => onTaskClick(task)}
              className="text-left w-full group"
            >
              <h4 className="font-medium text-sm mb-2 group-hover:text-primary transition-colors flex items-center">
                {task.title}
                <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
            </button>
            
            <div className="space-y-2">
              {usersToRate.map(({ userId, userName, avatarUrl, role }) => {
                const isSubmitted = submittedRatings.has(`${task.id}-${userId}`);
                return (
                  <div 
                    key={userId} 
                    className={`flex items-center justify-between py-2 ${isSubmitted ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={avatarUrl || ''} />
                        <AvatarFallback className="text-xs">
                          {userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{userName}</p>
                        <p className="text-xs text-muted-foreground">{getRoleLabel(role)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSubmitted ? (
                        <span className="text-xs text-green-600">{t('ratingSubmitted')}</span>
                      ) : (
                        <StarRating
                          rating={0}
                          size="sm"
                          interactive
                          onRatingChange={(rating) => handleRate(task.id, userId, rating)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {pendingRatings.length > 3 && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          +{pendingRatings.length - 3} {t('moreTasks')}
        </p>
      )}
    </motion.div>
  );
}