import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { Tag } from '@/types';

interface TagInputWithSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onSelectExisting: (tag: Tag) => void;
  placeholder: string;
  category: 'skills' | 'communities';
  existingTags: Tag[];
}

export function TagInputWithSuggestions({
  value,
  onChange,
  onSubmit,
  onCancel,
  onSelectExisting,
  placeholder,
  category,
  existingTags,
}: TagInputWithSuggestionsProps) {
  const { t } = useLanguage();
  const { getTranslatedName } = useTags();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find similar tags based on input
  const suggestions = useMemo(() => {
    if (!value.trim() || value.length < 2) return [];
    
    const normalizedInput = value.toLowerCase().trim();
    
    return existingTags
      .filter(tag => {
        const normalizedName = tag.name.toLowerCase();
        // Check if tag name contains the input or vice versa
        return normalizedName.includes(normalizedInput) || 
               normalizedInput.includes(normalizedName) ||
               // Check for similar characters (Levenshtein-like simple check)
               calculateSimilarity(normalizedName, normalizedInput) > 0.5;
      })
      .slice(0, 5); // Limit to 5 suggestions
  }, [value, existingTags]);

  // Simple similarity calculation
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    
    return matches / longer.length;
  };

  // Check for exact match
  const hasExactMatch = useMemo(() => {
    const normalizedInput = value.toLowerCase().trim();
    return existingTags.some(tag => tag.name.toLowerCase() === normalizedInput);
  }, [value, existingTags]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!hasExactMatch && value.trim()) {
        onSubmit();
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleSelectSuggestion = (tag: Tag) => {
    onSelectExisting(tag);
    setShowSuggestions(false);
    onChange('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            autoFocus
            className={hasExactMatch ? 'border-amber-500 focus-visible:ring-amber-500' : ''}
          />
          
          {/* Suggestions dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
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
                  {suggestions.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleSelectSuggestion(tag)}
                      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                    >
                      <TagBadge name={tag.name} category={category} size="sm" displayName={getTranslatedName(tag)} />
                      {tag.name.toLowerCase() === value.toLowerCase().trim() && (
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
          onClick={onSubmit} 
          disabled={hasExactMatch || !value.trim()}
          title={hasExactMatch ? t('tagAlreadyExists') : ''}
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {hasExactMatch && (
        <p className="text-xs text-amber-500 mt-1">
          {t('tagAlreadyExists')} - {t('clickToSelect')}
        </p>
      )}
    </div>
  );
}
