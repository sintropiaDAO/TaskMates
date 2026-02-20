import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBadges } from '@/hooks/useBadges';
import { BadgeSVG } from './BadgeSVG';
import { useLanguage } from '@/contexts/LanguageContext';

interface BadgeBannerProps {
  targetUserId: string;
}

export function BadgeBanner({ targetUserId }: BadgeBannerProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { topBadges, loading } = useBadges(targetUserId);

  if (loading || topBadges.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-card rounded-2xl p-5 border border-border/50 shadow-soft"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-base">{t('badgesTitle')}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {topBadges.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => navigate(`/badges/${targetUserId}`)}
        >
          {t('badgesSeeAll')}
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {topBadges.map((badge) => (
          <button
            key={badge.id}
            onClick={() => navigate(`/badges/${targetUserId}?category=${badge.category}`)}
            className="flex-shrink-0 hover:scale-105 transition-transform"
            title={badge.entity_name || badge.category}
          >
            <BadgeSVG
              category={badge.category}
              level={badge.level}
              entityName={badge.entity_name}
              size={72}
            />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
