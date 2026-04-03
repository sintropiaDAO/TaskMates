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
      const { data } = await supabase
        .from('community_settings')
        .select('tag_id')
        .eq('is_hidden', true);
      setHiddenTagIds(new Set((data || []).map(d => d.tag_id)));
      setLoading(false);
    };
    fetch();
  }, []);

  return { hiddenTagIds, loading };
}

/**
 * Check if an item should be visible on public profile.
 * An item is hidden only if ALL its tags are hidden community tags.
 * Items with no tags are always visible.
 * Items with at least one non-hidden tag are visible.
 */
export function isVisibleItem(
  itemTagIds: string[],
  hiddenTagIds: Set<string>
): boolean {
  if (itemTagIds.length === 0) return true;
  return itemTagIds.some(tagId => !hiddenTagIds.has(tagId));
}
