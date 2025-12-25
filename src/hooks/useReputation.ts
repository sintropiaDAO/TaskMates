import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReputationData {
  averageRating: number;
  totalRatings: number;
  loading: boolean;
}

export function useReputation(userId: string | undefined): ReputationData {
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchReputation = async () => {
      setLoading(true);
      
      // Get all ratings where the user was the rated person (collaborator or task creator)
      const { data, error } = await supabase
        .from('task_ratings')
        .select('rating')
        .eq('rated_user_id', userId);

      if (!error && data && data.length > 0) {
        const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
        setAverageRating(sum / data.length);
        setTotalRatings(data.length);
      } else {
        setAverageRating(0);
        setTotalRatings(0);
      }
      
      setLoading(false);
    };

    fetchReputation();
  }, [userId]);

  return { averageRating, totalRatings, loading };
}

export function useTaskRatings(taskId: string | undefined) {
  const [ratings, setRatings] = useState<{ rated_user_id: string; rating: number }[]>([]);
  const [userHasRated, setUserHasRated] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchRatings = async () => {
    if (!taskId) return;
    
    const { data } = await supabase
      .from('task_ratings')
      .select('*')
      .eq('task_id', taskId);
    
    if (data) {
      setRatings(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRatings();
  }, [taskId]);

  const rateUser = async (
    taskId: string,
    ratedUserId: string,
    raterUserId: string,
    rating: number
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('task_ratings')
      .upsert({
        task_id: taskId,
        rated_user_id: ratedUserId,
        rater_user_id: raterUserId,
        rating,
      }, {
        onConflict: 'task_id,rated_user_id,rater_user_id'
      });

    if (!error) {
      await fetchRatings();
      return true;
    }
    return false;
  };

  const getUserRating = (ratedUserId: string, raterUserId: string): number | null => {
    const found = ratings.find(
      r => r.rated_user_id === ratedUserId
    );
    return found?.rating || null;
  };

  return { ratings, loading, rateUser, getUserRating, refetch: fetchRatings };
}