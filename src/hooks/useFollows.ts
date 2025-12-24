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

  const followUser = async (userId: string, followerName?: string) => {
    if (!user || user.id === userId) return false;
    
    setLoading(true);
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: userId });
    
    if (!error) {
      setFollowingIds(prev => [...prev, userId]);
      
      // Create notification for the followed user
      try {
        const name = followerName || 'Alguém';
        await supabase.functions.invoke('create-notification', {
          body: {
            user_id: userId,
            type: 'new_follower',
            message: `${name} começou a te seguir!`
          }
        });
      } catch (e) {
        console.error('Failed to create follow notification:', e);
      }
      
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
      .select('follower_id')
      .eq('following_id', userId);
    
    if (!data || data.length === 0) return [];
    
    const followerIds = data.map(f => f.follower_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, location, bio')
      .in('id', followerIds);
    
    return profiles || [];
  };

  const getFollowing = async (userId: string) => {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    
    if (!data || data.length === 0) return [];
    
    const followingIds = data.map(f => f.following_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, location, bio')
      .in('id', followingIds);
    
    return profiles || [];
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
