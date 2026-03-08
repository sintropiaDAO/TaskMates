import { useState, useMemo } from 'react';
import { Users, Lightbulb, Hammer, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TagBadge } from '@/components/ui/tag-badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useTagUsage } from '@/hooks/useTagUsage';
import { UserTag, TagCategory } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { containsIgnoreAccents, calculateSimilarityIgnoreAccents, equalsIgnoreAccents } from '@/lib/stringUtils';

interface MyTagsSectionProps {
  userTags: UserTag[];
  getTranslatedName?: (tag: { id: string; name: string; category: string }) => string;
}

export function MyTagsSection({ userTags, getTranslatedName: externalGetTranslatedName }: MyTagsSectionProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addUserTag, removeUserTag, createTag, getTagsByCategory, getTranslatedName: internalGetTranslatedName } = useTags();
  const { getMostPopularTags } = useTagUsage();

  const getName = externalGetTranslatedName || internalGetTranslatedName;

  const communityTags = userTags.filter(ut => ut.tag?.category === 'communities');
  const skillTags = userTags.filter(ut => ut.tag?.category === 'skills');
  const resourceTags = userTags.filter(ut => ut.tag?.category === 'physical_resources');

  const selectedTagIds = userTags.map(ut => ut.tag_id);

  const handleTagClick = (tagId: string) => {
    navigate(`/tags/${tagId}`);
  };

  const handleRemoveTag = async (tagId: string) => {
    const success = await removeUserTag(tagId);
    if (success) toast({ title: language === 'pt' ? 'Tag removida' : 'Tag removed' });
  };

  const handleAddTag = async (tagId: string) => {
    const success = await addUserTag(tagId);
    if (success) toast({ title: language === 'pt' ? 'Tag adicionada' : 'Tag added' });
  };

  const handleCreateAndAdd = async (name: string, category: TagCategory) => {
    const result = await createTag(name, category);
    if (result && 'id' in result && !('error' in result)) {
      await addUserTag(result.id);
      toast({ title: language === 'pt' ? 'Tag criada e adicionada' : 'Tag created and added' });
    }
  };

  const TagInputField = ({ category }: { category: TagCategory }) => {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const allCategoryTags = useMemo(() => getTagsByCategory(category), [category]);

    const suggestions = useMemo(() => {
      if (!inputValue.trim() || inputValue.length < 2) return [];
      return allCategoryTags
        .filter(tag => {
          if (selectedTagIds.includes(tag.id)) return false;
          const tagName = tag.name;
          const translatedName = getName(tag);
          return containsIgnoreAccents(tagName, inputValue) ||
                 containsIgnoreAccents(translatedName, inputValue) ||
                 calculateSimilarityIgnoreAccents(tagName, inputValue) > 0.5 ||
                 calculateSimilarityIgnoreAccents(translatedName, inputValue) > 0.5;
        })
        .slice(0, 6);
    }, [inputValue, allCategoryTags]);

    const tagAlreadyExists = useMemo(() => {
      if (!inputValue.trim()) return false;
      return allCategoryTags.some(tag => equalsIgnoreAccents(tag.name, inputValue));
    }, [inputValue, allCategoryTags]);

    const handleCreate = () => {
      if (!inputValue.trim() || tagAlreadyExists) return;
      handleCreateAndAdd(inputValue.trim(), category);
      setInputValue('');
      setShowSuggestions(false);
    };

    const handleSelect = (tagId: string) => {
      handleAddTag(tagId);
      setInputValue('');
      setShowSuggestions(false);
    };

    return (
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
              placeholder={
                category === 'skills'
                  ? (language === 'pt' ? 'Buscar ou criar habilidade...' : 'Search or create skill...')
                  : category === 'communities'
                  ? (language === 'pt' ? 'Buscar ou criar comunidade...' : 'Search or create community...')
                  : (language === 'pt' ? 'Buscar ou criar recurso...' : 'Search or create resource...')
              }
              className={`text-sm ${tagAlreadyExists ? 'border-amber-500' : ''}`}
            />
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && inputValue.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="p-2 text-xs text-muted-foreground border-b border-border">
                    {language === 'pt' ? 'Tags encontradas' : 'Tags found'}
                  </div>
                  <div className="p-2 space-y-1 max-h-40 overflow-y-auto">
                    {suggestions.map(tag => (
                      <button
                        key={tag.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(tag.id)}
                        className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                      >
                        <TagBadge name={tag.name} category={category} size="sm" displayName={getName(tag)} />
                        {equalsIgnoreAccents(tag.name, inputValue) && (
                          <span className="text-xs text-amber-500 ml-auto">
                            {language === 'pt' ? 'Exata' : 'Exact'}
                          </span>
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
            onClick={handleCreate}
            disabled={!inputValue.trim() || tagAlreadyExists}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {tagAlreadyExists && (
          <p className="text-xs text-amber-500 mt-1">
            {language === 'pt' ? 'Tag já existe — selecione nas sugestões' : 'Tag already exists — select from suggestions'}
          </p>
        )}
      </div>
    );
  };

  const renderTagCategory = (
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    tags: UserTag[],
    category: TagCategory,
    emptyMessage: string
  ) => (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <TagInputField category={category} />
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map(ut => ut.tag && (
              <TagBadge
                key={ut.id}
                name={ut.tag.name}
                displayName={getName(ut.tag) || ut.tag.name}
                category={ut.tag.category as any}
                selected
                onClick={() => handleTagClick(ut.tag_id)}
                onRemove={() => handleRemoveTag(ut.tag_id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {renderTagCategory(
        <Users className="w-5 h-5 text-info" />,
        language === 'pt' ? 'Comunidades' : 'Communities',
        language === 'pt' ? 'Tags de comunidade que você participa' : 'Community tags you are part of',
        communityTags,
        'communities',
        language === 'pt' ? 'Nenhuma comunidade selecionada ainda.' : 'No communities selected yet.'
      )}

      {renderTagCategory(
        <Lightbulb className="w-5 h-5 text-primary" />,
        language === 'pt' ? 'Habilidades e Tópicos de Interesse' : 'Skills & Topics of Interest',
        language === 'pt' ? 'Tags de habilidades que você selecionou' : 'Skill tags you have selected',
        skillTags,
        'skills',
        language === 'pt' ? 'Nenhuma habilidade selecionada ainda.' : 'No skills selected yet.'
      )}

      {renderTagCategory(
        <Hammer className="w-5 h-5 text-amber-500" />,
        language === 'pt' ? 'Recursos Físicos' : 'Physical Resources',
        language === 'pt' ? 'Recursos que você tem ou precisa' : 'Resources you have or need',
        resourceTags,
        'physical_resources',
        language === 'pt' ? 'Nenhum recurso selecionado ainda.' : 'No resources selected yet.'
      )}
    </div>
  );
}
