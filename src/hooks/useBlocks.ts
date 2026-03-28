import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useBlocks() {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBlocked = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id);
    if (data) {
      setBlockedIds(data.map(b => b.blocked_id));
    }
  }, [user]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  const isBlocked = useCallback((userId: string) => {
    return blockedIds.includes(userId);
  }, [blockedIds]);

  const blockUser = async (userId: string) => {
    if (!user || user.id === userId) return false;
    setLoading(true);
    const { error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: user.id, blocked_id: userId });
    if (!error) {
      setBlockedIds(prev => [...prev, userId]);
      // Also unfollow in both directions
      await supabase.from('follows').delete()
        .eq('follower_id', user.id).eq('following_id', userId);
      await supabase.from('follows').delete()
        .eq('follower_id', userId).eq('following_id', user.id);
      setLoading(false);
      return true;
    }
    setLoading(false);
    return false;
  };

  const unblockUser = async (userId: string) => {
    if (!user) return false;
    setLoading(true);
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);
    if (!error) {
      setBlockedIds(prev => prev.filter(id => id !== userId));
      setLoading(false);
      return true;
    }
    setLoading(false);
    return false;
  };

  const checkIfBlockedBy = async (targetUserId: string): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase.rpc('is_blocked_by', {
      checker_id: user.id,
      target_id: targetUserId
    });
    return !!data;
  };

  return {
    blockedIds,
    isBlocked,
    blockUser,
    unblockUser,
    checkIfBlockedBy,
    loading,
    refreshBlocked: fetchBlocked
  };
}
