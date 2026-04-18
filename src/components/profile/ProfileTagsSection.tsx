import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Tags, ChevronDown, ChevronUp } from 'lucide-react';
import { TagBadge } from '@/components/ui/tag-badge';
import { CommonTagsSection } from '@/components/profile/CommonTagsSection';
import { Tag } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useHiddenCommunityTags } from '@/hooks/useHiddenCommunityFilter';
import { Button } from '@/components/ui/button';

interface UserTagWithTag {
  id: string;
  tag_id: string;
  tag: Tag;
}

interface ProfileTagsSectionProps {
  userTags: UserTagWithTag[];
  currentUserTags: UserTagWithTag[];
  isOwnProfile: boolean;
  isLoggedIn: boolean;
}

const TAG_LIMIT = 12;

export function ProfileTagsSection({
  userTags,
  currentUserTags,
  isOwnProfile,
  isLoggedIn,
}: ProfileTagsSectionProps) {
  const { t, language } = useLanguage();
  const { getTranslatedName } = useTags();
  const { hiddenTagIds, loading } = useHiddenCommunityTags();
  const navigate = useNavigate();
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showAllCommunities, setShowAllCommunities] = useState(false);

  const visibleUserTags = userTags.filter(
    ut => ut.tag?.category !== 'communities' || !hiddenTagIds.has(ut.tag_id)
  );
  const visibleCurrentUserTags = currentUserTags.filter(
    ut => ut.tag?.category !== 'communities' || !hiddenTagIds.has(ut.tag_id)
  );
  const skillTags = visibleUserTags.filter(ut => ut.tag?.category === 'skills');
  const communityTags = visibleUserTags.filter(ut => ut.tag?.category === 'communities');

  if (loading) {
    return null;
  }

  if (skillTags.length === 0 && communityTags.length === 0) {
    return null;
  }

  const handleTagClick = (tagId: string) => {
    navigate(`/tags/${tagId}`);
  };

  const visibleSkills = showAllSkills ? skillTags : skillTags.slice(0, TAG_LIMIT);
  const visibleCommunities = showAllCommunities ? communityTags : communityTags.slice(0, TAG_LIMIT);
  const seeMoreLabel = language === 'pt' ? 'Ver mais' : 'See more';
  const seeLessLabel = language === 'pt' ? 'Ver menos' : 'See less';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
    >
      <div className="flex items-center gap-2 mb-4">
        <Tags className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">{t('profileSkillsAndCommunities')}</h2>
      </div>

      <div className="space-y-4">
        {skillTags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('profileSkillsTitle')}</h3>
            <div className="flex flex-wrap gap-2">
              {visibleSkills.map(ut => (
                <TagBadge 
                  key={ut.id} 
                  name={ut.tag.name} 
                  category="skills"
                  displayName={getTranslatedName(ut.tag)}
                  onClick={() => handleTagClick(ut.tag.id)}
                />
              ))}
            </div>
            {skillTags.length > TAG_LIMIT && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllSkills(prev => !prev)}
              >
                {showAllSkills ? seeLessLabel : `${seeMoreLabel} (${skillTags.length - TAG_LIMIT})`}
                {showAllSkills ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
              </Button>
            )}
          </div>
        )}

        {communityTags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('profileCommunitiesTitle')}</h3>
            <div className="flex flex-wrap gap-2">
              {visibleCommunities.map(ut => (
                <TagBadge 
                  key={ut.id} 
                  name={ut.tag.name} 
                  category="communities"
                  displayName={getTranslatedName(ut.tag)}
                  onClick={() => handleTagClick(ut.tag.id)}
                />
              ))}
            </div>
            {communityTags.length > TAG_LIMIT && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllCommunities(prev => !prev)}
              >
                {showAllCommunities ? seeLessLabel : `${seeMoreLabel} (${communityTags.length - TAG_LIMIT})`}
                {showAllCommunities ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoggedIn && !isOwnProfile && visibleCurrentUserTags.length > 0 && visibleUserTags.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border/50">
          <CommonTagsSection 
            currentUserTags={visibleCurrentUserTags} 
            profileUserTags={visibleUserTags} 
          />
        </div>
      )}
    </motion.div>
  );
}
