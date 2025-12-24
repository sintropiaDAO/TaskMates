import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FollowCounts {
  followers: number;
  following: number;
}

export function useFollows() {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFollowing = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    
    if (data) {
      setFollowingIds(data.map(f => f.following_id));
    }
  }, [user]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  const isFollowing = useCallback((userId: string) => {
    return followingIds.includes(userId);
  }, [followingIds]);

  const followUser = async (userId: string) => {
    if (!user || user.id === userId) return false;
    
    setLoading(true);
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: userId });
    
    if (!error) {
      setFollowingIds(prev => [...prev, userId]);
      setLoading(false);
      return true;
    }
    setLoading(false);
    return false;
  };

  const unfollowUser = async (userId: string) => {
    if (!user) return false;
    
    setLoading(true);
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId);
    
    if (!error) {
      setFollowingIds(prev => prev.filter(id => id !== userId));
      setLoading(false);
      return true;
    }
    setLoading(false);
    return false;
  };

  const getFollowCounts = async (userId: string): Promise<FollowCounts> => {
    const [followersRes, followingRes] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId)
    ]);
    
    return {
      followers: followersRes.count || 0,
      following: followingRes.count || 0
    };
  };

  const getFollowers = async (userId: string) => {
    const { data } = await supabase
      .from('follows')
      .select('follower_id, profiles:follower_id(id, full_name, avatar_url, location, bio)')
      .eq('following_id', userId);
    
    return data?.map(f => f.profiles) || [];
  };

  const getFollowing = async (userId: string) => {
    const { data } = await supabase
      .from('follows')
      .select('following_id, profiles:following_id(id, full_name, avatar_url, location, bio)')
      .eq('follower_id', userId);
    
    return data?.map(f => f.profiles) || [];
  };

  return {
    followingIds,
    isFollowing,
    followUser,
    unfollowUser,
    getFollowCounts,
    getFollowers,
    getFollowing,
    loading,
    refreshFollowing: fetchFollowing
  };
}
