import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, Tag as TagIcon, Loader2, Plus, Users, Lightbulb, Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTags } from '@/hooks/useTags';
import { useTagUsage } from '@/hooks/useTagUsage';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormField } from './FormField';
import { TagCategory } from '@/types';
import { cn } from '@/lib/utils';
import { containsIgnoreAccents, equalsIgnoreAccents } from '@/lib/stringUtils';

interface UnifiedTagFieldProps {
  categories: TagCategory[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onCreateTag: (name: string, category: TagCategory) => void | Promise<void>;
  onSuggest?: () => void;
  suggesting?: boolean;
  suggestDisabled?: boolean;
  defaultCreateCategory?: TagCategory;
}

const CATEGORY_LABEL_PT: Record<TagCategory, string> = {
  skills: 'Habilidade',
  communities: 'Comunidade',
  physical_resources: 'Recurso',
};
const CATEGORY_LABEL_EN: Record<TagCategory, string> = {
  skills: 'Skill',
  communities: 'Community',
  physical_resources: 'Resource',
};

export function UnifiedTagField({
  categories,
  selectedTagIds,
  onToggleTag,
  onCreateTag,
  onSuggest,
  suggesting,
  suggestDisabled,
  defaultCreateCategory,
}: UnifiedTagFieldProps) {
  const { language } = useLanguage();
  const { getTagsByCategory, getTranslatedName } = useTags();
  const { sortTagsByUsage } = useTagUsage();
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<TagCategory>(categories[0]);
  const [query, setQuery] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const [creating, setCreating] = useState(false);

  const catLabel = language === 'pt' ? CATEGORY_LABEL_PT : CATEGORY_LABEL_EN;
  const createCat = defaultCreateCategory && categories.includes(defaultCreateCategory)
    ? defaultCreateCategory
    : categories[0];

  const selectedTags = useMemo(() => {
    return categories.flatMap(cat =>
      getTagsByCategory(cat).filter(t => selectedTagIds.includes(t.id)).map(t => ({ tag: t, cat }))
    );
  }, [categories, getTagsByCategory, selectedTagIds]);

  const inputSuggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const all = categories.flatMap(cat =>
      getTagsByCategory(cat).map(t => ({ tag: t, cat }))
    );
    return all
      .filter(({ tag }) =>
        !selectedTagIds.includes(tag.id) &&
        (containsIgnoreAccents(tag.name, query) || containsIgnoreAccents(getTranslatedName(tag), query))
      )
      .slice(0, 6);
  }, [query, categories, getTagsByCategory, selectedTagIds, getTranslatedName]);

  const exactExists = useMemo(() => {
    if (!query.trim()) return false;
    return categories.some(cat =>
      getTagsByCategory(cat).some(t => equalsIgnoreAccents(t.name, query) || equalsIgnoreAccents(getTranslatedName(t), query))
    );
  }, [query, categories, getTagsByCategory, getTranslatedName]);

  const examples = useMemo(() => {
    return sortTagsByUsage(getTagsByCategory(activeCat))
      .filter(t => !selectedTagIds.includes(t.id))
      .slice(0, 5);
  }, [activeCat, sortTagsByUsage, getTagsByCategory, selectedTagIds]);

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || exactExists || creating) return;
    setCreating(true);
    try {
      await onCreateTag(name, createCat);
      setQuery('');
      setShowSuggest(false);
    } finally {
      setCreating(false);
    }
  };

  const handlePickSuggestion = (id: string) => {
    onToggleTag(id);
    setQuery('');
    setShowSuggest(false);
  };

  return (
    <FormField
      label={language === 'pt' ? 'Tags' : 'Tags'}
      icon={TagIcon}
      required
      hint={
        language === 'pt'
          ? 'Adicione tags de habilidades, comunidades e recursos — cada cor identifica a categoria.'
          : 'Add skill, community and resource tags — each color marks the category.'
      }
      action={
        onSuggest && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSuggest}
            disabled={suggesting || suggestDisabled}
            className="gap-1 text-xs h-8 rounded-xl shrink-0"
          >
            {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {language === 'pt' ? 'Sugerir' : 'Suggest'}
          </Button>
        )
      }
      footer={
        <Collapsible open={examplesOpen} onOpenChange={setExamplesOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{language === 'pt' ? 'Ver exemplos populares' : 'See popular examples'}</span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', examplesOpen && 'rotate-180')} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <div className="flex gap-1 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCat(cat)}
                  className={cn(
                    'text-[10px] font-semibold px-2 py-1 rounded-full transition-colors',
                    activeCat === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  {catLabel[cat]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {examples.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  {language === 'pt' ? 'Sem sugestões disponíveis' : 'No suggestions available'}
                </p>
              ) : examples.map(tag => (
                <TagBadge
                  key={tag.id}
                  name={tag.name}
                  category={activeCat}
                  displayName={getTranslatedName(tag)}
                  size="sm"
                  onClick={() => onToggleTag(tag.id)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      }
    >
      <div className="space-y-3 min-w-0">
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/50">
            {selectedTags.map(({ tag, cat }) => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                category={cat}
                displayName={getTranslatedName(tag)}
                selected
                onRemove={() => onToggleTag(tag.id)}
              />
            ))}
          </div>
        )}

        <div className="flex items-stretch gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggest(true); }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 180)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
              placeholder={language === 'pt' ? 'Buscar ou criar tag...' : 'Search or create tag...'}
              className="clay-input h-10 w-full"
            />
            <AnimatePresence>
              {showSuggest && inputSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                    {inputSuggestions.map(({ tag, cat }) => (
                      <button
                        key={tag.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handlePickSuggestion(tag.id)}
                        className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/60 transition-colors text-left"
                      >
                        <TagBadge name={tag.name} category={cat} displayName={getTranslatedName(tag)} size="sm" />
                        <span className="text-[10px] text-muted-foreground ml-auto uppercase shrink-0">{catLabel[cat]}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            type="button"
            variant="default"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCreate}
            disabled={!query.trim() || exactExists || creating}
            className="h-10 px-3 shrink-0 rounded-xl gap-1 bg-gradient-primary hover:opacity-90"
            title={exactExists ? (language === 'pt' ? 'Já existe' : 'Already exists') : (language === 'pt' ? 'Criar tag' : 'Create tag')}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span className="text-xs font-semibold hidden sm:inline">{language === 'pt' ? 'Criar' : 'Create'}</span>
          </Button>
        </div>
      </div>
    </FormField>
  );
}
