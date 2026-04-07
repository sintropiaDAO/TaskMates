import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useTagUsage } from '@/hooks/useTagUsage';
import { useHiddenCommunityAccess } from '@/hooks/useHiddenCommunityAccess';
import { Tag, TagCategory } from '@/types';
import { 
  containsIgnoreAccents, 
  calculateSimilarityIgnoreAccents,
  equalsIgnoreAccents 
} from '@/lib/stringUtils';

interface SmartTagSelectorProps {
  category: TagCategory;
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onCreateTag?: (name: string) => Promise<void> | void;
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
  const { getTagsByCategory, getTranslatedName, refreshTags } = useTags();
  const { getMostPopularTags } = useTagUsage();
  const { isTagHiddenFromUser } = useHiddenCommunityAccess();
  
  const [showAll, setShowAll] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Get all tags for this category, excluding already excluded and hidden community tags for non-followers
  const allAvailableTags = useMemo(() => {
    return getTagsByCategory(category).filter(
      tag => !excludeTagIds.includes(tag.id) && !isTagHiddenFromUser(tag.id)
    );
  }, [category, excludeTagIds, getTagsByCategory, isTagHiddenFromUser]);

  // Sort: selected tags first (in selectedTagIds order, most recent first), then by popularity
  const sortedTags = useMemo(() => {
    const popularSorted = getMostPopularTags(allAvailableTags, allAvailableTags.length);
    return [...popularSorted].sort((a, b) => {
      const aIdx = selectedTagIds.indexOf(a.id);
      const bIdx = selectedTagIds.indexOf(b.id);
      const aSelected = aIdx !== -1;
      const bSelected = bIdx !== -1;
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      if (aSelected && bSelected) return aIdx - bIdx;
      return 0;
    });
  }, [allAvailableTags, getMostPopularTags, selectedTagIds]);

  const hasMoreTags = sortedTags.length > maxVisibleTags;
  const hiddenCount = sortedTags.length - maxVisibleTags;

  // Check if new tag already exists
  const tagAlreadyExists = useMemo(() => {
    if (!newTagName.trim()) return false;
    return allAvailableTags.some(tag => 
      equalsIgnoreAccents(tag.name, newTagName)
    );
  }, [newTagName, allAvailableTags]);

  const handleCreateTag = async () => {
    if (!newTagName.trim() || tagAlreadyExists) return;
    await onCreateTag?.(newTagName.trim());
    await refreshTags();
    setNewTagName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    }
  };

  // Suggestions based on input in the create field
  const inputSuggestions = useMemo(() => {
    if (!newTagName.trim() || newTagName.length < 2) return [];
    
    return sortedTags
      .filter(tag => {
        const tagName = tag.name;
        const translatedName = getTranslatedName(tag);
        
        return containsIgnoreAccents(tagName, newTagName) ||
               containsIgnoreAccents(translatedName, newTagName) ||
               calculateSimilarityIgnoreAccents(tagName, newTagName) > 0.5 ||
               calculateSimilarityIgnoreAccents(translatedName, newTagName) > 0.5;
      })
      .slice(0, 5);
  }, [newTagName, sortedTags, getTranslatedName]);

  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSelectSuggestion = (tag: Tag) => {
    onToggleTag(tag.id);
    setNewTagName('');
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-3">
      {/* Create New Tag Input with Suggestions */}
      {showCreateInput && onCreateTag && (
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={newTagName}
                onChange={(e) => {
                  setNewTagName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder={category === 'skills' ? t('profileCreateSkill') : t('profileCreateCommunity')}
                className={`text-sm ${tagAlreadyExists ? 'border-amber-500' : ''}`}
              />
              
              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && inputSuggestions.length > 0 && newTagName.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
                  >
                    <div className="p-2 text-xs text-muted-foreground border-b border-border">
                      {t('similarTagsFound')}
                    </div>
                    <div className="p-2 space-y-1 max-h-40 overflow-y-auto">
                      {inputSuggestions.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => handleSelectSuggestion(tag)}
                          className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                        >
                          <TagBadge 
                            name={tag.name} 
                            category={category} 
                            size="sm" 
                            displayName={getTranslatedName(tag)} 
                          />
                          {equalsIgnoreAccents(tag.name, newTagName) && (
                            <span className="text-xs text-amber-500 ml-auto">{t('exactMatch')}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
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
          {tagAlreadyExists && (
            <p className="text-xs text-amber-500 mt-1">{t('tagAlreadyExists')}</p>
          )}
        </div>
      )}

      {/* Tags Grid */}
      <div
        className={`flex flex-wrap gap-2 overflow-hidden transition-all duration-300 ${
          showAll ? 'max-h-[300px] overflow-y-auto pr-1' : 'max-h-[120px]'
        }`}
      >
        {sortedTags.map(tag => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            category={category}
            displayName={getTranslatedName(tag)}
            selected={selectedTagIds.includes(tag.id)}
            onClick={() => onToggleTag(tag.id)}
          />
        ))}
        {sortedTags.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            {t('noTagsFound')}
          </p>
        )}
      </div>

      {/* Show More/Less Button */}
      {hasMoreTags && (
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
    </div>
  );
}
