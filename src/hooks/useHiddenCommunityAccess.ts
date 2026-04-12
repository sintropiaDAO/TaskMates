import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Tracks which hidden community tags the current user follows or has been invited to.
 * Used to filter visibility of hidden tags and their items.
 */
export function useHiddenCommunityAccess() {
  const { user } = useAuth();
  const [hiddenTagIds, setHiddenTagIds] = useState<Set<string>>(new Set());
  const [userFollowedTagIds, setUserFollowedTagIds] = useState<Set<string>>(new Set());
  const [userInvitedTagIds, setUserInvitedTagIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all hidden community tag IDs
      const { data: hiddenData } = await supabase
        .from('community_settings')
        .select('tag_id')
        .eq('is_hidden', true);
      
      const hiddenIds = new Set((hiddenData || []).map(d => d.tag_id));
      setHiddenTagIds(hiddenIds);

      // Fetch user's followed tags and invites (only if logged in)
      if (user) {
        const [userTagRes, inviteRes] = await Promise.all([
          supabase
            .from('user_tags')
            .select('tag_id')
            .eq('user_id', user.id),
          supabase
            .from('community_invites')
            .select('tag_id')
            .eq('invited_user_id', user.id)
            .in('status', ['pending', 'accepted']),
        ]);
        
        setUserFollowedTagIds(new Set((userTagRes.data || []).map(d => d.tag_id)));
        setUserInvitedTagIds(new Set((inviteRes.data || []).map(d => d.tag_id)));
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  /** Hidden tag IDs that the current user does NOT follow */
  const inaccessibleHiddenTagIds = useMemo(() => {
    const ids = new Set<string>();
    hiddenTagIds.forEach(id => {
      if (!userFollowedTagIds.has(id)) {
        ids.add(id);
      }
    });
    return ids;
  }, [hiddenTagIds, userFollowedTagIds]);

  /** Check if a tag is hidden and the user doesn't follow it */
  const isTagHiddenFromUser = (tagId: string): boolean => {
    return inaccessibleHiddenTagIds.has(tagId);
  };

  /** Check if a tag is hidden (regardless of user access) */
  const isTagHidden = (tagId: string): boolean => {
    return hiddenTagIds.has(tagId);
  };

  /** Check if user follows a hidden tag */
  const userFollowsHiddenTag = (tagId: string): boolean => {
    return hiddenTagIds.has(tagId) && userFollowedTagIds.has(tagId);
  };

  /** Check if user has been invited to a hidden tag */
  const userIsInvitedToTag = (tagId: string): boolean => {
    return userInvitedTagIds.has(tagId);
  };

  /** Check if user has access to a hidden tag (follows OR invited) */
  const userHasAccessToHiddenTag = (tagId: string): boolean => {
    if (!hiddenTagIds.has(tagId)) return true;
    return userFollowedTagIds.has(tagId) || userInvitedTagIds.has(tagId);
  };

  /**
   * Check if an item should be visible to the current user.
   * Only community tags affect confidentiality. Skill/resource tags never make a hidden-community item public.
   * If an item is linked only to hidden communities, it is visible only to users who follow
   * or were invited to at least one of those hidden communities.
   */
  const isItemVisibleToUser = (
    itemTags: Array<string | { id: string; category?: string | null }>
  ): boolean => {
    if (itemTags.length === 0) return true;

    const communityTagIds = itemTags
      .map(tag => (typeof tag === 'string' ? { id: tag, category: 'communities' } : tag))
      .filter(tag => tag.category === 'communities')
      .map(tag => tag.id);

    if (communityTagIds.length === 0) return true;

    const hiddenCommunityIds = communityTagIds.filter(tagId => hiddenTagIds.has(tagId));
    if (hiddenCommunityIds.length === 0) return true;

    const hasVisibleCommunity = communityTagIds.some(tagId => !hiddenTagIds.has(tagId));
    if (hasVisibleCommunity) return true;

    return hiddenCommunityIds.some(
      tagId => userFollowedTagIds.has(tagId) || userInvitedTagIds.has(tagId)
    );
  };

  return {
    hiddenTagIds,
    inaccessibleHiddenTagIds,
    isTagHiddenFromUser,
    isTagHidden,
    userFollowsHiddenTag,
    userIsInvitedToTag,
    userHasAccessToHiddenTag,
    isItemVisibleToUser,
    loading,
  };
}
