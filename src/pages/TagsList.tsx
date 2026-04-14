import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeft, Search, Package, Wrench, Users, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { TagInputWithSuggestions } from '@/components/tags/TagInputWithSuggestions';
import { useTags } from '@/hooks/useTags';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useHiddenCommunityAccess } from '@/hooks/useHiddenCommunityAccess';
import { Tag, TagCategory } from '@/types';

export default function TagsList() {
  const { tags, userTags, getTagsByCategory, createTag, refreshTags, getTranslatedName } = useTags();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [addingCategory, setAddingCategory] = useState<TagCategory | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const userTagIds = useMemo(() => new Set(userTags.map(ut => ut.tag_id)), [userTags]);
  const { isTagHiddenFromUser } = useHiddenCommunityAccess();

  const skillTags = getTagsByCategory('skills');
  // Filter out hidden community tags that the user doesn't follow
  const communityTags = getTagsByCategory('communities').filter(tag => !isTagHiddenFromUser(tag.id));
  const resourceTags = getTagsByCategory('physical_resources');

  const filterTags = (tagList: Tag[]) => {
    if (!searchQuery.trim()) return tagList;
    const q = searchQuery.toLowerCase();
    return tagList.filter(tag =>
      tag.name.toLowerCase().includes(q) ||
      getTranslatedName(tag).toLowerCase().includes(q)
    );
  };

  // All search results across categories for inline display (exclude hidden tags from non-followers)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return tags.filter(tag =>
      !isTagHiddenFromUser(tag.id) &&
      (tag.name.toLowerCase().includes(q) ||
      getTranslatedName(tag).toLowerCase().includes(q))
    ).slice(0, 10);
  }, [searchQuery, tags, getTranslatedName, isTagHiddenFromUser]);

  const handleCreate = async (category: TagCategory) => {
    if (!newTagName.trim()) return;
    const result = await createTag(newTagName.trim(), category);
    if (result && 'error' in result) {
      toast({ title: t('tagDuplicate'), variant: 'destructive' });
    } else if (result) {
      toast({ title: t('success') });
      setNewTagName('');
      setAddingCategory(null);
      refreshTags();
    } else {
      toast({ title: t('tagsCreateError'), variant: 'destructive' });
    }
  };

  const handleSelectExisting = () => {
    setNewTagName('');
    setAddingCategory(null);
  };

  const handleTagClick = (tagId: string) => {
    navigate(`/tags/${tagId}`);
  };

  const getCategoryLabel = (category: TagCategory) => {
    switch (category) {
      case 'skills': return language === 'pt' ? 'Habilidades e Interesses' : 'Skills & Interests';
      case 'communities': return language === 'pt' ? 'Grupos e Comunidades' : 'Groups & Communities';
      case 'physical_resources': return language === 'pt' ? 'Recursos Físicos' : 'Physical Resources';
    }
  };

  const getCategoryIcon = (category: TagCategory) => {
    switch (category) {
      case 'skills': return <Wrench className="w-5 h-5 text-primary" />;
      case 'communities': return <Users className="w-5 h-5 text-info" />;
      case 'physical_resources': return <Package className="w-5 h-5 text-amber-500" />;
    }
  };

  const renderSection = (category: TagCategory, tagList: Tag[]) => {
    const filtered = filterTags(tagList);
    // Sort: selected first, then unselected
    const sorted = [...filtered].sort((a, b) => {
      const aSelected = userTagIds.has(a.id) ? 0 : 1;
      const bSelected = userTagIds.has(b.id) ? 0 : 1;
      return aSelected - bSelected;
    });

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card p-4 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getCategoryIcon(category)}
            <div>
              <h3 className="font-semibold text-lg">{getCategoryLabel(category)}</h3>
              <p className="text-sm text-muted-foreground">{tagList.length} tags</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddingCategory(category)}>
            <Plus className="w-4 h-4 mr-1" />{t('add')}
          </Button>
        </div>

        {addingCategory === category && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <TagInputWithSuggestions
              value={newTagName}
              onChange={setNewTagName}
              onSubmit={() => handleCreate(category)}
              onCancel={() => setAddingCategory(null)}
              onSelectExisting={handleSelectExisting}
              placeholder={language === 'pt' ? 'Nome da nova tag...' : 'New tag name...'}
              category={category === 'physical_resources' ? 'skills' : category as 'skills' | 'communities'}
              existingTags={tagList}
            />
          </motion.div>
        )}

        <div className="flex flex-wrap gap-2 min-h-[60px]">
          {sorted.map(tag => (
            <TagBadge
              key={tag.id}
              name={tag.name}
              category={category}
              displayName={getTranslatedName(tag)}
              selected={userTagIds.has(tag.id)}
              onClick={() => handleTagClick(tag.id)}
            />
          ))}
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              {searchQuery ? (language === 'pt' ? 'Nenhuma tag encontrada' : 'No tags found') : (language === 'pt' ? 'Nenhuma tag cadastrada' : 'No tags yet')}
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-display font-bold">
            {language === 'pt' ? 'Lista de Tags' : 'Tags List'}
          </h1>
        </div>

        {/* Explanatory text with CTA */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm text-foreground leading-relaxed">
                {language === 'pt'
                  ? 'Aqui você encontra todas as tags cadastradas no aplicativo. Explore novas tags de interesse ou crie novas para melhorar suas recomendações e se conectar com pessoas e projetos relevantes.'
                  : 'Here you\'ll find all tags registered in the app. Explore new tags of interest or create new ones to improve your recommendations and connect with relevant people and projects.'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'pt'
                  ? 'Tags que você já selecionou aparecem em destaque.'
                  : 'Tags you\'ve already selected appear highlighted.'}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={language === 'pt' ? 'Buscar tags...' : 'Search tags...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Inline search results */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border bg-card p-3 space-y-2 shadow-sm"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {language === 'pt'
                  ? `${searchResults.length} resultado${searchResults.length > 1 ? 's' : ''} encontrado${searchResults.length > 1 ? 's' : ''}`
                  : `${searchResults.length} result${searchResults.length > 1 ? 's' : ''} found`}
              </p>
              <div className="flex flex-wrap gap-2">
                {searchResults.map(tag => (
                  <TagBadge
                    key={tag.id}
                    name={tag.name}
                    category={tag.category}
                    displayName={getTranslatedName(tag)}
                    selected={userTagIds.has(tag.id)}
                    onClick={() => handleTagClick(tag.id)}
                    size="md"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {renderSection('skills', skillTags)}
      {renderSection('communities', communityTags)}
      {renderSection('physical_resources', resourceTags)}
    </div>
  );
}
