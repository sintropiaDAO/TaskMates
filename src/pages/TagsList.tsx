import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Search, Package, Wrench, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { TagInputWithSuggestions } from '@/components/tags/TagInputWithSuggestions';
import { useTags } from '@/hooks/useTags';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Tag, TagCategory } from '@/types';

export default function TagsList() {
  const { tags, getTagsByCategory, createTag, refreshTags, getTranslatedName } = useTags();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [addingCategory, setAddingCategory] = useState<TagCategory | null>(null);
  const [newTagName, setNewTagName] = useState('');

  const skillTags = getTagsByCategory('skills');
  const communityTags = getTagsByCategory('communities');
  const resourceTags = getTagsByCategory('physical_resources');

  const filterTags = (tagList: Tag[]) => {
    if (!searchQuery.trim()) return tagList;
    const q = searchQuery.toLowerCase();
    return tagList.filter(tag =>
      tag.name.toLowerCase().includes(q) ||
      getTranslatedName(tag).toLowerCase().includes(q)
    );
  };

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
          {filtered.map(tag => (
            <TagBadge
              key={tag.id}
              name={tag.name}
              category={category}
              displayName={getTranslatedName(tag)}
              onClick={() => handleTagClick(tag.id)}
            />
          ))}
          {filtered.length === 0 && (
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-display font-bold">
            {language === 'pt' ? 'Lista de Tags' : 'Tags List'}
          </h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={language === 'pt' ? 'Buscar tags...' : 'Search tags...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      {renderSection('skills', skillTags)}
      {renderSection('communities', communityTags)}
      {renderSection('physical_resources', resourceTags)}
    </div>
  );
}
