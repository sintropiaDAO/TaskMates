import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { TagBadge } from '@/components/ui/tag-badge';
import { TagDetailModal } from '@/components/tags/TagDetailModal';
import { Tag } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';

interface CommonTagsSectionProps {
  currentUserTags: { tag: Tag }[];
  profileUserTags: { tag: Tag }[];
}

export function CommonTagsSection({ currentUserTags, profileUserTags }: CommonTagsSectionProps) {
  const { t } = useLanguage();
  const { getTranslatedName } = useTags();
  const [selectedTag, setSelectedTag] = useState<{ id: string; name: string; category: 'skills' | 'communities' } | null>(null);

  const { commonTags, compatibilityPercentage } = useMemo(() => {
    if (!currentUserTags.length || !profileUserTags.length) {
      return { commonTags: [], compatibilityPercentage: 0 };
    }

    const currentTagIds = new Set(currentUserTags.map(ut => ut.tag.id));
    const common = profileUserTags.filter(ut => currentTagIds.has(ut.tag.id));
    
    // Calculate compatibility as percentage of common tags relative to the smaller set
    const minTags = Math.min(currentUserTags.length, profileUserTags.length);
    const percentage = minTags > 0 ? Math.round((common.length / minTags) * 100) : 0;

    return {
      commonTags: common.map(ut => ut.tag),
      compatibilityPercentage: percentage,
    };
  }, [currentUserTags, profileUserTags]);

  if (commonTags.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {t('commonTags')}
          </h3>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-primary">
              {compatibilityPercentage}% {t('compatibility')}
            </div>
            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${compatibilityPercentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {commonTags.map(tag => (
            <TagBadge 
              key={tag.id} 
              name={tag.name} 
              category={tag.category}
              displayName={getTranslatedName(tag)}
              onClick={() => setSelectedTag({ id: tag.id, name: tag.name, category: tag.category })}
            />
          ))}
        </div>
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
