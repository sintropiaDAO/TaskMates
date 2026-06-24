import { useHiddenCommunityTags, isVisibleItem } from './useHiddenCommunityFilter';

/**
 * Returns true when the item belongs exclusively to hidden community tags
 * (i.e. it would be hidden from non-members).
 */
export function useIsHiddenCard(
  tags?: Array<{ id: string; category?: string | null }> | null
): boolean {
  const { hiddenTagIds, loading } = useHiddenCommunityTags();
  if (loading || !tags || tags.length === 0) return false;
  const hasCommunity = tags.some(t => t.category === 'communities');
  if (!hasCommunity) return false;
  return !isVisibleItem(tags, hiddenTagIds);
}
