import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches the set of tag IDs that belong to hidden communities.
 * Items exclusively linked to hidden community tags should be filtered out from public profiles.
 */
export function useHiddenCommunityTags() {
  const [hiddenTagIds, setHiddenTagIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any).rpc('get_hidden_community_tag_ids');
      const ids = Array.isArray(data) ? data.map((d: any) => (typeof d === 'string' ? d : d.get_hidden_community_tag_ids ?? d)) : [];
      setHiddenTagIds(new Set(ids));
      setLoading(false);
    };
    fetch();
  }, []);

  return { hiddenTagIds, loading };
}

/**
 * Check if an item should be visible on public profile.
 * Only community tags affect confidentiality.
 * If an item has no community tags, it stays visible.
 * If it has at least one visible community tag, it stays visible.
 * It is hidden only when all related community tags are hidden communities.
 */
export function isVisibleItem(
  itemTags: Array<string | { id: string; category?: string | null }>,
  hiddenTagIds: Set<string>
): boolean {
  if (itemTags.length === 0) return true;

  const communityTagIds = itemTags
    .map(tag => (typeof tag === 'string' ? { id: tag, category: null } : tag))
    .filter(tag => tag.category === 'communities')
    .map(tag => tag.id);

  if (communityTagIds.length === 0) return true;

  return communityTagIds.some(tagId => !hiddenTagIds.has(tagId));
}
