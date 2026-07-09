import { useMemo, useState } from 'react';
import { ChevronDown, Sparkles, Tag as TagIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TagBadge } from '@/components/ui/tag-badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SmartTagSelector } from '@/components/tags/SmartTagSelector';
import { useTags } from '@/hooks/useTags';
import { useTagUsage } from '@/hooks/useTagUsage';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormField } from './FormField';
import { TagCategory } from '@/types';
import { cn } from '@/lib/utils';

interface UnifiedTagFieldProps {
  categories: TagCategory[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onCreateTag: (name: string, category: TagCategory) => void | Promise<void>;
  onSuggest?: () => void;
  suggesting?: boolean;
  suggestDisabled?: boolean;
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
}: UnifiedTagFieldProps) {
  const { language } = useLanguage();
  const { getTagsByCategory, getTranslatedName } = useTags();
  const { sortTagsByUsage } = useTagUsage();
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<TagCategory>(categories[0]);

  const catLabel = language === 'pt' ? CATEGORY_LABEL_PT : CATEGORY_LABEL_EN;

  const selectedByCategory = useMemo(() => {
    const map: Record<string, ReturnType<typeof getTagsByCategory>[number][]> = {};
    categories.forEach(cat => {
      map[cat] = getTagsByCategory(cat).filter(t => selectedTagIds.includes(t.id));
    });
    return map;
  }, [categories, getTagsByCategory, selectedTagIds]);

  const examples = useMemo(() => {
    return sortTagsByUsage(getTagsByCategory(activeCat))
      .filter(t => !selectedTagIds.includes(t.id))
      .slice(0, 5);
  }, [activeCat, sortTagsByUsage, getTagsByCategory, selectedTagIds]);

  return (
    <FormField
      label={language === 'pt' ? 'Tags' : 'Tags'}
      icon={TagIcon}
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
            className="gap-1 text-xs h-8 rounded-xl"
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
      <div className="space-y-3">
        {selectedTagIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/50">
            {categories.flatMap(cat =>
              selectedByCategory[cat].map(tag => (
                <TagBadge
                  key={tag.id}
                  name={tag.name}
                  category={cat}
                  displayName={getTranslatedName(tag)}
                  selected
                  onRemove={() => onToggleTag(tag.id)}
                />
              ))
            )}
          </div>
        )}
        {categories.map((cat, i) => (
          <div key={cat} className={cn(i > 0 && 'pt-3 border-t border-border/40')}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn(
                'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full',
                cat === 'skills' && 'bg-green-500/15 text-green-700 dark:text-green-300',
                cat === 'communities' && 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
                cat === 'physical_resources' && 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
              )}>
                {catLabel[cat]}
              </span>
            </div>
            <SmartTagSelector
              category={cat}
              selectedTagIds={selectedTagIds}
              onToggleTag={onToggleTag}
              onCreateTag={(name) => onCreateTag(name, cat)}
              maxVisibleTags={8}
              excludeTagIds={selectedTagIds}
            />
          </div>
        ))}
      </div>
    </FormField>
  );
}
