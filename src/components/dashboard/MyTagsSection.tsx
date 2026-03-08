import { Tags, Users, Lightbulb, Hammer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TagBadge } from '@/components/ui/tag-badge';
import { SmartTagSelector } from '@/components/tags/SmartTagSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { UserTag, TagCategory } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface MyTagsSectionProps {
  userTags: UserTag[];
  getTranslatedName?: (tag: { id: string; name: string; category: string }) => string;
}

export function MyTagsSection({ userTags, getTranslatedName }: MyTagsSectionProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addUserTag, removeUserTag, createTag } = useTags();

  const communityTags = userTags.filter(ut => ut.tag?.category === 'communities');
  const skillTags = userTags.filter(ut => ut.tag?.category === 'skills');
  const resourceTags = userTags.filter(ut => ut.tag?.category === 'physical_resources');

  const handleTagClick = (tagId: string) => {
    navigate(`/tags/${tagId}`);
  };

  const selectedTagIds = userTags.map(ut => ut.tag_id);

  const handleToggleTag = async (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      const success = await removeUserTag(tagId);
      if (success) {
        toast({ title: language === 'pt' ? 'Tag removida' : 'Tag removed' });
      }
    } else {
      const success = await addUserTag(tagId);
      if (success) {
        toast({ title: language === 'pt' ? 'Tag adicionada' : 'Tag added' });
      }
    }
  };

  const handleCreateTag = async (name: string, category: TagCategory) => {
    const result = await createTag(name, category);
    if (result && 'id' in result && !('error' in result)) {
      await addUserTag(result.id);
      toast({ title: language === 'pt' ? 'Tag criada e adicionada' : 'Tag created and added' });
    }
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
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(ut => ut.tag && (
              <TagBadge
                key={ut.id}
                name={ut.tag.name}
                displayName={getTranslatedName?.(ut.tag) || ut.tag.name}
                category={ut.tag.category as any}
                onClick={() => handleTagClick(ut.tag_id)}
              />
            ))}
          </div>
        )}
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">{emptyMessage}</p>
        )}
        <SmartTagSelector
          category={category}
          selectedTagIds={selectedTagIds}
          onToggleTag={handleToggleTag}
          onCreateTag={(name) => handleCreateTag(name, category)}
          maxVisibleTags={8}
          showCreateInput={true}
        />
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
