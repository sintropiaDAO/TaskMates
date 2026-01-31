import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useTagUsage } from '@/hooks/useTagUsage';
import { Tag } from '@/types';
import { 
  containsIgnoreAccents, 
  calculateSimilarityIgnoreAccents,
  equalsIgnoreAccents 
} from '@/lib/stringUtils';

interface SmartTagSelectorProps {
  category: 'skills' | 'communities';
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onCreateTag?: (name: string) => void;
  maxVisibleTags?: number;
  showCreateInput?: boolean;
  excludeTagIds?: string[];
}

const DEFAULT_MAX_VISIBLE = 12;

export function SmartTagSelector({
  category,
  selectedTagIds,
  onToggleTag,
  onCreateTag,
  maxVisibleTags = DEFAULT_MAX_VISIBLE,
  showCreateInput = true,
  excludeTagIds = [],
}: SmartTagSelectorProps) {
  const { t } = useLanguage();
  const { getTagsByCategory, getTranslatedName } = useTags();
  const { getMostPopularTags } = useTagUsage();
  
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');

  // Get all tags for this category, excluding already selected or explicitly excluded
  const allAvailableTags = useMemo(() => {
    return getTagsByCategory(category).filter(
      tag => !excludeTagIds.includes(tag.id)
    );
  }, [category, excludeTagIds, getTagsByCategory]);

  // Filter tags based on search query with accent-insensitive matching
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return allAvailableTags;
    
    return allAvailableTags.filter(tag => {
      const tagName = tag.name;
      const translatedName = getTranslatedName(tag);
      
      return containsIgnoreAccents(tagName, searchQuery) ||
             containsIgnoreAccents(translatedName, searchQuery) ||
             calculateSimilarityIgnoreAccents(tagName, searchQuery) > 0.6 ||
             calculateSimilarityIgnoreAccents(translatedName, searchQuery) > 0.6;
    });
  }, [allAvailableTags, searchQuery, getTranslatedName]);

  // Sort by popularity and limit visible tags
  const sortedTags = useMemo(() => {
    return getMostPopularTags(filteredTags, filteredTags.length);
  }, [filteredTags, getMostPopularTags]);

  const visibleTags = showAll ? sortedTags : sortedTags.slice(0, maxVisibleTags);
  const hasMoreTags = sortedTags.length > maxVisibleTags;
  const hiddenCount = sortedTags.length - maxVisibleTags;

  // Check if new tag already exists
  const tagAlreadyExists = useMemo(() => {
    if (!newTagName.trim()) return false;
    return allAvailableTags.some(tag => 
      equalsIgnoreAccents(tag.name, newTagName)
    );
  }, [newTagName, allAvailableTags]);

  const handleCreateTag = () => {
    if (!newTagName.trim() || tagAlreadyExists) return;
    onCreateTag?.(newTagName.trim());
    setNewTagName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    }
  };

  return (
    <div className="space-y-3">
      {/* Search/Filter Input */}
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={t('searchTags')}
        className="text-sm"
      />

      {/* Tags Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={showAll ? 'all' : 'limited'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {showAll ? (
            <ScrollArea className="h-[200px] pr-3">
              <div className="flex flex-wrap gap-2">
                {visibleTags.map(tag => (
                  <TagBadge
                    key={tag.id}
                    name={tag.name}
                    category={category}
                    displayName={getTranslatedName(tag)}
                    selected={selectedTagIds.includes(tag.id)}
                    onClick={() => onToggleTag(tag.id)}
                  />
                ))}
                {visibleTags.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">
                    {t('noTagsFound')}
                  </p>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleTags.map(tag => (
                <TagBadge
                  key={tag.id}
                  name={tag.name}
                  category={category}
                  displayName={getTranslatedName(tag)}
                  selected={selectedTagIds.includes(tag.id)}
                  onClick={() => onToggleTag(tag.id)}
                />
              ))}
              {visibleTags.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">
                  {t('noTagsFound')}
                </p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Show More/Less Button */}
      {hasMoreTags && !searchQuery && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              {t('showLess')}
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              {t('showMore')} ({hiddenCount})
            </>
          )}
        </Button>
      )}

      {/* Create New Tag Input */}
      {showCreateInput && onCreateTag && (
        <div className="flex gap-2 pt-2 border-t border-border/50">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={category === 'skills' ? t('profileCreateSkill') : t('profileCreateCommunity')}
            className={`flex-1 text-sm ${tagAlreadyExists ? 'border-amber-500' : ''}`}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCreateTag}
            disabled={!newTagName.trim() || tagAlreadyExists}
            title={tagAlreadyExists ? t('tagAlreadyExists') : ''}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
      {tagAlreadyExists && (
        <p className="text-xs text-amber-500">{t('tagAlreadyExists')}</p>
      )}
    </div>
  );
}
