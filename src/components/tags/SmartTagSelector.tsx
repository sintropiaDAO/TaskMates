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
  const [newTagName, setNewTagName] = useState('');

  // Get all tags for this category, excluding already selected or explicitly excluded
  const allAvailableTags = useMemo(() => {
    return getTagsByCategory(category).filter(
      tag => !excludeTagIds.includes(tag.id)
    );
  }, [category, excludeTagIds, getTagsByCategory]);

  // Sort by popularity and limit visible tags
  const sortedTags = useMemo(() => {
    return getMostPopularTags(allAvailableTags, allAvailableTags.length);
  }, [allAvailableTags, getMostPopularTags]);

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
