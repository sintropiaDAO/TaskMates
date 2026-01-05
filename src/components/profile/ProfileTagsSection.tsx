import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tags } from 'lucide-react';
import { TagBadge } from '@/components/ui/tag-badge';
import { TagDetailModal } from '@/components/tags/TagDetailModal';
import { CommonTagsSection } from '@/components/profile/CommonTagsSection';
import { Tag } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';

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

export function ProfileTagsSection({
  userTags,
  currentUserTags,
  isOwnProfile,
  isLoggedIn,
}: ProfileTagsSectionProps) {
  const { t } = useLanguage();
  const { getTranslatedName } = useTags();
  const [selectedTag, setSelectedTag] = useState<{ id: string; name: string; category: 'skills' | 'communities' } | null>(null);

  const skillTags = userTags.filter(ut => ut.tag?.category === 'skills');
  const communityTags = userTags.filter(ut => ut.tag?.category === 'communities');

  if (skillTags.length === 0 && communityTags.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
      >
        <div className="flex items-center gap-2 mb-4">
          <Tags className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('profileSkillsTitle')} & {t('profileCommunitiesTitle')}</h2>
        </div>

        <div className="space-y-4">
          {/* Skills */}
          {skillTags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('profileSkillsTitle')}</h3>
              <div className="flex flex-wrap gap-2">
                {skillTags.map(ut => (
                  <TagBadge 
                    key={ut.id} 
                    name={ut.tag.name} 
                    category="skills"
                    displayName={getTranslatedName(ut.tag)}
                    onClick={() => setSelectedTag({ id: ut.tag.id, name: ut.tag.name, category: 'skills' })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Communities */}
          {communityTags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('profileCommunitiesTitle')}</h3>
              <div className="flex flex-wrap gap-2">
                {communityTags.map(ut => (
                  <TagBadge 
                    key={ut.id} 
                    name={ut.tag.name} 
                    category="communities"
                    displayName={getTranslatedName(ut.tag)}
                    onClick={() => setSelectedTag({ id: ut.tag.id, name: ut.tag.name, category: 'communities' })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Common Tags (only for other profiles) */}
        {isLoggedIn && !isOwnProfile && currentUserTags.length > 0 && userTags.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <CommonTagsSection 
              currentUserTags={currentUserTags} 
              profileUserTags={userTags} 
            />
          </div>
        )}
      </motion.div>

      <TagDetailModal
        tagId={selectedTag?.id || null}
        tagName={selectedTag?.name || ''}
        tagCategory={selectedTag?.category || 'skills'}
        open={!!selectedTag}
        onClose={() => setSelectedTag(null)}
      />
    </>
  );
}
