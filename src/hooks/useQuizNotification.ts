import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useQuizNotification() {
  const { user } = useAuth();
  const [shouldShowQuizPrompt, setShouldShowQuizPrompt] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkQuizAndNotify = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check profile for quiz completion
        const { data: profile } = await supabase
          .from('profiles')
          .select('quiz_completed, created_at')
          .eq('id', user.id)
          .single();

        if (profile?.quiz_completed) {
          setQuizCompleted(true);
          setLoading(false);
          return;
        }

        // Check how many tags user has
        const { count } = await supabase
          .from('user_tags')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Show quiz prompt if user has less than 5 tags
        if ((count || 0) < 5) {
          setShouldShowQuizPrompt(true);

          // Check if we already sent a notification
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'quiz_reminder')
            .single();

          // Create notification if doesn't exist
          if (!existingNotification) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'quiz_reminder',
              message: 'quiz_notification_message'
            });
          }
        }
      } catch (error) {
        console.error('Error checking quiz status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkQuizAndNotify();
  }, [user]);

  return { shouldShowQuizPrompt, quizCompleted, loading };
}
