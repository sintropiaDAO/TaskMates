import { Tags, Users, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TagBadge } from '@/components/ui/tag-badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserTag } from '@/types';
import { useNavigate } from 'react-router-dom';

interface MyTagsSectionProps {
  userTags: UserTag[];
  getTranslatedName?: (tag: { id: string; name: string; category: string }) => string;
}

export function MyTagsSection({ userTags, getTranslatedName }: MyTagsSectionProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const communityTags = userTags.filter(ut => ut.tag?.category === 'communities');
  const skillTags = userTags.filter(ut => ut.tag?.category === 'skills');

  const handleTagClick = (tagId: string) => {
    navigate(`/tags/${tagId}`);
  };

  return (
    <div className="space-y-4">
      {/* Comunidades */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-info" />
            {language === 'pt' ? 'Comunidades' : 'Communities'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {language === 'pt'
              ? 'Tags de comunidade que você participa'
              : 'Community tags you are part of'}
          </p>
        </CardHeader>
        <CardContent>
          {communityTags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {language === 'pt'
                ? 'Nenhuma comunidade selecionada ainda.'
                : 'No communities selected yet.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {communityTags.map(ut => ut.tag && (
                <TagBadge
                  key={ut.id}
                  name={ut.tag.name}
                  displayName={getTranslatedName?.(ut.tag) || ut.tag.name}
                  category="communities"
                  onClick={() => handleTagClick(ut.tag_id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Habilidades e Tópicos de Interesse */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-primary" />
            {language === 'pt' ? 'Habilidades e Tópicos de Interesse' : 'Skills & Topics of Interest'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {language === 'pt'
              ? 'Tags de habilidades que você selecionou'
              : 'Skill tags you have selected'}
          </p>
        </CardHeader>
        <CardContent>
          {skillTags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {language === 'pt'
                ? 'Nenhuma habilidade selecionada ainda.'
                : 'No skills selected yet.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skillTags.map(ut => ut.tag && (
                <TagBadge
                  key={ut.id}
                  name={ut.tag.name}
                  displayName={getTranslatedName?.(ut.tag) || ut.tag.name}
                  category="skills"
                  onClick={() => handleTagClick(ut.tag_id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
