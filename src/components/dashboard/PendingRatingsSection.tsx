import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { usePendingRatings } from '@/hooks/usePendingRatings';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { RatingModal } from './RatingModal';

interface PendingRatingsSectionProps {
  onTaskClick: (task: Task) => void;
}

interface SelectedUserForRating {
  taskId: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  role: 'collaborator' | 'requester' | 'owner';
}

export function PendingRatingsSection({ onTaskClick }: PendingRatingsSectionProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { pendingRatings, loading, refetch } = usePendingRatings();
  const [submittedRatings, setSubmittedRatings] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<SelectedUserForRating | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenRatingModal = (
    taskId: string,
    userId: string,
    userName: string,
    avatarUrl: string | null,
    role: 'collaborator' | 'requester' | 'owner'
  ) => {
    setSelectedUser({ taskId, userId, userName, avatarUrl, role });
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
  };

  const handleSubmitRating = async (rating: number, comment?: string) => {
    if (!user || !selectedUser) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('task_ratings')
      .upsert({
        task_id: selectedUser.taskId,
        rated_user_id: selectedUser.userId,
        rater_user_id: user.id,
        rating,
        comment: comment || null,
      }, { onConflict: 'task_id,rated_user_id,rater_user_id' });

    if (!error) {
      setSubmittedRatings(prev => new Set([...prev, `${selectedUser.taskId}-${selectedUser.userId}`]));
      toast({ title: t('ratingSubmitted') });

      // Get rater's name for notification
      try {
        const { data: raterProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const raterName = raterProfile?.full_name || 'Alguém';
        const stars = '⭐'.repeat(rating);
        let message = `${raterName} avaliou você com ${rating} ${rating === 1 ? 'estrela' : 'estrelas'} ${stars}`;
        if (comment) {
          message += ` - "${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}"`;
        }

        // Create in-app notification using database function
        await supabase.rpc('create_notification', {
          _user_id: selectedUser.userId,
          _task_id: selectedUser.taskId,
          _type: 'new_rating',
          _message: message,
        });

        // Send email notification to rated user
        await supabase.functions.invoke('send-notification-email', {
          body: {
            user_id: selectedUser.userId,
            notification_type: 'new_rating',
            message,
            task_id: selectedUser.taskId,
          },
        });
      } catch (notifyError) {
        console.error('Error sending rating notifications:', notifyError);
      }

      // Close modal and refetch after a short delay
      setSelectedUser(null);
      setTimeout(() => refetch(), 1000);
    }

    setSubmitting(false);
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
    <>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRatingModal(task.id, userId, userName, avatarUrl, role)}
                            className="gap-1"
                          >
                            <Star className="w-3 h-3" />
                            {t('rateUser')}
                          </Button>
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

      {selectedUser && (
        <RatingModal
          isOpen={!!selectedUser}
          onClose={handleCloseModal}
          onSubmit={handleSubmitRating}
          userName={selectedUser.userName}
          userAvatar={selectedUser.avatarUrl}
          userRole={selectedUser.role}
          submitting={submitting}
        />
      )}
    </>
  );
}
