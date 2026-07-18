import { EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useHiddenCommunityTags } from '@/hooks/useHiddenCommunityFilter';
import { useLanguage } from '@/contexts/LanguageContext';

interface HiddenCommunityBadgeProps {
  tags?: Array<{ id: string; category?: string | null }> | null;
}

/**
 * Shows a "Privado" / "Private" badge when an item belongs EXCLUSIVELY to private communities.
 * If the item has at least one visible community tag (or no community tag at all), nothing renders.
 */
export function HiddenCommunityBadge({ tags }: HiddenCommunityBadgeProps) {
  const { hiddenTagIds, loading } = useHiddenCommunityTags();
  const { language } = useLanguage();

  if (loading || !tags || tags.length === 0) return null;

  const communityTagIds = tags
    .filter(t => t.category === 'communities')
    .map(t => t.id);

  if (communityTagIds.length === 0) return null;
  // If at least one community is NOT hidden, item is publicly visible → no badge
  if (communityTagIds.some(id => !hiddenTagIds.has(id))) return null;

  const label = language === 'pt' ? 'Privado' : 'Private';
  const tooltip = language === 'pt'
    ? 'Visível apenas para membros desta comunidade privada'
    : 'Visible only to members of this private community';

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border whitespace-nowrap">
            <EyeOff className="w-3 h-3" />
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" sideOffset={6} collisionPadding={16} className="max-w-[240px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
